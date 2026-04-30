import { cloneFallbackRooms, roomPalette } from './layoutFallback.js';

const roomNames = ['Living Room', 'Bedroom', 'Kitchen', 'Bath', 'Study', 'Master', 'Dining', 'Office'];

export function normalizeRooms(rects, sourceWidth, sourceHeight) {
  if (!rects?.length || sourceWidth <= 0 || sourceHeight <= 0) {
    return cloneFallbackRooms();
  }

  const minArea = sourceWidth * sourceHeight * 0.006;
  const maxArea = sourceWidth * sourceHeight * 0.65;
  const filtered = rects
    .filter((rect) => rect.width * rect.height >= minArea && rect.width * rect.height <= maxArea)
    .filter((rect) => rect.width > 24 && rect.height > 24)
    .sort((a, b) => b.width * b.height - a.width * a.height)
    .slice(0, 8);

  if (filtered.length < 3) {
    return cloneFallbackRooms();
  }

  const minX = Math.min(...filtered.map((rect) => rect.x));
  const minY = Math.min(...filtered.map((rect) => rect.y));
  const maxX = Math.max(...filtered.map((rect) => rect.x + rect.width));
  const maxY = Math.max(...filtered.map((rect) => rect.y + rect.height));
  const spanX = Math.max(maxX - minX, 1);
  const spanY = Math.max(maxY - minY, 1);
  const targetWidth = 560;
  const targetHeight = 390;

  return filtered
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((rect, index) => ({
      id: `detected-${index + 1}`,
      x: ((rect.x - minX) / spanX) * targetWidth + 18,
      y: ((rect.y - minY) / spanY) * targetHeight + 18,
      width: Math.max((rect.width / spanX) * targetWidth, 58),
      height: Math.max((rect.height / spanY) * targetHeight, 52),
      label: roomNames[index] || `Room ${index + 1}`,
      color: roomPalette[index % roomPalette.length],
      height3d: 0.85 + (index % 4) * 0.12
    }));
}

export function roomArea(room) {
  if (room.areaSqFt) return Math.round(room.areaSqFt);
  return Math.round((room.width * room.height) / 85);
}

export function layoutBounds(rooms) {
  if (!rooms.length) return { width: 900, height: 560 };
  const maxX = Math.max(...rooms.map((room) => room.x + room.width), 1);
  const maxY = Math.max(...rooms.map((room) => room.y + room.height), 1);
  return { width: Math.ceil(maxX + 18), height: Math.ceil(maxY + 18) };
}
