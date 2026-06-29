// 3D viewer using ES modules via esm.sh
// Renders images/Mueble.obj into #model3d-container with orbit controls

import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'https://esm.sh/three@0.160.0/examples/jsm/loaders/MTLLoader.js';

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
  const amb = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(amb);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = true;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 2.0;
  const initialTarget = new THREE.Vector3(0, 0, 0);
  controls.target.copy(initialTarget);
  controls.saveState();
  const objLoader = new OBJLoader();
  const mtlLoader = new MTLLoader();

  const MODEL_OBJ = 'images/Mueble.obj';
  const MODEL_MTL = 'images/Mueble.mtl';
  let modelRoot = null;

  // Ensure resources resolve relative to /images
  objLoader.setPath('images/');
  mtlLoader.setPath('images/');
  mtlLoader.setResourcePath('images/');
  // Prefer double-sided to avoid black faces when normals are flipped
  if (mtlLoader.setMaterialOptions) {
    mtlLoader.setMaterialOptions({ side: THREE.DoubleSide });
  }

  mtlLoader.load(
    'Mueble.mtl',
    (materials) => {
      try { materials.preload(); } catch (e) {}
      objLoader.setMaterials(materials);
      objLoader.load(
        'Mueble.obj',
        (obj) => {
          const model = obj;
          modelRoot = model;

          // Normalize texture color space when present
          model.traverse((child) => {
            if (!child.isMesh) return;
            // Ensure geometry has normals
            if (child.geometry && !child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            if (mats.length === 0 || !mats[0]) {
              child.material = new THREE.MeshStandardMaterial({ color: 0x8f8f8f, metalness: 0.1, roughness: 0.9, side: THREE.DoubleSide });
            } else {
              mats.forEach(m => {
                if (!m) return;
                if (m.map) {
                  m.map.colorSpace = THREE.SRGBColorSpace;
                  m.map.needsUpdate = true;
                }
                m.side = THREE.DoubleSide;
                // Avoid pure black if no texture map
                if (!m.map && m.color && m.color.r === 0 && m.color.g === 0 && m.color.b === 0) {
                  m.color.set(0x888888);
                }
                m.needsUpdate = true;
              });
            }
            child.castShadow = false;
            child.receiveShadow = false;
          });

          // Scale and center model within view (center to origin)
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

          scene.add(model);

          // Aim controls at model center for proper vertical centering
          controls.target.set(0, 0, 0);
          controls.update();

          if (loadingEl) loadingEl.remove();
        },
        undefined,
        (e) => {
          console.error('OBJ load error', e);
          if (loadingEl) {
            loadingEl.textContent = 'No se pudo cargar el modelo 3D (images/Mueble.obj). Verifica la ruta y sirve el sitio por HTTP.';
          }
        }
      );
    },
    undefined,
    (e) => {
      console.error('MTL load error', e);
      // Fallback: try to load OBJ without materials
      objLoader.load(
        'Mueble.obj',
        (obj) => {
          const model = obj;
          modelRoot = model;

          model.traverse((child) => {
            if (!child.isMesh) return;
            if (child.geometry && !child.geometry.attributes.normal) {
              child.geometry.computeVertexNormals();
            }
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            if (mats.length === 0 || !mats[0]) {
              child.material = new THREE.MeshStandardMaterial({ color: 0x8f8f8f, metalness: 0.1, roughness: 0.9, side: THREE.DoubleSide });
            } else {
              mats.forEach(m => { if (m) { m.side = THREE.DoubleSide; if (!m.map && m.color && m.color.getHex() === 0x000000) m.color.set(0x888888); m.needsUpdate = true; } });
            }
          });

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
          scene.add(model);
          controls.target.set(0, 0, 0);
          controls.update();
          if (loadingEl) loadingEl.remove();
        },
        undefined,
        (err) => {
          console.error('OBJ load error (fallback)', err);
          if (loadingEl) {
            loadingEl.textContent = 'No se pudo cargar el modelo 3D. Verifica las rutas images/Mueble.obj y images/Mueble.mtl.';
          }
        }
      );
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
