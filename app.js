import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.160.0/examples/jsm/webxr/ARButton.js';

let scene, camera, renderer, reticle, hitTestSource, hitTestSourceRequested;

init();
function init() {
  // Renderer with alpha=true → camera feed shows through
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // AR Button
  document.body.appendChild(ARButton.createButton(renderer, {
    requiredFeatures: ['hit-test']
  }));

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // Reticle
  const ring = new THREE.RingGeometry(0.08, 0.1, 32).rotateX(-Math.PI / 2);
  reticle = new THREE.Mesh(
    ring,
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Tap to place cube
  window.addEventListener('click', () => {
    if (!reticle.visible) return;
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.1, 0.1),
      new THREE.MeshStandardMaterial({ color: 0xff5533 })
    );
    cube.position.setFromMatrixPosition(reticle.matrix);
    scene.add(cube);
  });

  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  const session = renderer.xr.getSession();
  if (frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();

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
      const results = frame.getHitTestResults(hitTestSource);
      if (results.length > 0) {
        const hit = results[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}