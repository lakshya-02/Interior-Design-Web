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

  const commands = ['make walls blue', 'make it modern', 'show wall layers', 'add furniture', 'reset layout'];

  return (
    <section className="panel voice-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Web Speech API</p>
          <h2>Voice Controls</h2>
        </div>
        <button className="primary-button" type="button" onClick={startListening} disabled={!supported || listening}>
          {listening ? 'Listening...' : 'Start voice'}
        </button>
      </div>
      <div className="command-grid">
        {commands.map((command) => (
          <button key={command} className="command-button" type="button" onClick={() => onCommand(command)}>
            {command}
          </button>
        ))}
      </div>
      <p className="voice-status">
        {supported ? `Last command: ${lastCommand || 'none yet'}` : 'Speech recognition is not supported in this browser.'}
      </p>
    </section>
  );
}
