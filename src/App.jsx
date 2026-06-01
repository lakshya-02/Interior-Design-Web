import { Suspense, lazy, useCallback, useMemo, useRef, useState } from 'react';
import PromptLayoutGenerator from './components/PromptLayoutGenerator.jsx';
import Layout2D from './components/Layout2D.jsx';
import VoiceControls from './components/VoiceControls.jsx';
import { cloneFallbackRooms } from './utils/layoutFallback.js';
import { layoutBounds } from './utils/roomExtraction.js';

const Layout3D = lazy(() => import('./components/Layout3D.jsx'));

export default function App() {
  const [rooms, setRooms] = useState(cloneFallbackRooms());
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

  const featureBadges = useMemo(() => ['Local Ollama', 'Whisper Voice', 'Constraint Layout', 'Three.js'], []);
  const previewBounds = layoutBounds(rooms);
  const totalArea = rooms.reduce((sum, room) => sum + (room.areaSqFt || Math.round((room.width * room.height) / 85)), 0);

  return (
    <div className="app-container">
      <header className="sticky-header">
        <div className="max-w-container header-content">
          <div className="logo-lockup">
            <div className="logo-badge">AF</div>
            <div className="app-titles">
              <strong>AI Architectural Layout Studio</strong>
              <small>Prompt to 2D + 3D floor plan</small>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn btn-ghost" onClick={useSample}>Load Sample</button>
            <button className="btn btn-primary" onClick={() => pipelineRef.current?.scrollIntoView({ behavior: 'smooth' })}>Start Designing</button>
          </div>
        </div>
      </header>

      <main className="max-w-container">
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badges">
              {featureBadges.map((badge) => (
                <span className="badge badge-primary" key={badge}>{badge}</span>
              ))}
            </div>
            
            <h1>Generate architectural floor plans from one prompt.</h1>
            <p className="subtitle">
              Speak or type a home layout. The app extracts intent with local AI, solves room placement, and renders a clean synced 2D + 3D model.
            </p>

            <div className="hero-actions-row">
              <button className="btn btn-primary" onClick={() => pipelineRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                Generate Layout
              </button>
              <button className="btn btn-secondary" onClick={useSample}>
                Load Sample
              </button>
            </div>

            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-value">{rooms.length}</span>
                <span className="stat-label">Rooms</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{totalArea}</span>
                <span className="stat-label">Sq Ft</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">Active</span>
                <span className="stat-label">Planner</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{threeActive ? 'Live' : 'Ready'}</span>
                <span className="stat-label">3D Engine</span>
              </div>
            </div>
          </div>

          <div className="hero-visual blueprint-bg">
            <svg viewBox={`0 0 ${previewBounds.width} ${previewBounds.height}`} role="img" aria-label="Generated layout preview" style={{width: '100%', height: '100%', display: 'block'}} preserveAspectRatio="xMidYMid meet">
              {rooms.map((room) => (
                <g key={room.id}>
                  <rect x={room.x} y={room.y} width={room.width} height={room.height} rx="4" fill={`${room.color}38`} stroke={room.color} strokeWidth="2" />
                </g>
              ))}
            </svg>
            <div className="hero-visual-overlay">
              <span className="badge badge-accent">Rooms detected</span>
              <span className="badge badge-accent">No overlap</span>
              <span className="badge badge-accent">3D synced</span>
            </div>
          </div>
        </section>

        <div ref={pipelineRef} style={{ scrollMarginTop: '100px' }}>
          <div className="main-grid">
            <div className="main-content">
              <PromptLayoutGenerator onRoomsChange={handleRoomsChange} />
              
              <Layout2D rooms={rooms} active={activeLayout} />

              <section className="glass-card fade-in" style={{ animationDelay: '0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <div>
                    <span className="badge" style={{ marginBottom: '0.5rem' }}>Three.js Render</span>
                    <h2>Interactive 3D Architectural Model</h2>
                  </div>
                  {!threeActive && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setThreeActive(true)}>
                      Launch Interactive 3D
                    </button>
                  )}
                </div>

                {threeActive ? (
                  <div className="model-container fade-in">
                    <Suspense fallback={<div className="empty-3d-state">Loading 3D renderer...</div>}>
                      <Layout3D rooms={rooms} styleState={styleState} />
                    </Suspense>
                  </div>
                ) : (
                  <div className="model-container">
                    <div className="empty-3d-state">
                      <div className="empty-icon">
                        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line><line x1="12" y1="12" x2="16.5" y2="14.6" strokeDasharray="2 2"></line><line x1="12" y1="12" x2="7.5" y2="14.6" strokeDasharray="2 2"></line></svg>
                      </div>
                      <p>Generate a layout to explore the architectural model.</p>
                      <button className="btn btn-primary" onClick={() => setThreeActive(true)}>Launch Interactive 3D</button>
                    </div>
                  </div>
                )}
                {threeActive && <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Orbit, zoom, and inspect wall layers.</p>}
              </section>

              <section className="explainer-grid fade-in" style={{ animationDelay: '0.3s' }}>
                <div className="step-card">
                  <span className="step-number">01</span>
                  <strong>Natural language prompt</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Start by simply describing your ideal layout in plain English.</p>
                </div>
                <div className="step-card">
                  <span className="step-number">02</span>
                  <strong>Ollama intent extraction</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Local AI parses your requirements and structural logic.</p>
                </div>
                <div className="step-card">
                  <span className="step-number">03</span>
                  <strong>Rule-based room placement</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>A constraint solver guarantees non-overlapping, realistic plans.</p>
                </div>
                <div className="step-card">
                  <span className="step-number">04</span>
                  <strong>Three.js 3D generation</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>The 2D blueprint instantly extrudes into a fully interactive model.</p>
                </div>
              </section>
            </div>

            <aside className="sidebar fade-in">
              <section className="glass-card">
                <span className="badge" style={{ marginBottom: '0.5rem' }}>Settings</span>
                <h2>Control Panel</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', marginTop: '2rem' }}>
                  <div className="control-group">
                    <span className="control-label">Styling</span>
                    <div className="control-buttons">
                      <button className={`btn-pill ${styleState.modern ? 'active' : ''}`} onClick={() => handleVoiceCommand('make it modern')}>Modern</button>
                      <button className={`btn-pill ${styleState.wallColor === '#38bdf8' ? 'active' : ''}`} onClick={() => handleVoiceCommand('make walls blue')}>Blue Walls</button>
                    </div>
                  </div>

                  <div className="control-group">
                    <span className="control-label">Structure</span>
                    <div className="control-buttons">
                      <button className={`btn-pill ${styleState.layered ? 'active' : ''}`} onClick={() => handleVoiceCommand('show wall layers')}>Show Wall Layers</button>
                      <button className="btn-pill" onClick={() => handleVoiceCommand('reset')}>Reset Layout</button>
                    </div>
                  </div>

                  <div className="control-group">
                    <span className="control-label">Interior</span>
                    <div className="control-buttons">
                      <button className={`btn-pill ${styleState.furniture ? 'active' : ''}`} onClick={() => handleVoiceCommand('add furniture')}>Add Furniture</button>
                    </div>
                  </div>
                </div>
              </section>

              <VoiceControls onCommand={handleVoiceCommand} lastCommand={lastCommand} />
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
