import { layoutBounds, roomArea } from '../utils/roomExtraction.js';

export default function Layout2D({ rooms, active }) {
  const bounds = layoutBounds(rooms);

  return (
    <section className="panel layout-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">2D architectural plan</p>
          <h2>Generated Layout</h2>
        </div>
      </div>

      <div className={`layout-board ${active ? 'layout-board--active' : ''}`}>
        <svg viewBox={`0 0 ${bounds.width} ${bounds.height}`} role="img" aria-label="Detected floor plan layout">
          <defs>
            <pattern id="layout-grid" width="18" height="18" patternUnits="userSpaceOnUse">
              <path d="M18 0H0V18" fill="none" stroke="rgba(148, 163, 184, 0.18)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width={bounds.width} height={bounds.height} fill="url(#layout-grid)" />
          {rooms.length === 0 && (
            <text x={bounds.width / 2} y={bounds.height / 2} textAnchor="middle" className="empty-layout-text">
              Generate a prompt layout to fill this plan
            </text>
          )}
          {rooms.map((room) => (
            <g key={room.id}>
              <rect
                x={room.x}
                y={room.y}
                width={room.width}
                height={room.height}
                rx="3"
                fill={`${room.color}2f`}
                stroke={room.color}
                strokeWidth="4"
              />
              <text x={room.x + 12} y={room.y + 27} className="room-label">
                {room.label}
              </text>
              <text x={room.x + 12} y={room.y + 51} className="room-area">
                {roomArea(room)} sq ft
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="room-list">
        {rooms.map((room) => (
          <div className="room-chip" key={room.id}>
            <span style={{ background: room.color }} />
            <strong>{room.label}</strong>
            <em>{roomArea(room)} sq ft</em>
          </div>
        ))}
      </div>
    </section>
  );
}
