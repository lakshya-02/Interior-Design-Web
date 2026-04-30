import { roomPalette } from './layoutFallback.js';

const TARGET_WIDTH = 780;
const TARGET_HEIGHT = 500;

export function generatedRoomsToLayout(generatedRooms) {
  const validRooms = (generatedRooms || [])
    .filter((room) => room.label && room.width > 0 && room.height > 0)
    .map((room) => ({
      ...room,
      x: Math.max(0, Math.min(1000, Number(room.x))),
      y: Math.max(0, Math.min(1000, Number(room.y))),
      width: Math.max(1, Math.min(1000, Number(room.width))),
      height: Math.max(1, Math.min(1000, Number(room.height)))
    }));

  if (!validRooms.length) return [];

  const minX = Math.min(...validRooms.map((room) => room.x));
  const minY = Math.min(...validRooms.map((room) => room.y));
  const maxX = Math.max(...validRooms.map((room) => room.x + room.width));
  const maxY = Math.max(...validRooms.map((room) => room.y + room.height));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min(TARGET_WIDTH / spanX, TARGET_HEIGHT / spanY);
  const offsetX = 24;
  const offsetY = 24;

  return validRooms.map((room, index) => ({
    id: room.id || `prompt-${index + 1}-${room.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    x: (room.x - minX) * scale + offsetX,
    y: (room.y - minY) * scale + offsetY,
    width: Math.max(room.width * scale, 54),
    height: Math.max(room.height * scale, 48),
    label: room.label,
    color: room.color || roomPalette[index % roomPalette.length],
    height3d: Number(room.height3d) || 1.1,
    areaSqFt: Number(room.areaSqFt) > 0 ? Number(room.areaSqFt) : undefined,
    promptGenerated: true
  }));
}

export async function generateLayoutFromPrompt(prompt) {
  const response = await fetch('/api/generate-layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Prompt layout generation failed.');
  return {
    rooms: generatedRoomsToLayout(payload.rooms),
    rawRooms: payload.rooms || [],
    notes: payload.notes || ''
  };
}
