import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let hitTestSource = null;
let hitTestSourceRequested = false;
let reticle;

init();
function init() {
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Scene & camera
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Light
  scene.add(new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1.0));

  // Reticle (ring that shows where a hit-test landed)
  const ring = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
  reticle = new THREE.Mesh(
    ring,
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Tap to place an object
  window.addEventListener('click', () => {
    if (!reticle.visible) return;
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x44aa88, metalness: 0.2, roughness: 0.6 })
    );
    box.position.setFromMatrixPosition(reticle.matrix);
    // Add a tiny bounce animation
    box.scale.set(0.001, 0.001, 0.001);
    scene.add(box);
    const target = new THREE.Vector3(1, 1, 1);
    const start = performance.now();
    const duration = 250;
    function grow() {
      const t = Math.min(1, (performance.now() - start) / duration);
      const s = t < 1 ? (0.9 * t + 0.1) : 1;
      box.scale.setScalar(s);
      if (t < 1) requestAnimationFrame(grow);
    }
    requestAnimationFrame(grow);
  });

  // WebXR AR button with hit-test
  const arButton = ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test'],
    optionalFeatures: ['dom-overlay'],
    domOverlay: { root: document.body }
  });
  document.body.appendChild(arButton);

  // Resize
  window.addEventListener('resize', onWindowResize);

  // Render loop
  renderer.setAnimationLoop(render);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame) {
  const session = renderer.xr.getSession();
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

    // Request a hit test source once per session
    if (!hitTestSourceRequested) {
      session.requestReferenceSpace('viewer').then((viewerSpace) => {
        session.requestHitTestSource({ space: viewerSpace }).then((source) => {
          hitTestSource = source;
        });
      });
      session.addEventListener('end', () => {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });
      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);
      if (hitTestResults.length > 0) {
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
        // Hide the hint when tracking a surface
        const hint = document.getElementById('hint');
        if (hint) hint.style.display = 'none';
      } else {
        reticle.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}
