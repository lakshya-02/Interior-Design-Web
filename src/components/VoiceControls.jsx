import { useMemo, useState } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function VoiceControls({ onCommand, lastCommand }) {
  const [listening, setListening] = useState(false);
  const supported = Boolean(SpeechRecognition);

  const recognition = useMemo(() => {
    if (!supported) return null;
    const instance = new SpeechRecognition();
    instance.continuous = false;
    instance.interimResults = false;
    instance.lang = 'en-US';
    return instance;
  }, [supported]);

  const startListening = () => {
    if (!recognition) return;
    setListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      onCommand(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  };

  const stopListening = () => {
    if (!recognition) return;
    recognition.stop();
    setListening(false);
  };

  return (
    <section className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span className="badge" style={{ marginBottom: '0.75rem' }}>Web Speech API</span>
          <h2 style={{ marginBottom: 0 }}>Voice Agent</h2>
        </div>
        
        {listening ? (
          <div className="waveform">
            <div className="waveform-bar"></div>
            <div className="waveform-bar"></div>
            <div className="waveform-bar"></div>
            <div className="waveform-bar"></div>
          </div>
        ) : (
          <div className="step-dot" style={{ background: 'var(--text-muted)' }}></div>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
        <button 
          className="btn btn-primary" 
          style={{ flex: 1 }} 
          onClick={startListening} 
          disabled={!supported || listening}
        >
          {listening ? 'Listening...' : 'Start Voice'}
        </button>
        <button 
          className="btn btn-outline" 
          onClick={stopListening} 
          disabled={!listening}
        >
          Stop
        </button>
      </div>

      <div className="control-group">
        <span className="control-label">Status Log</span>
        <div style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.95rem' }}>
          {supported ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Latest recognized command:</span>
              {lastCommand ? (
                <strong style={{ color: 'var(--color-secondary)' }}>"{lastCommand}"</strong>
              ) : (
                <em style={{ color: 'var(--text-muted)', opacity: 0.7 }}>Awaiting command...</em>
              )}
            </div>
          ) : (
            <span style={{ color: '#ef4444' }}>Speech recognition is not supported in this browser.</span>
          )}
        </div>
      </div>
    </section>
  );
}
