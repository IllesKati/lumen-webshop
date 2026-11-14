const DEMO_MODEL_TYPE = "demo-organizer";

let threeModulesPromise;
let viewer;
let activeContainer;
let activeToken = 0;
let animationFrameId = 0;
let resizeObserver;
let selectedOrganizerColor = 0x20242b;
let selectedOrganizerScale = 1;

function loadThreeModules() {
  if (!threeModulesPromise) {
    threeModulesPromise = Promise.all([
      import("three"),
      import("three/addons/controls/OrbitControls.js"),
    ]).then(([THREE, controlsModule]) => ({
      THREE,
      OrbitControls: controlsModule.OrbitControls,
    }));
  }
  return threeModulesPromise;
}

function roundedRectangle(THREE, width, depth, radius, clockwise = false) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  const r = Math.min(radius, halfWidth, halfDepth);
  const shape = new (clockwise ? THREE.Path : THREE.Shape)();

  if (clockwise) {
    shape.moveTo(-halfWidth + r, -halfDepth);
    shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth, -halfDepth + r);
    shape.lineTo(-halfWidth, halfDepth - r);
    shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth + r, halfDepth);
    shape.lineTo(halfWidth - r, halfDepth);
    shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth, halfDepth - r);
    shape.lineTo(halfWidth, -halfDepth + r);
    shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth - r, -halfDepth);
    shape.lineTo(-halfWidth + r, -halfDepth);
    return shape;
  }

  shape.moveTo(-halfWidth + r, -halfDepth);
  shape.lineTo(halfWidth - r, -halfDepth);
  shape.quadraticCurveTo(halfWidth, -halfDepth, halfWidth, -halfDepth + r);
  shape.lineTo(halfWidth, halfDepth - r);
  shape.quadraticCurveTo(halfWidth, halfDepth, halfWidth - r, halfDepth);
  shape.lineTo(-halfWidth + r, halfDepth);
  shape.quadraticCurveTo(-halfWidth, halfDepth, -halfWidth, halfDepth - r);
  shape.lineTo(-halfWidth, -halfDepth + r);
  shape.quadraticCurveTo(-halfWidth, -halfDepth, -halfWidth + r, -halfDepth);
  return shape;
}

function extrudedRoundedBox(THREE, width, depth, thickness, radius) {
  const geometry = new THREE.ExtrudeGeometry(
    roundedRectangle(THREE, width, depth, radius),
    {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: Math.min(0.035, thickness / 3),
      bevelThickness: Math.min(0.035, thickness / 3),
      curveSegments: 8,
      steps: 1,
    },
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createTray(THREE, group, materials, { width, depth, x, z, height }) {
  const floor = new THREE.Mesh(
    extrudedRoundedBox(THREE, width, depth, 0.14, 0.16),
    materials.interior,
  );
  floor.position.set(x, 0, z);
  floor.castShadow = true;
  floor.receiveShadow = true;
  group.add(floor);

  const shellShape = roundedRectangle(THREE, width, depth, 0.17);
  const innerWall = roundedRectangle(THREE, width - 0.2, depth - 0.2, 0.1, true);
  shellShape.holes.push(innerWall);
  const shellGeometry = new THREE.ExtrudeGeometry(shellShape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    curveSegments: 8,
    steps: 1,
  });
  shellGeometry.rotateX(-Math.PI / 2);

  const shell = new THREE.Mesh(shellGeometry, materials.shell);
  shell.position.set(x, 0.14, z);
  shell.castShadow = true;
  shell.receiveShadow = true;
  group.add(shell);

  const cornerOffsetX = width / 2 - 0.17;
  const cornerOffsetZ = depth / 2 - 0.17;
  for (const dx of [-cornerOffsetX, cornerOffsetX]) {
    for (const dz of [-cornerOffsetZ, cornerOffsetZ]) {
      const fastener = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 12, 8),
        materials.accent,
      );
      fastener.position.set(x + dx, 0.18 + height, z + dz);
      fastener.castShadow = true;
      group.add(fastener);
    }
  }
}

function createDemoOrganizer(THREE) {
  const group = new THREE.Group();
  const materials = {
    shell: new THREE.MeshStandardMaterial({
      color: 0x566171,
      metalness: 0.22,
      roughness: 0.38,
    }),
    interior: new THREE.MeshStandardMaterial({
      color: 0x343d49,
      metalness: 0.12,
      roughness: 0.46,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: 0xc9a227,
      metalness: 0.72,
      roughness: 0.27,
    }),
  };

  createTray(THREE, group, materials, { width: 1.55, depth: 1.5, x: -1.7, z: 0, height: 0.56 });
  createTray(THREE, group, materials, { width: 1.85, depth: 1.82, x: 0, z: 0, height: 0.78 });
  createTray(THREE, group, materials, { width: 1.55, depth: 1.5, x: 1.7, z: 0, height: 0.56 });

  group.userData.shellMaterial = materials.shell;
  group.position.y = -0.44;
  return group;
}

