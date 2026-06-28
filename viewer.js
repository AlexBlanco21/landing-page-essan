// GLB viewer using ES modules via esm.sh, similar to react-three-gltf-viewer setup
// Renders images/Table.glb into #model3d-container with orbit controls

import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/KTX2Loader.js';

(function initModelViewer(){
  const container = document.getElementById('model3d-container');
  if (!container) return;
  const loadingEl = document.getElementById('model3d-loading');
  // Control buttons
  const btnIn = document.getElementById('vc-zoom-in');
  const btnOut = document.getElementById('vc-zoom-out');
  const btnRotate = document.getElementById('vc-rotate');
  const btnReset = document.getElementById('vc-reset');

  // Ensure container has a measurable size before creating renderer
  function getContainerSize() {
    const w = container.clientWidth || container.offsetWidth || 600;
    const h = container.clientHeight || container.offsetHeight || 400;
    return { w, h };
  }
  const { w: initialW, h: initialH } = getContainerSize();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF0E8D8);

  const camera = new THREE.PerspectiveCamera(45, initialW / initialH, 0.1, 100);
  const initialCamPos = new THREE.Vector3(2.2, 1.6, 2.6);
  camera.position.copy(initialCamPos);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(initialW, initialH);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  // Ensure controls overlay remains clickable above canvas
  renderer.domElement.style.position = 'relative';
  renderer.domElement.style.zIndex = '1';

  const hemi = new THREE.HemisphereLight(0xffffff, 0x888888, 0.9);
  hemi.position.set(0, 1, 0);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 0.8);
  dir.position.set(3, 5, 2);
  dir.castShadow = false;
  scene.add(dir);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 2.0;
  const initialTarget = new THREE.Vector3(0, 0.5, 0);
  controls.target.copy(initialTarget);
  controls.saveState();

  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/draco/');
  loader.setDRACOLoader(draco);

  const ktx2 = new KTX2Loader();
  ktx2.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/').detectSupport(renderer);
  loader.setKTX2Loader(ktx2);

  const MODEL_URL = 'images/Table.glb';
  let modelRoot = null;
  loader.load(
    MODEL_URL,
    (gltf) => {
      const model = gltf.scene;
      modelRoot = model;
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 1.2 / maxDim;
      model.scale.setScalar(scale);
      box.setFromObject(model);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);

      // Slight lift if model sits below ground
      model.position.y += 0.05;

      scene.add(model);
      if (loadingEl) loadingEl.remove();
    },
    undefined,
    (e) => {
      console.error('GLB load error', e);
      if (loadingEl) {
        loadingEl.textContent = 'No se pudo cargar el modelo 3D (images/Table.glb). Verifica la ruta y sirve el sitio por HTTP.';
      }
    }
  );

  function onResize() {
    const { w, h } = getContainerSize();
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', onResize);

  // --- Viewer Controls ---
  function clampZoom(delta){
    const minDist = 0.8;
    const maxDist = 8;
    const offset = new THREE.Vector3().copy(camera.position).sub(controls.target);
    const currentDist = offset.length();
    const newDist = THREE.MathUtils.clamp(currentDist + delta, minDist, maxDist);
    offset.setLength(newDist);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }
  function doZoomIn(){ clampZoom(-0.35); }
  function doZoomOut(){ clampZoom(0.35); }
  function doRotateToggle(){ controls.autoRotate = !controls.autoRotate; }
  function doReset(){ controls.autoRotate = false; controls.reset(); }

  // Bind directly if elements exist now
  btnIn?.addEventListener('click', doZoomIn);
  btnOut?.addEventListener('click', doZoomOut);
  btnRotate?.addEventListener('click', doRotateToggle);
  btnReset?.addEventListener('click', doReset);

  // Also bind via delegation to be robust to re-renders
  container.addEventListener('pointerdown', (ev)=>{
    const btn = (ev.target && typeof ev.target.closest === 'function') ? ev.target.closest('.vc-btn') : null;
    if (!btn) return;
    switch (btn.id) {
      case 'vc-zoom-in': doZoomIn(); break;
      case 'vc-zoom-out': doZoomOut(); break;
      case 'vc-rotate': doRotateToggle(); break;
      case 'vc-reset': doReset(); break;
    }
  });

  (function animate(){
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
})();
