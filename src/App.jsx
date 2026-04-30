import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react';
import PromptLayoutGenerator from './components/PromptLayoutGenerator.jsx';
import Layout2D from './components/Layout2D.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { cloneFallbackRooms } from './utils/layoutFallback.js';
import { layoutBounds } from './utils/roomExtraction.js';

const Layout3D = lazy(() => import('./components/Layout3D.jsx'));

export default function App() {
  const [rooms, setRooms] = useState(cloneFallbackRooms);
  const [activeLayout, setActiveLayout] = useState(false);
  const [threeActive, setThreeActive] = useState(false);
  const [lastCommand, setLastCommand] = useState('');
  const [styleState, setStyleState] = useState({
    wallColor: '#e2e8f0',
    modern: false,
    layered: false,
    furniture: true
  });
  const pipelineRef = useRef(null);

  const useSample = () => {
    setRooms(cloneFallbackRooms());
    setActiveLayout(true);
    setThreeActive(true);
    requestAnimationFrame(() => pipelineRef.current?.scrollIntoView({ behavior: 'smooth' }));
  };

  const handleRoomsChange = useCallback((nextRooms) => {
    setRooms(nextRooms);
    setActiveLayout(true);
    setThreeActive(true);
  }, []);

  const handleVoiceCommand = (rawCommand) => {
    const command = rawCommand.toLowerCase();
    setLastCommand(command);

    if (command.includes('walls blue')) {
      setStyleState((current) => ({ ...current, wallColor: '#38bdf8' }));
    } else if (command.includes('modern')) {
      setStyleState((current) => ({ ...current, modern: true, wallColor: '#f8fafc' }));
    } else if (command.includes('wall layers')) {
      setStyleState((current) => ({ ...current, layered: true }));
    } else if (command.includes('furniture')) {
      setStyleState((current) => ({ ...current, furniture: true }));
    } else if (command.includes('reset')) {
      setStyleState({ wallColor: '#e2e8f0', modern: false, layered: false, furniture: true });
      setRooms(cloneFallbackRooms());
      setThreeActive(true);
    }
  };

  const featureBadges = useMemo(() => ['Local Ollama', 'Prompt Planner', '2D Plan', '3D Model'], []);
  const previewBounds = layoutBounds(rooms);
  const totalArea = rooms.reduce((sum, room) => sum + (room.areaSqFt || Math.round((room.width * room.height) / 85)), 0);

  return (
    <main className="app-frame">
      <nav className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">AF</span>
          <div>
            <strong>AR Floor Plan Analyzer</strong>
            <small>Prompt to architectural model</small>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="ghost-button" type="button" onClick={useSample}>
            Sample
          </button>
          <button className="primary-button" type="button" onClick={() => pipelineRef.current?.scrollIntoView({ behavior: 'smooth' })}>
            Start Designing
          </button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero__content">
          <div className="badge-row">
            {featureBadges.map((badge) => (
              <span className="badge" key={badge}>
                {badge}
              </span>
            ))}
          </div>
          <h1>Design a home layout from one sentence.</h1>
          <p>Describe your apartment. The app extracts room intent with Ollama, builds a clean 2D plan, and turns it into a furnished Three.js model.</p>
          <div className="hero-actions">
            <button
              className="primary-button"
              type="button"
              onClick={() => pipelineRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              Describe Home
            </button>
            <button className="secondary-button" type="button" onClick={useSample}>
              Load Sample
            </button>
          </div>
          <div className="stat-strip">
            <span><strong>{rooms.length}</strong> spaces</span>
            <span><strong>{totalArea}</strong> sq ft</span>
            <span><strong>{threeActive ? 'Live' : 'Ready'}</strong> 3D model</span>
          </div>
        </div>
        <div className="hero__preview hero__preview--plan">
          <div className="preview-header">
            <span>Current Plan</span>
            <strong>{rooms.length} rooms</strong>
          </div>
          <svg viewBox={`0 0 ${previewBounds.width} ${previewBounds.height}`} role="img" aria-label="Generated layout preview">
            <rect width={previewBounds.width} height={previewBounds.height} fill="#0b1220" />
            {rooms.map((room) => (
              <g key={room.id}>
                <rect x={room.x} y={room.y} width={room.width} height={room.height} rx="4" fill={`${room.color}38`} stroke={room.color} strokeWidth="4" />
                <text x={room.x + 10} y={room.y + 26} className="model-label">
                  {room.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>

      <div className="content-shell" ref={pipelineRef}>
        <section className="workspace-grid">
          <div className="workspace-column">
            <PromptLayoutGenerator onRoomsChange={handleRoomsChange} />
            <Layout2D rooms={rooms} active={activeLayout} />
          </div>
          <aside className="control-dock">
            <section className="panel compact-panel">
              <p className="eyebrow">Model Styling</p>
              <h2>Quick Finish</h2>
              <div className="style-grid">
                <button className="command-button" type="button" onClick={() => handleVoiceCommand('make it modern')}>
                  Modern
                </button>
                <button className="command-button" type="button" onClick={() => handleVoiceCommand('make walls blue')}>
                  Blue Walls
                </button>
                <button className="command-button" type="button" onClick={() => handleVoiceCommand('show wall layers')}>
                  Wall Layers
                </button>
                <button className="command-button" type="button" onClick={() => handleVoiceCommand('add furniture')}>
                  Furniture
                </button>
              </div>
              <div className="material-card">
                <span style={{ background: styleState.wallColor }} />
                <div>
                  <strong>{styleState.modern ? 'Modern finish' : 'Architectural finish'}</strong>
                  <small>{styleState.layered ? 'Layered wall visualization enabled' : 'Clean wall shell'}</small>
                </div>
              </div>
            </section>
            <VoiceControls onCommand={handleVoiceCommand} lastCommand={lastCommand} />
          </aside>
        </section>

        <section className="panel model-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Three.js architectural model</p>
              <h2>Interactive 3D Home</h2>
            </div>
            <button className="secondary-button" type="button" onClick={() => setThreeActive(true)} disabled={threeActive}>
              {threeActive ? 'Model active' : 'Start model'}
            </button>
          </div>
          {threeActive ? (
            <Suspense fallback={<div className="viewer-placeholder"><span>Loading 3D renderer...</span></div>}>
              <Layout3D rooms={rooms} styleState={styleState} />
            </Suspense>
          ) : (
            <div className="viewer-placeholder">
              <span>3D preview is paused for a faster page. Start it when you are ready to orbit the model.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
