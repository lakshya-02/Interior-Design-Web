import { layoutBounds, roomArea } from '../utils/roomExtraction.js';

export default function Layout2D({ rooms, active }) {
  const bounds = layoutBounds(rooms);
  const totalArea = rooms.reduce((sum, room) => sum + roomArea(room), 0);

  return (
    <section className="glass-card fade-in" style={{ animationDelay: '0.1s' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <span className="badge" style={{ marginBottom: '0.5rem' }}>2D Blueprint Rendering</span>
          <h2>Generated Layout</h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <span className="badge badge-primary">{rooms.length} Detected rooms</span>
          <span className="badge badge-accent">{totalArea} sq ft</span>
          <span className="badge">Linear strategy</span>
        </div>
      </div>

      <div className={`plan-container blueprint-bg ${active ? 'active' : ''}`}>
        <svg className="plan-svg" viewBox={`0 0 ${bounds.width} ${bounds.height}`} preserveAspectRatio="xMidYMid meet">
          {rooms.length === 0 && (
            <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-muted)" fontSize="1.25rem" fontWeight="600">
              Generate a prompt layout to fill this plan
            </text>
          )}
          {rooms.map((room) => (
            <g key={room.id} className="room-group">
              <rect
                className="room-rect"
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="2"
                fill={`${room.color}2A`}
                stroke={room.color}
                strokeWidth="2"
              />
              <text x={room.x + 8} y={room.y + 20} className="plan-text" fontSize="14">
                {room.label}
              </text>
              <text x={room.x + 8} y={room.y + 36} className="plan-area-text">
                {roomArea(room)} sq ft
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="room-legend">
        {rooms.map((room) => (
          <div className="legend-item" key={room.id}>
            <div className="legend-color" style={{ backgroundColor: room.color }}></div>
            <span style={{ color: 'var(--text-main)', fontWeight: '500' }}>{room.label}</span>
            <span style={{ color: 'var(--text-muted)' }}>({roomArea(room)} sq ft)</span>
          </div>
        ))}
      </div>
    </section>
  );
}
