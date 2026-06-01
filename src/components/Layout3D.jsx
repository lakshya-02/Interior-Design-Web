import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { layoutBounds } from '../utils/roomExtraction.js';

const ROOM_SCALE = 0.025;
const WALL_HEIGHT = 1.45;
const WALL_THICKNESS = 0.08;

function disposeObject(object) {
  if (object.geometry) object.geometry.dispose();
  if (object.material) {
    if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
    else object.material.dispose();
  }
}

function addBox(parent, size, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radius, height, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 28), material);
  mesh.position.set(position.x, position.y, position.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = name;
  parent.add(mesh);
  return mesh;
}

function labelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(2, 6, 23, 0.72)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.font = '700 42px Arial';
  context.fillStyle = '#f8fafc';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.4, 0.34, 1);
  return sprite;
}

function roomCenter(room, bounds) {
  return {
    x: (room.x + room.width / 2 - bounds.width / 2) * ROOM_SCALE,
    z: (room.y + room.height / 2 - bounds.height / 2) * ROOM_SCALE,
    width: Math.max(room.width * ROOM_SCALE, 0.72),
    depth: Math.max(room.height * ROOM_SCALE, 0.62)
  };
}

function addRoomShell(parent, room, bounds, materials) {
  const { x, z, width, depth } = roomCenter(room, bounds);
  const floorHeight = 0.035;

  addBox(
    parent,
    new THREE.Vector3(width, floorHeight, depth),
    new THREE.Vector3(x, floorHeight / 2, z),
    materials.floor(room.color),
    `${room.label} floor`
  );

  const wallMat = materials.wall;
  addBox(parent, new THREE.Vector3(width, WALL_HEIGHT, WALL_THICKNESS), new THREE.Vector3(x, WALL_HEIGHT / 2, z - depth / 2), wallMat);
  addBox(parent, new THREE.Vector3(width, WALL_HEIGHT, WALL_THICKNESS), new THREE.Vector3(x, WALL_HEIGHT / 2, z + depth / 2), wallMat);
  addBox(parent, new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, depth), new THREE.Vector3(x - width / 2, WALL_HEIGHT / 2, z), wallMat);
  addBox(parent, new THREE.Vector3(WALL_THICKNESS, WALL_HEIGHT, depth), new THREE.Vector3(x + width / 2, WALL_HEIGHT / 2, z), wallMat);

  const doorMat = materials.door;
  addBox(
    parent,
    new THREE.Vector3(Math.min(width * 0.28, 0.46), 0.04, 0.035),
    new THREE.Vector3(x, 0.055, z + depth / 2 + 0.005),
    doorMat,
    `${room.label} door marker`
  );

  const label = labelSprite(room.label);
  label.position.set(x, WALL_HEIGHT + 0.35, z);
  parent.add(label);

  return { x, z, width, depth };
}

function addBed(parent, room, materials) {
  const bedW = room.width * 0.44;
  const bedD = room.depth * 0.48;
  addBox(parent, new THREE.Vector3(bedW, 0.18, bedD), new THREE.Vector3(room.x, 0.16, room.z - room.depth * 0.08), materials.fabric, 'bed');
  addBox(parent, new THREE.Vector3(bedW, 0.12, bedD * 0.18), new THREE.Vector3(room.x, 0.33, room.z - bedD * 0.36), materials.pillow, 'pillows');
  addBox(parent, new THREE.Vector3(room.width * 0.18, 0.26, room.depth * 0.16), new THREE.Vector3(room.x + room.width * 0.3, 0.16, room.z + room.depth * 0.26), materials.wood, 'nightstand');
}

function addLiving(parent, room, materials) {
  addBox(parent, new THREE.Vector3(room.width * 0.52, 0.22, room.depth * 0.16), new THREE.Vector3(room.x - room.width * 0.06, 0.18, room.z + room.depth * 0.24), materials.sofa, 'sofa');
  addBox(parent, new THREE.Vector3(room.width * 0.18, 0.18, room.depth * 0.36), new THREE.Vector3(room.x - room.width * 0.32, 0.16, room.z + room.depth * 0.04), materials.sofa, 'sofa side');
  addBox(parent, new THREE.Vector3(room.width * 0.26, 0.12, room.depth * 0.18), new THREE.Vector3(room.x + room.width * 0.14, 0.12, room.z - room.depth * 0.04), materials.wood, 'coffee table');
  addBox(parent, new THREE.Vector3(room.width * 0.32, 0.44, 0.05), new THREE.Vector3(room.x + room.width * 0.25, 0.38, room.z - room.depth * 0.39), materials.dark, 'tv');
}

