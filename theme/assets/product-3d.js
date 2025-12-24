/**
 * CloudyPrints - 3D T-Shirt Viewer
 * Main product page 3D viewer
 * Uses same pattern as working position previews
 */

// ==================== Global Variables ====================
let mainScene, mainCamera, mainRenderer, mainControls;
let tshirtModel = null;
let tshirtMaterial = null;
let currentTshirtColor = '#ffffff';
let isMainViewerInitialized = false;

// ==================== Wait for Three.js ====================
function waitForThreeJSMain() {
  if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined' && typeof THREE.OrbitControls !== 'undefined') {
    console.log('[Main3D] Three.js ready, initializing main viewer...');
    initMainViewer();
  } else {
    console.log('[Main3D] Waiting for Three.js...', {
      THREE: typeof THREE !== 'undefined',
      GLTFLoader: typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined',
      OrbitControls: typeof THREE !== 'undefined' && typeof THREE.OrbitControls !== 'undefined'
    });
    setTimeout(waitForThreeJSMain, 100);
  }
}

// ==================== Initialize Main Viewer ====================
function initMainViewer() {
  const canvas = document.getElementById('tshirt-canvas');
  if (!canvas) {
    console.log('[Main3D] Canvas #tshirt-canvas not found');
    return;
  }
  
  if (isMainViewerInitialized) {
    console.log('[Main3D] Already initialized');
    return;
  }
  
  console.log('[Main3D] Initializing main 3D viewer...');
  
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const width = rect.width || container.clientWidth || 500;
  const height = rect.height || container.clientHeight || 500;
  
  console.log('[Main3D] Canvas dimensions:', width, 'x', height);
  
  // ===== Scene =====
  mainScene = new THREE.Scene();
  mainScene.background = new THREE.Color(0xffffff);
  
  // ===== Camera =====
  mainCamera = new THREE.PerspectiveCamera(25, width / height, 0.1, 1000);
  mainCamera.position.set(0, 0, 2.5);
  
  // ===== Renderer =====
  mainRenderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  mainRenderer.setSize(width, height);
  mainRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mainRenderer.shadowMap.enabled = true;
  mainRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  // Handle encoding based on Three.js version
  if (mainRenderer.outputEncoding !== undefined) {
    mainRenderer.outputEncoding = THREE.sRGBEncoding;
  }
  if (mainRenderer.toneMapping !== undefined) {
    mainRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    mainRenderer.toneMappingExposure = 1.0;
  }
  
  // ===== Controls =====
  mainControls = new THREE.OrbitControls(mainCamera, canvas);
  mainControls.enableDamping = true;
  mainControls.dampingFactor = 0.08;
  mainControls.minDistance = 1.5;
  mainControls.maxDistance = 5;
  mainControls.enablePan = false;
  mainControls.autoRotate = true;
  mainControls.autoRotateSpeed = 1.0;
  mainControls.minPolarAngle = Math.PI / 6;
  mainControls.maxPolarAngle = Math.PI - Math.PI / 6;
  // Full 360 rotation
  mainControls.minAzimuthAngle = -Infinity;
  mainControls.maxAzimuthAngle = Infinity;
  
  // Stop auto-rotate on interaction
  canvas.addEventListener('mousedown', function() {
    mainControls.autoRotate = false;
  });
  canvas.addEventListener('touchstart', function() {
    mainControls.autoRotate = false;
  });
  
  // ===== Lighting =====
  setupMainLighting();
  
  // ===== Load Model =====
  loadMainTshirtModel();
  
  // ===== Animation Loop =====
  animateMainViewer();
  
  // ===== Resize Handler =====
  window.addEventListener('resize', onMainViewerResize);
  
  isMainViewerInitialized = true;
  console.log('[Main3D] Main viewer initialized successfully');
}

// ==================== Setup Lighting ====================
function setupMainLighting() {
  // Soft ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  mainScene.add(ambientLight);
  
  // Key light - front right
  const keyLight = new THREE.DirectionalLight(0xffffff, 0.8);
  keyLight.position.set(3, 5, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  mainScene.add(keyLight);
  
  // Fill light - front left
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-3, 3, 3);
  mainScene.add(fillLight);
  
  // Rim light for depth
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
  rimLight.position.set(0, 3, -5);
  mainScene.add(rimLight);
  
  // Top light for highlights
  const topLight = new THREE.DirectionalLight(0xffffff, 0.3);
  topLight.position.set(0, 8, 0);
  mainScene.add(topLight);
  
  // Hemisphere light for natural feel
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xf5f5f5, 0.3);
  mainScene.add(hemiLight);
}

