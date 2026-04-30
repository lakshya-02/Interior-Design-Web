export const roomPalette = ['#71d4ff', '#f5c46b', '#8be0a4', '#d89bff', '#ff9d9d', '#94a3b8'];

export const fallbackRooms = [
  { id: 'living', x: 20, y: 20, width: 245, height: 190, label: 'Living Room', color: '#71d4ff', height3d: 1.25 },
  { id: 'bedroom', x: 20, y: 220, width: 155, height: 160, label: 'Bedroom', color: '#8be0a4', height3d: 1.15 },
  { id: 'foyer', x: 180, y: 220, width: 85, height: 160, label: 'Foyer', color: '#94a3b8', height3d: 0.9 },
  { id: 'kitchen', x: 275, y: 20, width: 170, height: 130, label: 'Kitchen', color: '#f5c46b', height3d: 1.05 },
  { id: 'bath', x: 455, y: 20, width: 100, height: 130, label: 'Bath', color: '#ff9d9d', height3d: 0.95 },
  { id: 'study', x: 275, y: 160, width: 150, height: 110, label: 'Study', color: '#d89bff', height3d: 1.0 },
  { id: 'master', x: 435, y: 160, width: 120, height: 220, label: 'Master', color: '#71d4ff', height3d: 1.2 }
];

export const cloneFallbackRooms = () => fallbackRooms.map((room) => ({ ...room }));