function addKitchen(parent, room, materials) {
  addBox(parent, new THREE.Vector3(room.width * 0.82, 0.34, 0.16), new THREE.Vector3(room.x, 0.2, room.z - room.depth * 0.36), materials.counter, 'counter');
  addBox(parent, new THREE.Vector3(0.18, 0.34, room.depth * 0.64), new THREE.Vector3(room.x - room.width * 0.38, 0.2, room.z), materials.counter, 'side counter');
  addCylinder(parent, Math.min(room.width, room.depth) * 0.08, 0.08, new THREE.Vector3(room.x + room.width * 0.16, 0.42, room.z), materials.metal, 'dining table');
  for (let index = 0; index < 4; index += 1) {
    const angle = (Math.PI / 2) * index;
    addBox(
      parent,
      new THREE.Vector3(0.13, 0.16, 0.13),
      new THREE.Vector3(room.x + Math.cos(angle) * 0.35, 0.12, room.z + Math.sin(angle) * 0.35),
      materials.wood,
      'chair'
    );
  }
}

function addBathroom(parent, room, materials) {
  addBox(parent, new THREE.Vector3(room.width * 0.34, 0.2, room.depth * 0.52), new THREE.Vector3(room.x + room.width * 0.22, 0.16, room.z + room.depth * 0.1), materials.ceramic, 'bathtub');
  addCylinder(parent, Math.min(room.width, room.depth) * 0.08, 0.22, new THREE.Vector3(room.x - room.width * 0.22, 0.16, room.z + room.depth * 0.18), materials.ceramic, 'toilet');
  addBox(parent, new THREE.Vector3(room.width * 0.26, 0.2, room.depth * 0.14), new THREE.Vector3(room.x - room.width * 0.18, 0.16, room.z - room.depth * 0.32), materials.counter, 'sink');
}

function addLaundry(parent, room, materials) {
  addCylinder(parent, Math.min(room.width, room.depth) * 0.12, 0.32, new THREE.Vector3(room.x - room.width * 0.16, 0.2, room.z), materials.metal, 'washer');
  addCylinder(parent, Math.min(room.width, room.depth) * 0.12, 0.32, new THREE.Vector3(room.x + room.width * 0.16, 0.2, room.z), materials.metal, 'dryer');
  addBox(parent, new THREE.Vector3(room.width * 0.78, 0.1, room.depth * 0.14), new THREE.Vector3(room.x, 0.45, room.z - room.depth * 0.33), materials.wood, 'shelf');
}

function addCloset(parent, room, materials) {
  addBox(parent, new THREE.Vector3(room.width * 0.72, 0.4, room.depth * 0.18), new THREE.Vector3(room.x, 0.28, room.z - room.depth * 0.24), materials.wood, 'closet shelf');
  addBox(parent, new THREE.Vector3(room.width * 0.1, 0.55, room.depth * 0.62), new THREE.Vector3(room.x - room.width * 0.26, 0.32, room.z + room.depth * 0.06), materials.fabric, 'hanging clothes');
}

function addHall(parent, room, materials) {
  addBox(parent, new THREE.Vector3(room.width * 0.78, 0.035, room.depth * 0.28), new THREE.Vector3(room.x, 0.07, room.z), materials.runner, 'hall runner');
  addBox(parent, new THREE.Vector3(room.width * 0.18, 0.42, room.depth * 0.16), new THREE.Vector3(room.x - room.width * 0.32, 0.28, room.z + room.depth * 0.2), materials.wood, 'entry cabinet');
}

function addFurniture(parent, roomShape, label, materials) {
  const key = label.toLowerCase();
  if (key.includes('bed') || key.includes('master')) addBed(parent, roomShape, materials);
  else if (key.includes('kitchen') || key.includes('dining')) addKitchen(parent, roomShape, materials);
  else if (key.includes('bath')) addBathroom(parent, roomShape, materials);
  else if (key.includes('laundry')) addLaundry(parent, roomShape, materials);
  else if (key.includes('closet')) addCloset(parent, roomShape, materials);
  else if (key.includes('hall') || key.includes('foyer')) addHall(parent, roomShape, materials);
  else addLiving(parent, roomShape, materials);
}