function createViewer(THREE, OrbitControls) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11151b);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(5.6, 4.3, 6.4);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const canvas = renderer.domElement;
  canvas.className = "modal__canvas";
  canvas.setAttribute("aria-label", "A Moduláris asztali rendszerező forgatható, nagyítható demonstrációs 3D előnézete");
  canvas.setAttribute("role", "img");
  canvas.setAttribute("tabindex", "0");

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.enablePan = false;
  controls.minDistance = 4;
  controls.maxDistance = 10;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI * 0.47;
  controls.target.set(0, 0.12, 0);
  controls.update();

  scene.add(new THREE.HemisphereLight(0xcddcff, 0x34313a, 3.4));

  const keyLight = new THREE.DirectionalLight(0xffedc1, 5.0);
  keyLight.position.set(-4, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0x4a9dff, 44, 18);
  rimLight.position.set(4, 3, -4);
  scene.add(rimLight);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x11151b, roughness: 0.88, metalness: 0.05 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.48;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(12, 24, 0x4b5360, 0x343b46);
  grid.position.y = -0.475;
  for (const material of Array.isArray(grid.material) ? grid.material : [grid.material]) {
    material.transparent = true;
    material.opacity = 0.2;
  }
  scene.add(grid);

  const organizer = createDemoOrganizer(THREE);
  organizer.traverse((object) => {
    if (object.isMesh) object.castShadow = true;
  });
  scene.add(organizer);
  const shellMaterial = organizer.userData.shellMaterial;
  if (shellMaterial) shellMaterial.color.setHex(selectedOrganizerColor);
  organizer.scale.setScalar(selectedOrganizerScale);

  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => resizeViewer());
  }

  return { scene, camera, renderer, controls, canvas, organizer, shellMaterial };
}

function setProductViewerColor(color) {
  selectedOrganizerColor = color;
  viewer?.shellMaterial.color.setHex(color);
}

function setProductViewerSize(scale) {
  selectedOrganizerScale = scale;
  viewer?.organizer.scale.setScalar(scale);
}

function resizeViewer() {
  if (!viewer || !activeContainer) return;

  const { clientWidth, clientHeight } = activeContainer;
  if (!clientWidth || !clientHeight) return;

  viewer.renderer.setSize(clientWidth, clientHeight, false);
  viewer.camera.aspect = clientWidth / clientHeight;
  viewer.camera.updateProjectionMatrix();
  viewer.renderer.render(viewer.scene, viewer.camera);
}

function renderFrame() {
  if (!viewer || !activeContainer) {
    animationFrameId = 0;
    return;
  }

  viewer.controls.update();
  viewer.renderer.render(viewer.scene, viewer.camera);
  animationFrameId = window.requestAnimationFrame(renderFrame);
}

function showFallback(container) {
  const media = container.closest(".modal__media");
  const image = media?.querySelector(".modal__image--viewer-fallback");
  let fallback = container.querySelector(".modal__viewer-fallback");
  if (!fallback) {
    fallback = document.createElement("p");
    fallback.className = "modal__viewer-fallback";
    fallback.setAttribute("role", "status");
  }
  media?.classList.remove("is-viewer-ready");
  if (image) image.hidden = false;
  fallback.textContent = "A 3D előnézet most nem érhető el. A termék képe továbbra is megtekinthető.";
  fallback.classList.add("modal__viewer-fallback--error");
  container.replaceChildren(fallback);
}

async function activateProductViewer(container) {
  if (!container || container.dataset.modelType !== DEMO_MODEL_TYPE) return;

  const token = ++activeToken;
  const media = container.closest(".modal__media");
  const image = media?.querySelector(".modal__image--viewer-fallback");
  const fallback = container.querySelector(".modal__viewer-fallback");

  try {
    const { THREE, OrbitControls } = await loadThreeModules();
    if (token !== activeToken || !container.isConnected) return;

    if (!viewer) {
      viewer = createViewer(THREE, OrbitControls);
    }

    if (activeContainer) resizeObserver.unobserve(activeContainer);
    activeContainer = container;
    activeContainer.replaceChildren(viewer.canvas);
    resizeObserver.observe(activeContainer);
    viewer.controls.enabled = true;
    media?.classList.add("is-viewer-ready");
    if (image) image.hidden = true;

    resizeViewer();
    if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
    animationFrameId = window.requestAnimationFrame(renderFrame);
  } catch (error) {
    if (token !== activeToken) return;
    threeModulesPromise = undefined;
    console.error("A termék 3D előnézete nem indítható el.", error);
    showFallback(container);
  }
}

function suspendProductViewer() {
  activeToken += 1;
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
  if (activeContainer && resizeObserver) resizeObserver.unobserve(activeContainer);
  if (viewer) viewer.controls.enabled = false;
  activeContainer = null;
}

export { activateProductViewer, setProductViewerColor, setProductViewerSize, suspendProductViewer };
