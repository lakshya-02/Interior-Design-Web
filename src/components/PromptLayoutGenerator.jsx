import { useState } from 'react';
import { generateLayoutFromPrompt } from '../utils/promptLayout.js';
import { cloneFallbackRooms } from '../utils/layoutFallback.js';

const examples = [
  'A 2 BHK apartment with a 3 by 3 living room, two bathrooms along the living room, kitchen near the entrance, and bedrooms on the right side.',
  'Compact studio home with entrance leading to kitchen, one bathroom near the kitchen, and a large open living sleeping area.',
  'Modern 3 bedroom flat with balcony connected to living room, kitchen beside dining, master bedroom with attached bath, and one study room.'
];

export default function PromptLayoutGenerator({ onRoomsChange }) {
  const [prompt, setPrompt] = useState(examples[0]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('Describe the apartment. Ollama extracts requirements, then the layout engine places non-overlapping rooms.');
  const [notes, setNotes] = useState('');

  const runGeneration = async () => {
    setStatus('loading');
    setMessage('Asking local Ollama to extract room and adjacency requirements...');
    setNotes('');

    try {
      const result = await generateLayoutFromPrompt(prompt);
      if (!result.rooms.length) throw new Error('No rooms were generated.');
      onRoomsChange(result.rooms);
      setStatus('ready');
      setMessage(`Generated ${result.rooms.length} architectural rooms from your prompt.`);
      setNotes(result.notes);
    } catch (error) {
      setStatus('error');
      setMessage(error.message);
      setNotes('Fallback layout is shown so the 2D and 3D views remain usable.');
      onRoomsChange(cloneFallbackRooms());
    }
  };

  return (
    <section className="panel prompt-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ollama prompt planner</p>
          <h2>Describe Your Home</h2>
        </div>
        <button className="primary-button" type="button" onClick={runGeneration} disabled={status === 'loading'}>
          {status === 'loading' ? 'Generating...' : 'Generate layout'}
        </button>
      </div>

      <div className="prompt-grid">
        <div className="prompt-input-card">
          <label htmlFor="home-prompt">Home layout prompt</label>
          <textarea
            id="home-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={7}
            placeholder="Example: 2 BHK apartment, kitchen near entrance, living room in center, two bathrooms along living room..."
          />
          <div className="example-row">
            {examples.map((example, index) => (
              <button className="command-button" type="button" key={example} onClick={() => setPrompt(example)}>
                Example {index + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="analyzer-copy">
          <div className={`status-pill status-pill--${status}`}>{status}</div>
          <p>{message}</p>
          {notes && <p>{notes}</p>}
          <p>
            The layout engine places actual architectural spaces only. Furniture is added later by the Three.js view, so beds, tables,
            toilets, and sofas are not counted as rooms or used for placement.
          </p>
        </div>
      </div>
    </section>
  );
}
