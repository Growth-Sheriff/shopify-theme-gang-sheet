// ═══════════════════════════════════════════════════════════════
// 3D T-SHIRT CUSTOMIZER - Inspired by JavaScript Mastery
// https://github.com/kt946/ai-threejs-products-app-yt-jsm
// ═══════════════════════════════════════════════════════════════

// Uses global THREE from CDN (r128)

let scene, camera, renderer, tshirt, controls;
let currentColor = '#7dd3fc'; // Light blue (sky-300)
let logoMesh = null;

// DecalGeometry için mesh referansları (product-page mantığı)
let targetMeshRef = null;
let meshBBox = null;
let meshSize = null;
let meshCenter = null;

// Initialize 3D Scene
function initHero3D() {
  const canvas = document.getElementById('hero3DCanvas');
  if (!canvas) return;

  const container = canvas.parentElement;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();

  // Camera - POZİTİF Z'de (product page gibi)
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1, 12); // Kamera pozitif Z'de - product page gibi

  // Renderer - transparent background
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.setClearColor(0x000000, 0); // Transparent background

  // No background - transparent
  scene.background = null;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 1);
  mainLight.position.set(5, 5, 5);
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x7367f0, 0.4);
  rimLight.position.set(0, -3, -5);
  scene.add(rimLight);

  // Controls
  controls = new THREE.OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = true;
  controls.minDistance = 8;
  controls.maxDistance = 20;
  controls.enablePan = false;
  controls.autoRotate = false;  // Logo'yu görebilmek için kapalı
  controls.autoRotateSpeed = 1.5;

  // Load T-shirt model
  loadTshirtModel();

  // Animation loop
  animate();

  // Handle resize
  window.addEventListener('resize', onWindowResize);
}

// Create gradient background texture
function createGradientTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  
  const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 400);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.5, '#f3f2ff');
  gradient.addColorStop(1, '#ebe9fe');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Load T-shirt GLB model
function loadTshirtModel() {
  const loader = new THREE.GLTFLoader();
  
  // Shopify'da asset URL'i kullan
  const modelUrl = window.shirtModelUrl || '/assets/shirt_baked.glb';
  
  loader.load(
    modelUrl,
    function(gltf) {
      tshirt = gltf.scene;
      tshirt.scale.set(12, 12, 12); // 2x bigger
      tshirt.position.set(0, 0.3, 0); // Moved up to red line
      // Rotasyon yok - kamerayı negatif Z'ye koyacağız
      // Rotasyon yok - logo negatif Z'ye konulacak (kameraya bakan taraf)
      
      tshirt.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.color = new THREE.Color(currentColor);
          child.material.roughness = 0.85;
          child.material.metalness = 0;
        }
      });
      
      scene.add(tshirt);
      
      // Add logo to t-shirt
      addLogoToShirt();
    },
    undefined,
    function(error) {
      console.log('Loading fallback t-shirt...');
      createFallbackTshirt();
    }
  );
}

// Fallback t-shirt if model doesn't load - 2.5x scale
function createFallbackTshirt() {
  const material = new THREE.MeshStandardMaterial({
    color: currentColor,
    roughness: 0.85,
    metalness: 0
  });
  
  tshirt = new THREE.Group();
  
  // Body - more t-shirt shaped (scaled 2.5x)
  const bodyGeometry = new THREE.CylinderGeometry(0.95, 0.8, 1.875, 32);
  const body = new THREE.Mesh(bodyGeometry, material);
  body.position.y = -0.25;
  tshirt.add(body);
  
  // Shoulders
  const shoulderGeo = new THREE.BoxGeometry(2.375, 0.25, 0.625);
  const shoulders = new THREE.Mesh(shoulderGeo, material);
  shoulders.position.set(0, 0.7, 0);
  tshirt.add(shoulders);
  
  // Left sleeve
  const sleeveGeo = new THREE.CylinderGeometry(0.25, 0.325, 0.75, 16);
  const leftSleeve = new THREE.Mesh(sleeveGeo, material);
  leftSleeve.position.set(-1.25, 0.375, 0);
  leftSleeve.rotation.z = Math.PI / 3;
  tshirt.add(leftSleeve);
  
  // Right sleeve
  const rightSleeve = new THREE.Mesh(sleeveGeo, material);
  rightSleeve.position.set(1.25, 0.375, 0);
  rightSleeve.rotation.z = -Math.PI / 3;
  tshirt.add(rightSleeve);
  
  // Collar
  const collarGeo = new THREE.TorusGeometry(0.3, 0.0625, 16, 32, Math.PI);
  const collar = new THREE.Mesh(collarGeo, material);
  collar.position.set(0, 0.8, 0.2);
  collar.rotation.x = Math.PI / 2;
  tshirt.add(collar);
  
  scene.add(tshirt);
  
  // Add text logo for fallback too
  addLogoToShirt();
}