// ==================== Load T-Shirt Model ====================
function loadMainTshirtModel() {
  const loader = new THREE.GLTFLoader();
  
  // Get model URL from global variable set in Liquid
  const modelUrl = window.GLB_MODEL_URL;
  
  if (!modelUrl) {
    console.error('[Main3D] GLB_MODEL_URL not defined, creating fallback');
    createFallbackModel();
    hideMainLoadingSpinner();
    return;
  }
  
  console.log('[Main3D] Loading model from:', modelUrl);
  
  loader.load(
    modelUrl,
    function(gltf) {
      console.log('[Main3D] Model loaded successfully!');
      tshirtModel = gltf.scene;
      
      // Apply material and store reference
      tshirtModel.traverse(function(child) {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color = new THREE.Color(currentTshirtColor);
          child.material.roughness = 0.9;
          child.material.metalness = 0.0;
          child.material.needsUpdate = true;
          child.castShadow = true;
          child.receiveShadow = true;
          
          if (!tshirtMaterial) {
            tshirtMaterial = child.material;
          }
        }
      });
      
      // Center and scale the model
      const box = new THREE.Box3().setFromObject(tshirtModel);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      tshirtModel.position.x = -center.x;
      tshirtModel.position.y = -center.y;
      tshirtModel.position.z = -center.z;
      
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.0 / maxDim;
      tshirtModel.scale.setScalar(scale);
      
      mainScene.add(tshirtModel);
      
      hideMainLoadingSpinner();
      console.log('[Main3D] T-Shirt added to scene');
    },
    function(xhr) {
      // Progress
      if (xhr.total > 0) {
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        updateMainLoadingProgress(percent);
      }
    },
    function(error) {
      console.error('[Main3D] Error loading model:', error);
      createFallbackModel();
      hideMainLoadingSpinner();
    }
  );
}

// ==================== Fallback Model ====================
function createFallbackModel() {
  console.log('[Main3D] Creating fallback t-shirt geometry');
  
  const geometry = new THREE.BoxGeometry(0.5, 0.6, 0.15);
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color(currentTshirtColor),
    roughness: 0.9,
    metalness: 0
  });
  
  tshirtModel = new THREE.Mesh(geometry, material);
  tshirtMaterial = material;
  tshirtModel.castShadow = true;
  tshirtModel.receiveShadow = true;
  
  mainScene.add(tshirtModel);
}

// ==================== Animation Loop ====================
function animateMainViewer() {
  requestAnimationFrame(animateMainViewer);
  
  if (mainControls) {
    mainControls.update();
  }
  
  if (mainRenderer && mainScene && mainCamera) {
    mainRenderer.render(mainScene, mainCamera);
  }
}

// ==================== Resize Handler ====================
function onMainViewerResize() {
  const canvas = document.getElementById('tshirt-canvas');
  if (!canvas) return;
  
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  const width = rect.width || container.clientWidth;
  const height = rect.height || container.clientHeight;
  
  if (mainCamera) {
    mainCamera.aspect = width / height;
    mainCamera.updateProjectionMatrix();
  }
  
  if (mainRenderer) {
    mainRenderer.setSize(width, height);
  }
}

// ==================== Loading Spinner Helpers ====================
function hideMainLoadingSpinner() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) {
    spinner.style.transition = 'opacity 0.5s';
    spinner.style.opacity = '0';
    setTimeout(function() {
      spinner.style.display = 'none';
    }, 500);
  }
}

function updateMainLoadingProgress(percent) {
  const text = document.querySelector('.loading-text');
  if (text) {
    text.textContent = 'Loading 3D Model... ' + percent + '%';
  }
}

// ==================== Public API Functions ====================

// Change t-shirt color
function changeTshirtColor(color) {
  currentTshirtColor = color;
  
  if (tshirtModel) {
    tshirtModel.traverse(function(child) {
      if (child.isMesh && child.material) {
        child.material.color = new THREE.Color(color);
      }
    });
  }
  
  // Also update mini scene colors if available
  if (typeof window.updateMiniScenesColor === 'function') {
    window.updateMiniScenesColor(color);
  }
}

// Reset camera view
function resetCamera() {
  if (mainControls) {
    mainCamera.position.set(0, 0, 2.5);
    mainControls.reset();
    mainControls.autoRotate = true;
  }
}

// Rotate model
function rotateModel(direction) {
  if (mainControls) mainControls.autoRotate = false;
  if (tshirtModel) {
    tshirtModel.rotation.y += direction * 0.5;
  }
}

// Reset model (alias for resetCamera)
function resetModel() {
  resetCamera();
}

// Update view based on position
function updateTshirtView(position) {
  if (!mainControls) return;
  mainControls.autoRotate = false;
  
  switch(position) {
    case 'back':
    case 'back-center':
      mainCamera.position.set(0, 0, -2.5);
      break;
    case 'left':
    case 'left-sleeve':
      mainCamera.position.set(-2.5, 0, 0);
      break;
    case 'right':
    case 'right-sleeve':
      mainCamera.position.set(2.5, 0, 0);
      break;
    default:
      mainCamera.position.set(0, 0, 2.5);
  }
  
  mainCamera.lookAt(0, 0, 0);
  if (mainControls) mainControls.update();
}

// Set camera position for position selection
function setMainCameraPosition(position) {
  updateTshirtView(position);
}

// ==================== Expose to Global ====================
window.changeTshirtColor = changeTshirtColor;
window.resetCamera = resetCamera;
window.rotateModel = rotateModel;
window.resetModel = resetModel;
window.updateTshirtView = updateTshirtView;
window.setMainCameraPosition = setMainCameraPosition;

// ==================== Initialize ====================
// Start checking for Three.js immediately
// Don't wait for DOMContentLoaded since Three.js loads after body
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure Three.js scripts have executed
    setTimeout(waitForThreeJSMain, 100);
  });
} else {
  // DOM already loaded, start immediately
  setTimeout(waitForThreeJSMain, 100);
}