export default function Layout3D({ rooms, styleState }) {
  const mountRef = useRef(null);
  const [renderError, setRenderError] = useState('');

  useEffect(() => {
    if (!mountRef.current) return undefined;

    const mount = mountRef.current;
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (error) {
      setRenderError(`WebGL could not start: ${error.message}`);
      return undefined;
    }

    setRenderError('');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.35));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.className = 'three-canvas';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#101827');

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
    const bounds = layoutBounds(rooms);
    const modelWidth = bounds.width * ROOM_SCALE;
    const modelDepth = bounds.height * ROOM_SCALE;
    const cameraDistance = Math.max(modelWidth, modelDepth) * 1.25 + 3;
    camera.position.set(cameraDistance, Math.max(cameraDistance * 0.82, 8), cameraDistance);
    camera.lookAt(0, 0.65, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.55, 0);
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 3;
    controls.maxDistance = cameraDistance * 2.2;
    controls.update();

    scene.add(new THREE.HemisphereLight('#dbeafe', '#1e293b', 1.6));
    const sun = new THREE.DirectionalLight('#ffffff', 2.4);
    sun.position.set(5, 9, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    const materials = {
      wall: new THREE.MeshStandardMaterial({ color: styleState.wallColor, roughness: styleState.modern ? 0.42 : 0.74, metalness: styleState.modern ? 0.08 : 0.01 }),
      door: new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.66 }),
      wood: new THREE.MeshStandardMaterial({ color: '#9a6a3a', roughness: 0.58 }),
      sofa: new THREE.MeshStandardMaterial({ color: styleState.modern ? '#64748b' : '#0f766e', roughness: 0.74 }),
      fabric: new THREE.MeshStandardMaterial({ color: '#818cf8', roughness: 0.86 }),
      pillow: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.72 }),
      counter: new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.4 }),
      ceramic: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.34 }),
      metal: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.28, metalness: 0.22 }),
      dark: new THREE.MeshStandardMaterial({ color: '#020617', roughness: 0.3 }),
      runner: new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.82 }),
      floor: (color) => new THREE.MeshStandardMaterial({ color: styleState.modern ? '#dbeafe' : color, roughness: 0.86, metalness: 0.02 })
    };

    const model = new THREE.Group();
    if (!rooms.length) {
      const placeholderMaterial = new THREE.MeshStandardMaterial({ color: '#2dd4bf', roughness: 0.6 });
      addBox(model, new THREE.Vector3(2.6, 0.08, 1.7), new THREE.Vector3(0, 0.04, 0), placeholderMaterial, 'empty layout placeholder');
      const label = labelSprite('Generate a prompt layout');
      label.position.set(0, 1.1, 0);
      model.add(label);
    }

    rooms.forEach((room) => {
      const roomGroup = new THREE.Group();
      const roomShape = addRoomShell(roomGroup, room, bounds, materials);
      if (styleState.furniture) addFurniture(roomGroup, roomShape, room.label, materials);
      if (styleState.layered) {
        addBox(
          roomGroup,
          new THREE.Vector3(roomShape.width * 0.96, 0.025, roomShape.depth * 0.96),
          new THREE.Vector3(roomShape.x, 0.08, roomShape.z),
          new THREE.MeshStandardMaterial({ color: '#f59e0b', transparent: true, opacity: 0.22 }),
          'wall layer overlay'
        );
      }
      model.add(roomGroup);
    });
    scene.add(model);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(modelWidth + 1.2, 0.04, modelDepth + 1.2),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.92 })
    );
    base.position.y = -0.04;
    base.receiveShadow = true;
    scene.add(base);

    const grid = new THREE.GridHelper(Math.max(modelWidth, modelDepth) + 2, 20, '#67e8f9', '#334155');
    grid.position.y = -0.015;
    scene.add(grid);

    const resize = () => {
      const width = mount.clientWidth || 900;
      const height = mount.clientHeight || 520;
      renderer.setSize(width, height, true);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      scene.traverse(disposeObject);
    };
  }, [rooms, styleState]);

  return (
    <div style={{ width: '100%', height: '100%' }} ref={mountRef}>
      {renderError && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,0.9)', color: '#fca5a5' }}>{renderError}</div>}
    </div>
  );
}