// Add default logo to t-shirt on load - DecalGeometry ile yüzeye yapışık
function addLogoToShirt() {
  if (!tshirt) return;
  
  // ================= MESH'İ BUL =================
  let targetMesh = null;
  tshirt.traverse((child) => {
    if (child.isMesh && !child.userData.isLogo) {
      targetMesh = child;
    }
  });
  
  if (!targetMesh) {
    console.error('No mesh found');
    return;
  }
  
  // World matrix'i güncelle (parent transformları dahil et)
  tshirt.updateMatrixWorld(true);
  targetMesh.updateMatrixWorld(true);
  
  // WORLD koordinatlarında bounding box (scale ve position dahil)
  const bbox = new THREE.Box3().setFromObject(targetMesh);
  const meshSizeCalc = bbox.getSize(new THREE.Vector3());
  const meshCenterCalc = bbox.getCenter(new THREE.Vector3());
  
  console.log('=== MESH BOYUTLARI (World) ===');
  console.log('Size:', meshSizeCalc);
  console.log('Center:', meshCenterCalc);
  console.log('BBox Min:', bbox.min);
  console.log('BBox Max:', bbox.max);
  
  // ================= LOGO BOYUT HESAPLAMALARI =================
  // Logo boyutu - mesh genişliğinin %35'i
  const logoWidth = meshSizeCalc.x * 0.35;
  const logoHeight = logoWidth * (128 / 512);  // Canvas aspect ratio (512x128)
  const depth = meshSizeCalc.z * 0.3;  // Yüzeye yapışık
  
  // Kamera +Z'de (product page gibi), ön yüzey = max.z tarafında
  const frontZ = bbox.max.z;
  
  // Decal pozisyonu - göğüs merkezi (product page gibi)
  const decalPosition = new THREE.Vector3(
    meshCenterCalc.x,
    meshCenterCalc.y + meshSizeCalc.y * 0.05,  // Biraz yukarı (göğüs)
    meshCenterCalc.z + meshSizeCalc.z * 0.5     // Ön yüzey (product page: miniCenter.z + miniSize.z * 0.5)
  );
  
  console.log('=== DECAL PARAMETRELERI ===');
  console.log('Logo Size:', logoWidth, logoHeight);
  console.log('Position:', decalPosition);
  console.log('Front Z:', frontZ);
  
  // ================= TEXT LOGO TEXTURE =================
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  // Transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Text styling
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw text
  ctx.fillText('Custom DTF Transfers', canvas.width / 2, canvas.height / 2);
  
  // Create texture immediately (no image loading needed)
  (function() {
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    // Remove existing logo if any
    if (logoMesh) {
      scene.remove(logoMesh);
      if (logoMesh.geometry) logoMesh.geometry.dispose();
      if (logoMesh.material) logoMesh.material.dispose();
    }
    
    try {
      // DecalGeometry ile yüzeye yapışık logo
      // Orientation: Kamera +Z'de, decal +Z yönüne bakmalı (default)
      const decalGeometry = new THREE.DecalGeometry(
        targetMesh,
        decalPosition,
        new THREE.Euler(0, 0, 0),  // +Z yönüne baksın (varsayılan)
        new THREE.Vector3(logoWidth, logoHeight, depth)
      );
      
      // Decal boş mu kontrol et
      if (decalGeometry.attributes.position.count < 3) {
        throw new Error('Decal empty');
      }
      
      const decalMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -10,
        polygonOffsetUnits: -10
      });
      
      logoMesh = new THREE.Mesh(decalGeometry, decalMaterial);
      logoMesh.userData.isLogo = true;
      logoMesh.renderOrder = 100;
      scene.add(logoMesh);
      console.log('=== DECAL LOGO EKLENDİ ===');
      
    } catch (error) {
      console.warn('DecalGeometry failed, using PlaneGeometry:', error.message);
      // Fallback: PlaneGeometry
      const fallbackGeo = new THREE.PlaneGeometry(logoWidth, logoHeight);
      const fallbackMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        side: THREE.DoubleSide
      });
      logoMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      logoMesh.position.copy(decalPosition);
      logoMesh.position.z += 0.1;  // Yüzeyden öne (kameraya doğru = daha pozitif)
      // Rotasyon yok - default olarak kameraya (+Z) bakıyor
      logoMesh.userData.isLogo = true;
      logoMesh.renderOrder = 100;
      scene.add(logoMesh);
      console.log('=== FALLBACK LOGO EKLENDİ ===');
    }
    
  })();
}

// Change t-shirt color
window.changeTshirtColor = function(color) {
  currentColor = color;
  if (tshirt) {
    tshirt.traverse((child) => {
      if (child.isMesh && !child.userData.isLogo) {
        child.material.color = new THREE.Color(color);
      }
    });
  }
}

// Add logo to t-shirt
window.addLogoToTshirt = function(imageUrl) {
  const textureLoader = new THREE.TextureLoader();
  textureLoader.load(imageUrl, (texture) => {
    if (logoMesh && tshirt) {
      tshirt.remove(logoMesh);
    }
    
    const logoGeo = new THREE.PlaneGeometry(0.25, 0.25);
    const logoMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    logoMesh = new THREE.Mesh(logoGeo, logoMat);
    logoMesh.userData.isLogo = true;
    logoMesh.position.set(0, 0.05, 0.34);
    
    if (tshirt) {
      tshirt.add(logoMesh);
    }
  });
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
  const container = document.getElementById('hero3DCanvas')?.parentElement;
  if (!container) return;
  
  const width = container.clientWidth;
  const height = container.clientHeight;
  
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// Rotate t-shirt
window.rotateTshirt = function(direction) {
  if (tshirt) {
    tshirt.rotation.y += direction * 0.5;
  }
}

// Reset view
window.resetView = function() {
  if (tshirt) {
    tshirt.rotation.y = 0;  // Varsayılan
  }
  camera.position.set(0, 1, 12); // Kamera pozitif Z'de
  if (controls) controls.reset();
}

// Download design
window.downloadDesign = function() {
  const canvas = document.getElementById('hero3DCanvas');
  const link = document.createElement('a');
  link.download = 'my-tshirt-design.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Stop auto-rotate
window.stopAutoRotate = function() {
  if (controls) controls.autoRotate = false;
}

// Initialize
initHero3D();
