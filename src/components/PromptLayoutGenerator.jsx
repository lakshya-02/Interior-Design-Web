import { useState } from 'react';
import { generateLayoutFromPrompt } from '../utils/promptLayout.js';
import { cloneFallbackRooms } from '../utils/layoutFallback.js';
import { transcribeWithWhisper } from '../utils/voiceWhisper.js';

const examples = [
  'Compact 2BHK',
  'Linear 1BHK',
  'Luxury villa',
  'Studio apartment'
];

const fullExamples = {
  'Compact 2BHK': 'A compact 2BHK linear apartment with living room, kitchen near entrance, two bedrooms, and one bathroom.',
  'Linear 1BHK': 'A linear 1BHK apartment with entrance foyer, kitchen, bathroom, living area, and master bedroom at the end.',
  'Luxury villa': 'A luxury villa layout with grand entrance, large living room, dining area, open kitchen, three bedrooms with attached baths, and a study.',
  'Studio apartment': 'Compact studio home with entrance leading to kitchen, one bathroom near the kitchen, and a large open living sleeping area.'
};

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function PromptLayoutGenerator({ onRoomsChange }) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, ready, error
  const [activeStep, setActiveStep] = useState(0);
  const [voiceState, setVoiceState] = useState('idle');
  const [voiceMessage, setVoiceMessage] = useState('Record a spoken layout prompt with Whisper.');
  const [recorder, setRecorder] = useState(null);

  const runGeneration = async () => {
    if (!prompt.trim()) return;
    setStatus('loading');
    setActiveStep(1);

    try {
      setTimeout(() => setActiveStep(2), 800);
      setTimeout(() => setActiveStep(3), 1600);

      const result = await generateLayoutFromPrompt(prompt);
      
      setActiveStep(4);
      
      if (!result.rooms.length) throw new Error('No rooms were generated.');
      onRoomsChange(result.rooms);
      
      setTimeout(() => {
        setStatus('ready');
        setActiveStep(5);
      }, 600);

    } catch (error) {
      console.error(error);
      setStatus('error');
      onRoomsChange(cloneFallbackRooms());
    }
  };

  const handleExample = (key) => {
    setPrompt(fullExamples[key]);
  };

  const startVoicePrompt = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const nextRecorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined });
      const chunks = [];
      const liveSpeech = {
        recognition: null,
        transcript: '',
        supported: Boolean(SpeechRecognition)
      };

      if (liveSpeech.supported) {
        liveSpeech.recognition = new SpeechRecognition();
        liveSpeech.recognition.continuous = true;
        liveSpeech.recognition.interimResults = true;
        liveSpeech.recognition.lang = 'en-US';
        liveSpeech.recognition.onresult = (event) => {
          let transcript = '';
          for (let index = 0; index < event.results.length; index += 1) {
            transcript += `${event.results[index][0].transcript} `;
          }
          liveSpeech.transcript = transcript.trim();
        };
        liveSpeech.recognition.onerror = () => {};
        try {
          liveSpeech.recognition.start();
        } catch {
          liveSpeech.supported = false;
        }
      }

      nextRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      nextRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (liveSpeech.recognition) {
          try {
            liveSpeech.recognition.stop();
          } catch {}
        }
        setRecorder(null);
        setVoiceState('transcribing');
        setVoiceMessage('Loading Whisper and transcribing your layout prompt...');

        try {
          const blob = new Blob(chunks, { type: nextRecorder.mimeType || 'audio/webm' });
          const transcript = await transcribeWithWhisper(blob, (progress) => {
            if (progress.status === 'progress' && Number.isFinite(progress.progress)) {
              setVoiceMessage(`Loading Whisper model ${Math.round(progress.progress)}%...`);
            }
          });

          if (!transcript) throw new Error('Whisper returned an empty transcript.');
          setPrompt((current) => (current.trim() ? `${current.trim()} ${transcript}` : transcript));
          setVoiceState('ready');
          setVoiceMessage(`Whisper transcript added: "${transcript}"`);
        } catch (error) {
          const fallbackTranscript = liveSpeech.transcript.trim();
          if (fallbackTranscript) {
            setPrompt((current) => (current.trim() ? `${current.trim()} ${fallbackTranscript}` : fallbackTranscript));
            setVoiceState('ready');
            setVoiceMessage(`Whisper failed, but the same recording was captured by browser speech: "${fallbackTranscript}"`);
          } else {
            setVoiceState('error');
            setVoiceMessage(`Whisper transcription failed: ${error.message}`);
          }
        }
      };

      nextRecorder.start();
      setRecorder(nextRecorder);
      setVoiceState('recording');
      setVoiceMessage(liveSpeech.supported ? 'Listening once... Whisper is recording, with live fallback captured in parallel.' : 'Listening... describe the home layout, then stop recording.');
    } catch (error) {
      setVoiceState('error');
      setVoiceMessage(`Microphone unavailable: ${error.message}`);
    }
  };

  const stopVoicePrompt = () => {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  return (
    <section className="glass-card fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <span className="badge badge-primary" style={{ marginBottom: '0.75rem' }}>AI Layout Engine</span>
          <h2 style={{ marginBottom: 0 }}>Prompt Planner</h2>
        </div>
      </div>

      <div className="prompt-area">
        <div className={`voice-prompt-card voice-prompt-card--${voiceState}`}>
          <div>
            <span className="voice-dot" />
            <strong>Whisper Voice Prompt</strong>
            <p>{voiceMessage}</p>
          </div>
          <button
            className={`btn ${voiceState === 'recording' ? 'btn-danger' : 'btn-secondary'}`}
            type="button"
            onClick={voiceState === 'recording' ? stopVoicePrompt : startVoicePrompt}
            disabled={voiceState === 'transcribing'}
          >
            {voiceState === 'recording' ? 'Stop Recording' : voiceState === 'transcribing' ? 'Transcribing...' : 'Record Prompt'}
          </button>
        </div>

        <textarea
          className="prompt-input"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Example: A compact 2BHK linear apartment with living room, kitchen near entrance, two bedrooms, and one bathroom."
        />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div className="prompt-suggestions">
            {examples.map((example) => (
              <button 
                key={example} 
                className="btn-pill" 
                onClick={() => handleExample(example)}
              >
                {example}
              </button>
            ))}
          </div>
          <button 
            className="btn btn-primary" 
            onClick={runGeneration} 
            disabled={status === 'loading' || !prompt.trim()}
          >
            {status === 'loading' ? 'Generating...' : 'Generate Layout'}
          </button>
        </div>

        {status === 'loading' && (
          <div className="status-indicator fade-in">
            <div className="loading-steps" style={{ width: '100%' }}>
              <div className={`loading-step ${activeStep === 1 ? 'active' : activeStep > 1 ? 'completed' : ''}`}>
                <div className="step-dot"></div>
                <strong>Parsing natural language prompt</strong>
              </div>
              <div className={`loading-step ${activeStep === 2 ? 'active' : activeStep > 2 ? 'completed' : ''}`}>
                <div className="step-dot"></div>
                <strong>Extracting architectural rooms via Ollama</strong>
              </div>
              <div className={`loading-step ${activeStep === 3 ? 'active' : activeStep > 3 ? 'completed' : ''}`}>
                <div className="step-dot"></div>
                <strong>Applying rule-based constraint solver</strong>
              </div>
              <div className={`loading-step ${activeStep === 4 ? 'active' : activeStep > 4 ? 'completed' : ''}`}>
                <div className="step-dot"></div>
                <strong>Extruding 3D spatial data</strong>
              </div>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <div className="status-indicator fade-in" style={{ borderColor: 'var(--color-primary)', background: 'rgba(0, 212, 166, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <strong style={{ color: 'var(--color-primary)' }}>Layout successfully generated and synced</strong>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="status-indicator fade-in" style={{ borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <strong style={{ color: '#ef4444' }}>Generation failed. Loaded fallback architectural plan.</strong>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
