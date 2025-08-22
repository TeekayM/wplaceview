import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/ARButton.js';

let scene, camera, renderer;
let userOffset = { x: 0, y: 0 };

init();
getUserPosition();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['local-floor'] }));

  renderer.setAnimationLoop(render);
}

function getUserPosition() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos) => {
      // crude mapping: just use lat/long as offsets
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;

      // scale them into something smaller
      userOffset.x = Math.floor(lon * 10);
      userOffset.y = Math.floor(lat * 10);

      makeSkyGrid();
    });
  } else {
    makeSkyGrid(); // fallback
  }
}

function makeSkyGrid() {
  const gridSize = 20;     // 20x20 tiles
  const tileSize = 100;    // 0.5m each
  const height = 10;       // put in the "sky" 10m above user

  const group = new THREE.Group();
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const x = (i - gridSize/2) * tileSize;
      const z = (j - gridSize/2) * tileSize;

      // determine color based on position + user coords
      const parity = (i + userOffset.x + j + userOffset.y) % 2;
      const color = parity === 0 ? 0x44aa88 : 0xaa4488;

      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(tileSize, tileSize),
        new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      );
      tile.position.set(x, height, z);
      tile.rotation.x = -Math.PI/2; // flat
      group.add(tile);
    }
  }

  scene.add(group);
}

function render() {
  renderer.render(scene, camera);
}