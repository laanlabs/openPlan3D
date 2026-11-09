import * as THREE from 'three';
import type { FurnitureDef } from './furnitureCatalog';
import { proceduralMountOffset } from './furnitureElevation';

// Helper to darken/lighten colors
function adjustColor(color: string, factor: number): number {
  const tempColor = new THREE.Color(color);
  tempColor.multiplyScalar(factor);
  return tempColor.getHex();
}

// Helper to create standard material
function createMaterial(color: string, roughness = 0.7, metalness = 0.1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
  });
}

// Helper to add shadow casting to all meshes in a group
function enableShadows(group: THREE.Group): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

export function createFurnitureModel(catalogId: string, def: FurnitureDef): THREE.Group {
  const group = new THREE.Group();
  const { width, depth, height, color } = def;
  
  // Convert cm to Three.js units (assuming 1 unit = 1cm)
  const w = width;
  const d = depth; 
  const h = height;

  switch (catalogId) {
    case 'stairs': {
      // Scan/import preview; building stairs remain separately editable.
      const steps = 10;
      for (let i = 0; i < steps; i++) {
        const stepHeight = h * (i + 1) / steps;
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, stepHeight, d / steps), createMaterial(color));
        mesh.position.set(0, stepHeight / 2, d / 2 - (i + 0.5) * d / steps);
        group.add(mesh);
      }
      break;
    }
    case 'sofa':
      createSofa(group, w, d, h, color);
      break;
    case 'loveseat':
      createLoveseat(group, w, d, h, color);
      break;
    case 'chair':
      createArmchair(group, w, d, h, color);
      break;
    case 'coffee_table':
      createCoffeeTable(group, w, d, h, color);
      break;
    case 'tv_stand':
      createTVStand(group, w, d, h, color);
      break;
    case 'bookshelf':
      createBookshelf(group, w, d, h, color);
      break;
    case 'side_table':
      createSideTable(group, w, d, h, color);
      break;
    case 'bed_queen':
      createBed(group, w, d, h, color, 'queen');
      break;
    case 'bed_twin':
      createBed(group, w, d, h, color, 'twin');
      break;
    case 'nightstand':
      createNightstand(group, w, d, h, color);
      break;
    case 'dresser':
      createDresser(group, w, d, h, color);
      break;
    case 'wardrobe':
      createWardrobe(group, w, d, h, color);
      break;
    case 'stove':
      createStove(group, w, d, h, color);
      break;
    case 'fridge':
      createFridge(group, w, d, h, color);
      break;
    case 'sink_k':
      createKitchenSink(group, w, d, h, color);
      break;
    case 'counter':
      createCounter(group, w, d, h, color);
      break;
    case 'dishwasher':
      createDishwasher(group, w, d, h, color);
      break;
    case 'oven':
      createOven(group, w, d, h, color);
      break;
    case 'toilet':
      createToilet(group, w, d, h, color);
      break;
    case 'bathtub':
      createBathtub(group, w, d, h, color);
      break;
    case 'shower':
      createShower(group, w, d, h, color);
      break;
    case 'sink_b':
      createBathroomSink(group, w, d, h, color);
      break;
    case 'washer_dryer':
      createWasherDryer(group, w, d, h, color);
      break;
    case 'desk':
      createDesk(group, w, d, h, color);
      break;
    case 'office_chair':
      createOfficeChair(group, w, d, h, color);
      break;
    case 'dining_table':
      createDiningTable(group, w, d, h, color);
      break;
    case 'dining_chair':
      createDiningChair(group, w, d, h, color);
      break;
    case 'fireplace':
      createFireplace(group, w, d, h, color);
      break;
    case 'television':
      createTelevision(group, w, d, h, color);
      break;
    case 'storage':
      createStorage(group, w, d, h, color);
      break;
    case 'table':
      createGenericTable(group, w, d, h, color);
      break;
    // Decor
    case 'rug':
    case 'runner_rug':
      createRug(group, w, d, h, color);
      break;
    case 'round_rug':
      createRoundRug(group, w, d, h, color);
      break;
    case 'potted_plant':
      createPottedPlant(group, w, d, h, color);
      break;
    case 'floor_plant':
      createFloorPlant(group, w, d, h, color);
      break;
    case 'hanging_plant':
      createHangingPlant(group, w, d, h, color);
      break;
    case 'curtain':
    case 'sheer_curtain':
      createCurtain(group, w, d, h, color, catalogId === 'sheer_curtain');
      break;
    case 'wall_art':
      createWallArt(group, w, d, h, color);
      break;
    case 'mirror':
      createMirror(group, w, d, h, color);
      break;
    case 'clock':
      createClock(group, w, d, h, color);
      break;
    // Lighting
    case 'ceiling_light':
      createCeilingLight(group, w, d, h, color);
      break;
    case 'chandelier':
      createChandelier(group, w, d, h, color);
      break;
    case 'recessed_light':
      createRecessedLight(group, w, d, h, color);
      break;
    case 'floor_lamp':
      createFloorLamp(group, w, d, h, color);
      break;
    case 'table_lamp':
      createTableLamp(group, w, d, h, color);
      break;
    case 'wall_sconce':
      createWallSconce(group, w, d, h, color);
      break;
    case 'pendant_light':
      createPendantLight(group, w, d, h, color);
      break;
    // Outdoor furniture
    case 'bench_outdoor':
      createBenchOutdoor(group, w, d, h, color);
      break;
    case 'picnic_table':
      createPicnicTable(group, w, d, h, color);
      break;
    case 'patio_table':
      createPatioTable(group, w, d, h, color);
      break;
    case 'patio_chair':
      createPatioChair(group, w, d, h, color);
      break;
    case 'umbrella':
      createUmbrella(group, w, d, h, color);
      break;
    case 'bbq_grill':
      createBBQGrill(group, w, d, h, color);
      break;
    case 'pergola':
      createPergola(group, w, d, h, color);
      break;
    case 'gazebo':
      createGazebo(group, w, d, h, color);
      break;
    case 'picket_fence':
      createPicketFence(group, w, d, h, color);
      break;
    case 'metal_fence':
      createMetalFence(group, w, d, h, color);
      break;
    case 'lounger':
      createLounger(group, w, d, h, color);
      break;
    case 'shed':
    case 'garden_shed':
      createGardenShed(group, w, d, h, color);
      break;
    case 'planter_box':
      createPlanterBox(group, w, d, h, color);
      break;
    case 'raised_bed':
      createRaisedBed(group, w, d, h, color);
      break;
    case 'deck_patio':
      createDeckPatio(group, w, d, h, color);
      break;
    // Pool & Spa
    case 'pool_rectangular':
    case 'pool_round':
    case 'pool_lshaped':
    case 'pool_kidney':
      createPool(group, w, d, h, color, catalogId);
      break;
    case 'hot_tub':
      createHotTub(group, w, d, h, color);
      break;
    case 'diving_board':
      createDivingBoard(group, w, d, h);
      break;
    // Garage
    case 'car_sedan':
    case 'car_suv':
      createCar(group, w, d, h, color);
      break;
    // Paths & Lawns
    case 'lawn_rect':
    case 'lawn_square':
    case 'lawn_large':
      createLawn(group, w, d, h, color);
      break;
    case 'path_straight':
    case 'path_wide':
    case 'driveway':
      createPath(group, w, d, h, color);
      break;
    case 'patio_stone':
    case 'gravel_area':
      createFlatSurface(group, w, d, h, color);
      break;
    // Outdoor Lighting
    case 'lamp_post':
    case 'lamp_post_double':
      createLampPost(group, w, d, h, color, catalogId === 'lamp_post_double');
      break;
    case 'bollard_light':
      createBollardLight(group, w, d, h, color);
      break;
    // Garden Structures
    case 'greenhouse':
    case 'greenhouse_small':
      createGreenhouse(group, w, d, h);
      break;
    case 'fountain':
      createFountain(group, w, d, h, color);
      break;
    case 'arbor':
    case 'trellis':
      createArbor(group, w, d, h, color);
      break;
    default:
      // Fallback to simple box
      const geometry = new THREE.BoxGeometry(w, h, d);
      const material = createMaterial(color);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = h / 2;
      group.add(mesh);
      break;
  }

  // Every model starts at the floor; wall and ceiling items are lifted by their elevation.
  const mount = proceduralMountOffset(catalogId, h);
  if (mount) for (const child of group.children) child.position.y -= mount;

  enableShadows(group);
  return group;
}

// Living Room furniture
function createSofa(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const baseColor = createMaterial(color);
  const darkColor = createMaterial(color, 0.7, 0.1);
  darkColor.color.multiplyScalar(0.9);

  // Main seat base
  const seatGeo = new THREE.BoxGeometry(w * 0.9, h * 0.5, d * 0.7);
  const seatMesh = new THREE.Mesh(seatGeo, baseColor);
  seatMesh.position.set(0, h * 0.25, d * 0.05);
  group.add(seatMesh);

  // Back cushions (3 bumps) — at negative Z (back/top in 2D)
  const cushionWidth = w * 0.25;
  for (let i = 0; i < 3; i++) {
    const cushionGeo = new THREE.BoxGeometry(cushionWidth, h * 0.6, d * 0.25);
    const cushionMesh = new THREE.Mesh(cushionGeo, baseColor);
    cushionMesh.position.set(-w * 0.3 + i * cushionWidth, h * 0.55, -d * 0.3);
    group.add(cushionMesh);
  }

  // Left armrest
  const armGeo = new THREE.BoxGeometry(w * 0.15, h * 0.8, d * 0.8);
  const leftArm = new THREE.Mesh(armGeo, darkColor);
  leftArm.position.set(-w * 0.425, h * 0.4, 0);
  group.add(leftArm);

  // Right armrest
  const rightArm = new THREE.Mesh(armGeo, darkColor);
  rightArm.position.set(w * 0.425, h * 0.4, 0);
  group.add(rightArm);
}

function createLoveseat(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const baseColor = createMaterial(color);
  const darkColor = createMaterial(color, 0.7, 0.1);
  darkColor.color.multiplyScalar(0.9);

  // Main seat base
  const seatGeo = new THREE.BoxGeometry(w * 0.9, h * 0.5, d * 0.7);
  const seatMesh = new THREE.Mesh(seatGeo, baseColor);
  seatMesh.position.set(0, h * 0.25, d * 0.05);
  group.add(seatMesh);

  // Back cushions (2 bumps for loveseat) — at negative Z (back/top in 2D)
  const cushionWidth = w * 0.35;
  for (let i = 0; i < 2; i++) {
    const cushionGeo = new THREE.BoxGeometry(cushionWidth, h * 0.6, d * 0.25);
    const cushionMesh = new THREE.Mesh(cushionGeo, baseColor);
    cushionMesh.position.set(-w * 0.175 + i * cushionWidth, h * 0.55, -d * 0.3);
    group.add(cushionMesh);
  }

  // Armrests
  const armGeo = new THREE.BoxGeometry(w * 0.15, h * 0.8, d * 0.8);
  const leftArm = new THREE.Mesh(armGeo, darkColor);
  leftArm.position.set(-w * 0.425, h * 0.4, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, darkColor);
  rightArm.position.set(w * 0.425, h * 0.4, 0);
  group.add(rightArm);
}

function createArmchair(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const baseColor = createMaterial(color);
  const darkColor = createMaterial(color, 0.7, 0.1);
  darkColor.color.multiplyScalar(0.9);

  // Seat
  const seatGeo = new THREE.BoxGeometry(w * 0.7, h * 0.4, d * 0.7);
  const seatMesh = new THREE.Mesh(seatGeo, baseColor);
  seatMesh.position.set(0, h * 0.2, d * 0.05);
  group.add(seatMesh);

  // Back — at negative Z (back/top in 2D)
  const backGeo = new THREE.BoxGeometry(w * 0.7, h * 0.6, d * 0.15);
  const backMesh = new THREE.Mesh(backGeo, baseColor);
  backMesh.position.set(0, h * 0.5, -d * 0.35);
  group.add(backMesh);

  // Armrests
  const armGeo = new THREE.BoxGeometry(w * 0.2, h * 0.5, d * 0.6);
  const leftArm = new THREE.Mesh(armGeo, darkColor);
  leftArm.position.set(-w * 0.35, h * 0.35, 0);
  group.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, darkColor);
  rightArm.position.set(w * 0.35, h * 0.35, 0);
  group.add(rightArm);
}

function createCoffeeTable(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const topColor = createMaterial(color);
  const legColor = createMaterial(color, 0.7, 0.1);
  legColor.color.multiplyScalar(0.8);

  // Table top
  const topGeo = new THREE.BoxGeometry(w, h * 0.2, d);
  const topMesh = new THREE.Mesh(topGeo, topColor);
  topMesh.position.set(0, h * 0.9, 0);
  group.add(topMesh);

  // 4 legs
  const legGeo = new THREE.BoxGeometry(w * 0.05, h * 0.8, d * 0.05);
  const positions = [
    [-w * 0.4, h * 0.4, -d * 0.4],
    [w * 0.4, h * 0.4, -d * 0.4],
    [-w * 0.4, h * 0.4, d * 0.4],
    [w * 0.4, h * 0.4, d * 0.4]
  ];

  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legColor);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
  });
}

function createTVStand(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const cabinetColor = createMaterial(color);
  const screenColor = createMaterial('#1a1a1a', 0.1, 0.8);

  // Cabinet base
  const cabinetGeo = new THREE.BoxGeometry(w, h * 0.8, d);
  const cabinetMesh = new THREE.Mesh(cabinetGeo, cabinetColor);
  cabinetMesh.position.set(0, h * 0.4, 0);
  group.add(cabinetMesh);

  // TV screen on top
  const screenGeo = new THREE.BoxGeometry(w * 0.7, h * 0.8, d * 0.05);
  const screenMesh = new THREE.Mesh(screenGeo, screenColor);
  screenMesh.position.set(0, h * 1.2, -d * 0.1);
  group.add(screenMesh);
}

function createBookshelf(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const shelfColor = createMaterial(color);
  const darkColor = createMaterial(color, 0.7, 0.1);
  darkColor.color.multiplyScalar(0.9);

  // Main frame
  const frameGeo = new THREE.BoxGeometry(w, h, d);
  const frameMesh = new THREE.Mesh(frameGeo, shelfColor);
  frameMesh.position.set(0, h / 2, 0);
  group.add(frameMesh);

  // 5 horizontal shelves
  const shelfThickness = h * 0.05;
  for (let i = 0; i < 5; i++) {
    const shelfGeo = new THREE.BoxGeometry(w * 0.95, shelfThickness, d * 0.9);
    const shelf = new THREE.Mesh(shelfGeo, darkColor);
    shelf.position.set(0, (i + 0.5) * (h / 5), 0);
    group.add(shelf);
  }
}

function createSideTable(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const topColor = createMaterial(color);
  const legColor = createMaterial(color, 0.7, 0.1);
  legColor.color.multiplyScalar(0.8);

  // Table top (round)
  const topGeo = new THREE.CylinderGeometry(Math.min(w, d) / 2, Math.min(w, d) / 2, h * 0.15);
  const topMesh = new THREE.Mesh(topGeo, topColor);
  topMesh.position.set(0, h * 0.925, 0);
  group.add(topMesh);

  // Central leg
  const legGeo = new THREE.CylinderGeometry(w * 0.05, w * 0.05, h * 0.85);
  const legMesh = new THREE.Mesh(legGeo, legColor);
  legMesh.position.set(0, h * 0.425, 0);
  group.add(legMesh);
}

// Bedroom furniture
function createBed(group: THREE.Group, w: number, d: number, h: number, color: string, type: 'queen' | 'twin'): void {
  const mattressColor = createMaterial(color);
  const headboardColor = createMaterial(color, 0.7, 0.1);
  headboardColor.color.multiplyScalar(0.8);
  const pillowColor = createMaterial('#ffffff', 0.9, 0.0);

  // Mattress
  const mattressGeo = new THREE.BoxGeometry(w, h, d);
  const mattressMesh = new THREE.Mesh(mattressGeo, mattressColor);
  mattressMesh.position.set(0, h / 2, 0);
  group.add(mattressMesh);

  // Headboard — at negative Z (top/back in 2D)
  const headboardGeo = new THREE.BoxGeometry(w, h * 1.8, d * 0.1);
  const headboardMesh = new THREE.Mesh(headboardGeo, headboardColor);
  headboardMesh.position.set(0, h * 0.9, -d * 0.45);
  group.add(headboardMesh);

  // Pillows — near headboard (negative Z)
  const pillowCount = type === 'queen' ? 2 : 1;
  const pillowWidth = w / (pillowCount + 1);
  for (let i = 0; i < pillowCount; i++) {
    const pillowGeo = new THREE.BoxGeometry(pillowWidth * 0.8, h * 0.4, d * 0.3);
    const pillowMesh = new THREE.Mesh(pillowGeo, pillowColor);
    const xOffset = pillowCount === 1 ? 0 : (i - 0.5) * pillowWidth;
    pillowMesh.position.set(xOffset, h * 0.7, -d * 0.25);
    group.add(pillowMesh);
  }
}

function createNightstand(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color);
  const drawerColor = createMaterial(color, 0.7, 0.1);
  drawerColor.color.multiplyScalar(0.9);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Drawer line
  const drawerGeo = new THREE.BoxGeometry(w * 0.9, h * 0.05, d * 0.02);
  const drawerMesh = new THREE.Mesh(drawerGeo, drawerColor);
  drawerMesh.position.set(0, h * 0.7, d * 0.5);
  group.add(drawerMesh);

  // Drawer handle
  const handleGeo = new THREE.BoxGeometry(w * 0.1, h * 0.03, d * 0.02);
  const handleMesh = new THREE.Mesh(handleGeo, drawerColor);
  handleMesh.position.set(0, h * 0.7, d * 0.51);
  group.add(handleMesh);
}

function createDresser(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color);
  const drawerColor = createMaterial(color, 0.7, 0.1);
  drawerColor.color.multiplyScalar(0.9);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // 4 drawer lines
  for (let i = 0; i < 4; i++) {
    const drawerY = h * (0.2 + i * 0.2);
    const drawerGeo = new THREE.BoxGeometry(w * 0.9, h * 0.03, d * 0.02);
    const drawerMesh = new THREE.Mesh(drawerGeo, drawerColor);
    drawerMesh.position.set(0, drawerY, d * 0.5);
    group.add(drawerMesh);

    // Handle
    const handleGeo = new THREE.BoxGeometry(w * 0.1, h * 0.02, d * 0.02);
    const handleMesh = new THREE.Mesh(handleGeo, drawerColor);
    handleMesh.position.set(0, drawerY, d * 0.51);
    group.add(handleMesh);
  }
}

function createWardrobe(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color);
  const doorColor = createMaterial(color, 0.7, 0.1);
  doorColor.color.multiplyScalar(0.95);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Vertical split line (2 doors)
  const splitGeo = new THREE.BoxGeometry(w * 0.02, h * 0.9, d * 0.02);
  const splitMesh = new THREE.Mesh(splitGeo, doorColor);
  splitMesh.position.set(0, h / 2, d * 0.5);
  group.add(splitMesh);

  // Door knobs
  const knobGeo = new THREE.SphereGeometry(w * 0.02);
  const knobMaterial = createMaterial('#333333', 0.3, 0.8);
  
  const leftKnob = new THREE.Mesh(knobGeo, knobMaterial);
  leftKnob.position.set(-w * 0.3, h * 0.6, d * 0.52);
  group.add(leftKnob);

  const rightKnob = new THREE.Mesh(knobGeo, knobMaterial);
  rightKnob.position.set(w * 0.3, h * 0.6, d * 0.52);
  group.add(rightKnob);
}

// Kitchen furniture
function createStove(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color, 0.5, 0.3);
  const burnerColor = createMaterial('#1a1a1a', 0.3, 0.7);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // 4 burners on top
  const burnerRadius = Math.min(w, d) * 0.12;
  const burnerGeo = new THREE.CylinderGeometry(burnerRadius, burnerRadius, h * 0.02);
  
  const positions = [
    [-w * 0.25, h, -d * 0.25],
    [w * 0.25, h, -d * 0.25],
    [-w * 0.25, h, d * 0.25],
    [w * 0.25, h, d * 0.25]
  ];

  positions.forEach(pos => {
    const burner = new THREE.Mesh(burnerGeo, burnerColor);
    burner.position.set(pos[0], pos[1], pos[2]);
    group.add(burner);
  });
}

function createFridge(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color, 0.4, 0.3);
  const handleColor = createMaterial('#333333', 0.3, 0.8);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Horizontal line splitting upper/lower
  const splitGeo = new THREE.BoxGeometry(w * 0.95, h * 0.02, d * 0.02);
  const splitMesh = new THREE.Mesh(splitGeo, handleColor);
  splitMesh.position.set(0, h * 0.7, d * 0.5);
  group.add(splitMesh);

  // Handle
  const handleGeo = new THREE.BoxGeometry(w * 0.05, h * 0.15, d * 0.03);
  const handleMesh = new THREE.Mesh(handleGeo, handleColor);
  handleMesh.position.set(w * 0.4, h * 0.8, d * 0.52);
  group.add(handleMesh);
}

function createKitchenSink(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const counterColor = createMaterial(color, 0.6, 0.2);
  const basinColor = createMaterial('#e5e7eb', 0.2, 0.7);

  // Counter base
  const counterGeo = new THREE.BoxGeometry(w, h, d);
  const counterMesh = new THREE.Mesh(counterGeo, counterColor);
  counterMesh.position.set(0, h / 2, 0);
  group.add(counterMesh);

  // Basin (oval/elliptical)
  const basinGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.3, h * 0.2, 8);
  basinGeo.scale(1, 1, 0.7); // Make it more oval
  const basinMesh = new THREE.Mesh(basinGeo, basinColor);
  basinMesh.position.set(0, h * 0.8, 0);
  group.add(basinMesh);
}

function createCounter(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color);
  const topColor = createMaterial(color, 0.5, 0.2);
  topColor.color.multiplyScalar(1.1);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h * 0.9, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h * 0.45, 0);
  group.add(bodyMesh);

  // Top surface
  const topGeo = new THREE.BoxGeometry(w, h * 0.1, d);
  const topMesh = new THREE.Mesh(topGeo, topColor);
  topMesh.position.set(0, h * 0.95, 0);
  group.add(topMesh);
}

function createDishwasher(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color, 0.4, 0.3);
  const handleColor = createMaterial('#333333', 0.3, 0.8);

  // Main body
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Horizontal handle line
  const handleGeo = new THREE.BoxGeometry(w * 0.8, h * 0.03, d * 0.02);
  const handleMesh = new THREE.Mesh(handleGeo, handleColor);
  handleMesh.position.set(0, h * 0.8, d * 0.51);
  group.add(handleMesh);
}

// Bathroom furniture
function createToilet(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const toiletColor = createMaterial('#f8fafc', 0.2, 0.1);

  // Bowl (elliptical)
  const bowlGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.35, h, 12);
  bowlGeo.scale(1, 1, 1.3); // Make it more oval
  const bowlMesh = new THREE.Mesh(bowlGeo, toiletColor);
  bowlMesh.position.set(0, h / 2, 0);
  group.add(bowlMesh);

  // Tank behind — at negative Z (back in 2D)
  const tankGeo = new THREE.BoxGeometry(w * 0.7, h * 1.8, d * 0.25);
  const tankMesh = new THREE.Mesh(tankGeo, toiletColor);
  tankMesh.position.set(0, h * 0.9, -d * 0.35);
  group.add(tankMesh);

  // Seat rim
  const seatGeo = new THREE.TorusGeometry(w * 0.35, w * 0.05, 8, 16);
  const seatMesh = new THREE.Mesh(seatGeo, toiletColor);
  seatMesh.position.set(0, h * 0.9, 0);
  seatMesh.rotation.x = -Math.PI / 2;
  group.add(seatMesh);
}

function createBathtub(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const tubColor = createMaterial('#f8fafc', 0.2, 0.1);

  // Outer shell
  const outerGeo = new THREE.BoxGeometry(w, h, d);
  const outerMesh = new THREE.Mesh(outerGeo, tubColor);
  outerMesh.position.set(0, h / 2, 0);
  group.add(outerMesh);

  // Inner hollow (smaller and lower)
  const innerColor = createMaterial('#e2e8f0', 0.3, 0.1);
  const innerGeo = new THREE.BoxGeometry(w * 0.85, h * 0.6, d * 0.85);
  const innerMesh = new THREE.Mesh(innerGeo, innerColor);
  innerMesh.position.set(0, h * 0.3, 0);
  group.add(innerMesh);
}

function createShower(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const glassColor = createMaterial('#bfdbfe', 0.1, 0.0);
  glassColor.transparent = true;
  glassColor.opacity = 0.3;

  const frameColor = createMaterial('#64748b', 0.5, 0.8);

  // Glass panels (corner enclosure)
  const panel1Geo = new THREE.BoxGeometry(w, h * 0.9, d * 0.05);
  const panel1 = new THREE.Mesh(panel1Geo, glassColor);
  panel1.position.set(0, h * 0.45, -d * 0.475);
  group.add(panel1);

  const panel2Geo = new THREE.BoxGeometry(w * 0.05, h * 0.9, d);
  const panel2 = new THREE.Mesh(panel2Geo, glassColor);
  panel2.position.set(-w * 0.475, h * 0.45, 0);
  group.add(panel2);

  // Shower head
  const headGeo = new THREE.CylinderGeometry(w * 0.05, w * 0.05, h * 0.02);
  const headMesh = new THREE.Mesh(headGeo, frameColor);
  headMesh.position.set(-w * 0.3, h * 0.85, -d * 0.3);
  group.add(headMesh);
}

function createBathroomSink(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const sinkColor = createMaterial('#f8fafc', 0.2, 0.1);

  // Pedestal
  const pedestalGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.35, h * 0.8);
  const pedestalMesh = new THREE.Mesh(pedestalGeo, sinkColor);
  pedestalMesh.position.set(0, h * 0.4, 0);
  group.add(pedestalMesh);

  // Basin on top
  const basinGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.35, h * 0.15);
  const basinMesh = new THREE.Mesh(basinGeo, sinkColor);
  basinMesh.position.set(0, h * 0.875, 0);
  group.add(basinMesh);
}

// Office furniture
function createDesk(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const topColor = createMaterial(color);
  const legColor = createMaterial(color, 0.7, 0.1);
  legColor.color.multiplyScalar(0.8);

  // Desktop
  const topGeo = new THREE.BoxGeometry(w, h * 0.1, d);
  const topMesh = new THREE.Mesh(topGeo, topColor);
  topMesh.position.set(0, h * 0.95, 0);
  group.add(topMesh);

  // 4 legs
  const legGeo = new THREE.BoxGeometry(w * 0.04, h * 0.9, d * 0.04);
  const positions = [
    [-w * 0.45, h * 0.45, -d * 0.45],
    [w * 0.45, h * 0.45, -d * 0.45],
    [-w * 0.45, h * 0.45, d * 0.45],
    [w * 0.45, h * 0.45, d * 0.45]
  ];

  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legColor);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
  });
}

function createOfficeChair(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const seatColor = createMaterial(color);
  const baseColor = createMaterial('#333333', 0.5, 0.8);

  // Seat
  const seatGeo = new THREE.CylinderGeometry(w * 0.4, w * 0.4, h * 0.1);
  const seatMesh = new THREE.Mesh(seatGeo, seatColor);
  seatMesh.position.set(0, h * 0.5, 0);
  group.add(seatMesh);

  // Backrest — at negative Z (back in 2D)
  const backGeo = new THREE.BoxGeometry(w * 0.7, h * 0.4, d * 0.1);
  const backMesh = new THREE.Mesh(backGeo, seatColor);
  backMesh.position.set(0, h * 0.7, -d * 0.35);
  group.add(backMesh);

  // Central pedestal
  const pedestalGeo = new THREE.CylinderGeometry(w * 0.05, w * 0.05, h * 0.4);
  const pedestalMesh = new THREE.Mesh(pedestalGeo, baseColor);
  pedestalMesh.position.set(0, h * 0.2, 0);
  group.add(pedestalMesh);

  // Base (simplified as cylinder)
  const baseGeo = new THREE.CylinderGeometry(w * 0.35, w * 0.35, h * 0.05);
  const baseMesh = new THREE.Mesh(baseGeo, baseColor);
  baseMesh.position.set(0, h * 0.025, 0);
  group.add(baseMesh);
}

// Dining furniture
function createDiningTable(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const topColor = createMaterial(color);
  const legColor = createMaterial(color, 0.7, 0.1);
  legColor.color.multiplyScalar(0.8);

  // Table top
  const topGeo = new THREE.BoxGeometry(w, h * 0.1, d);
  const topMesh = new THREE.Mesh(topGeo, topColor);
  topMesh.position.set(0, h * 0.95, 0);
  group.add(topMesh);

  // 4 legs
  const legGeo = new THREE.BoxGeometry(w * 0.05, h * 0.9, d * 0.05);
  const positions = [
    [-w * 0.4, h * 0.45, -d * 0.35],
    [w * 0.4, h * 0.45, -d * 0.35],
    [-w * 0.4, h * 0.45, d * 0.35],
    [w * 0.4, h * 0.45, d * 0.35]
  ];

  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legColor);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
  });
}

function createDiningChair(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const seatColor = createMaterial(color);
  const legColor = createMaterial(color, 0.7, 0.1);
  legColor.color.multiplyScalar(0.8);

  const seatGeo = new THREE.BoxGeometry(w * 0.9, h * 0.1, d * 0.9);
  const seatMesh = new THREE.Mesh(seatGeo, seatColor);
  seatMesh.position.set(0, h * 0.5, 0);
  group.add(seatMesh);

  const backGeo = new THREE.BoxGeometry(w * 0.9, h * 0.4, d * 0.1);
  const backMesh = new THREE.Mesh(backGeo, seatColor);
  backMesh.position.set(0, h * 0.7, -d * 0.4);
  group.add(backMesh);

  const legGeo = new THREE.BoxGeometry(w * 0.05, h * 0.5, d * 0.05);
  const positions = [
    [-w * 0.35, h * 0.25, -d * 0.35],
    [w * 0.35, h * 0.25, -d * 0.35],
    [-w * 0.35, h * 0.25, d * 0.35],
    [w * 0.35, h * 0.25, d * 0.35]
  ];
  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legColor);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
  });
}

// RoomPlan-specific furniture
function createOven(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color, 0.5, 0.3);
  const glassColor = createMaterial('#1a1a1a', 0.1, 0.5);
  glassColor.transparent = true;
  glassColor.opacity = 0.7;

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Oven door window
  const windowGeo = new THREE.BoxGeometry(w * 0.7, h * 0.4, d * 0.02);
  const windowMesh = new THREE.Mesh(windowGeo, glassColor);
  windowMesh.position.set(0, h * 0.4, d * 0.51);
  group.add(windowMesh);

  // Handle
  const handleColor = createMaterial('#333', 0.3, 0.8);
  const handleGeo = new THREE.BoxGeometry(w * 0.6, h * 0.03, d * 0.03);
  const handleMesh = new THREE.Mesh(handleGeo, handleColor);
  handleMesh.position.set(0, h * 0.75, d * 0.52);
  group.add(handleMesh);
}

function createWasherDryer(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color, 0.4, 0.3);
  const drumColor = createMaterial('#e2e8f0', 0.2, 0.5);

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Drum circle on front
  const drumGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.3, d * 0.02, 24);
  drumGeo.rotateX(Math.PI / 2);
  const drumMesh = new THREE.Mesh(drumGeo, drumColor);
  drumMesh.position.set(0, h * 0.45, d * 0.51);
  group.add(drumMesh);

  // Control panel
  const panelColor = createMaterial('#94a3b8', 0.3, 0.2);
  const panelGeo = new THREE.BoxGeometry(w * 0.8, h * 0.12, d * 0.02);
  const panelMesh = new THREE.Mesh(panelGeo, panelColor);
  panelMesh.position.set(0, h * 0.85, d * 0.51);
  group.add(panelMesh);
}

function createFireplace(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mantelColor = createMaterial(color, 0.8, 0.1);
  const fireboxColor = createMaterial('#1a1a1a', 0.9, 0.0);

  // Mantel surround
  const mantelGeo = new THREE.BoxGeometry(w, h, d);
  const mantelMesh = new THREE.Mesh(mantelGeo, mantelColor);
  mantelMesh.position.set(0, h / 2, 0);
  group.add(mantelMesh);

  // Firebox opening (carved out front)
  const openingGeo = new THREE.BoxGeometry(w * 0.6, h * 0.55, d * 0.7);
  const openingMesh = new THREE.Mesh(openingGeo, fireboxColor);
  openingMesh.position.set(0, h * 0.3, d * 0.2);
  group.add(openingMesh);

  // Mantel shelf on top
  const shelfGeo = new THREE.BoxGeometry(w * 1.1, h * 0.08, d * 1.1);
  const shelfMesh = new THREE.Mesh(shelfGeo, mantelColor);
  shelfMesh.position.set(0, h * 0.96, 0);
  group.add(shelfMesh);

  // Fire glow light
  const light = new THREE.PointLight(0xff6600, 0.4, 200);
  light.position.set(0, h * 0.3, d * 0.3);
  group.add(light);
}

function createTelevision(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const screenColor = createMaterial(color, 0.1, 0.8);
  const bezelColor = createMaterial('#111', 0.3, 0.5);

  // Screen panel
  const screenGeo = new THREE.BoxGeometry(w, h, d);
  const screenMesh = new THREE.Mesh(screenGeo, bezelColor);
  screenMesh.position.set(0, h / 2 + 80, 0); // Mounted at ~80cm
  group.add(screenMesh);

  // Screen face
  const faceGeo = new THREE.BoxGeometry(w - 4, h - 4, 1);
  const faceMat = createMaterial('#222', 0.05, 0.9);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.position.set(0, h / 2 + 80, d * 0.45);
  group.add(faceMesh);
}

function createStorage(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyColor = createMaterial(color);
  const doorColor = createMaterial(color, 0.7, 0.1);
  doorColor.color.multiplyScalar(0.95);

  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyColor);
  bodyMesh.position.set(0, h / 2, 0);
  group.add(bodyMesh);

  // Two doors
  const splitGeo = new THREE.BoxGeometry(w * 0.02, h * 0.9, d * 0.02);
  const splitMesh = new THREE.Mesh(splitGeo, doorColor);
  splitMesh.position.set(0, h / 2, d * 0.5);
  group.add(splitMesh);

  // Shelf line
  const shelfGeo = new THREE.BoxGeometry(w * 0.95, h * 0.02, d * 0.9);
  const shelfMesh = new THREE.Mesh(shelfGeo, doorColor);
  shelfMesh.position.set(0, h * 0.5, 0);
  group.add(shelfMesh);

  // Knobs
  const knobGeo = new THREE.SphereGeometry(w * 0.02);
  const knobMat = createMaterial('#333', 0.3, 0.8);
  const leftKnob = new THREE.Mesh(knobGeo, knobMat);
  leftKnob.position.set(-w * 0.15, h * 0.5, d * 0.52);
  group.add(leftKnob);
  const rightKnob = new THREE.Mesh(knobGeo, knobMat);
  rightKnob.position.set(w * 0.15, h * 0.5, d * 0.52);
  group.add(rightKnob);
}

function createGenericTable(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const topColor = createMaterial(color);
  const legColor = createMaterial(color, 0.7, 0.1);
  legColor.color.multiplyScalar(0.8);

  const topGeo = new THREE.BoxGeometry(w, h * 0.1, d);
  const topMesh = new THREE.Mesh(topGeo, topColor);
  topMesh.position.set(0, h * 0.95, 0);
  group.add(topMesh);

  const legGeo = new THREE.BoxGeometry(w * 0.05, h * 0.9, d * 0.05);
  const positions = [
    [-w * 0.42, h * 0.45, -d * 0.42],
    [w * 0.42, h * 0.45, -d * 0.42],
    [-w * 0.42, h * 0.45, d * 0.42],
    [w * 0.42, h * 0.45, d * 0.42]
  ];
  positions.forEach(pos => {
    const leg = new THREE.Mesh(legGeo, legColor);
    leg.position.set(pos[0], pos[1], pos[2]);
    group.add(leg);
  });
}

// Decor furniture
function createRug(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.95, 0.0);
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;
  mesh.receiveShadow = true;
  group.add(mesh);
  // Border
  const borderMat = createMaterial(color, 0.9, 0.0);
  borderMat.color.multiplyScalar(0.7);
  const borderGeo = new THREE.BoxGeometry(w + 2, h * 0.5, d + 2);
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.y = h * 0.25;
  group.add(borderMesh);
}

function createRoundRug(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.95, 0.0);
  const r = Math.min(w, d) / 2;
  const geo = new THREE.CylinderGeometry(r, r, h, 32);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = h / 2;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function createPottedPlant(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const potMat = createMaterial('#8B6914', 0.8, 0.1);
  const potGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.25, h * 0.4, 12);
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.position.y = h * 0.2;
  group.add(potMesh);
  // Foliage
  const leafMat = createMaterial(color, 0.9, 0.0);
  const leafGeo = new THREE.SphereGeometry(w * 0.4, 12, 12);
  const leafMesh = new THREE.Mesh(leafGeo, leafMat);
  leafMesh.position.y = h * 0.65;
  group.add(leafMesh);
}

function createFloorPlant(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const potMat = createMaterial('#6b4423', 0.8, 0.1);
  const potGeo = new THREE.CylinderGeometry(w * 0.25, w * 0.2, h * 0.25, 12);
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.position.y = h * 0.125;
  group.add(potMesh);
  // Trunk
  const trunkMat = createMaterial('#5d4037', 0.9, 0.0);
  const trunkGeo = new THREE.CylinderGeometry(w * 0.04, w * 0.05, h * 0.5, 8);
  const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
  trunkMesh.position.y = h * 0.5;
  group.add(trunkMesh);
  // Foliage cluster
  const leafMat = createMaterial(color, 0.9, 0.0);
  for (let i = 0; i < 3; i++) {
    const r = w * (0.2 + i * 0.05);
    const geo = new THREE.SphereGeometry(r, 10, 10);
    const mesh = new THREE.Mesh(geo, leafMat);
    mesh.position.set((i - 1) * w * 0.1, h * 0.75 + i * h * 0.05, 0);
    group.add(mesh);
  }
}

function createHangingPlant(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const potMat = createMaterial('#8B6914', 0.8, 0.1);
  const potGeo = new THREE.CylinderGeometry(w * 0.25, w * 0.2, h * 0.3, 10);
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.position.y = h * 0.85;
  group.add(potMesh);
  // Trailing foliage
  const leafMat = createMaterial(color, 0.9, 0.0);
  const leafGeo = new THREE.SphereGeometry(w * 0.35, 10, 10);
  leafGeo.scale(1, 1.5, 1);
  const leafMesh = new THREE.Mesh(leafGeo, leafMat);
  leafMesh.position.y = h * 0.5;
  group.add(leafMesh);
}

function createCurtain(group: THREE.Group, w: number, d: number, h: number, color: string, sheer: boolean): void {
  const mat = createMaterial(color, 0.95, 0.0);
  if (sheer) { mat.transparent = true; mat.opacity = 0.5; }
  // Two panels
  for (const side of [-1, 1]) {
    const panelGeo = new THREE.BoxGeometry(w * 0.45, h, d);
    const panel = new THREE.Mesh(panelGeo, mat);
    panel.position.set(side * w * 0.275, h / 2, 0);
    group.add(panel);
  }
  // Rod
  const rodMat = createMaterial('#555', 0.3, 0.8);
  const rodGeo = new THREE.CylinderGeometry(1.5, 1.5, w * 1.1, 8);
  rodGeo.rotateZ(Math.PI / 2);
  const rod = new THREE.Mesh(rodGeo, rodMat);
  rod.position.y = h * 0.98;
  group.add(rod);
}

function createWallArt(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const frameMat = createMaterial('#333', 0.6, 0.2);
  const frameGeo = new THREE.BoxGeometry(w, h, d);
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.y = h / 2 + 120; // Hung at ~120cm
  group.add(frameMesh);
  // Canvas
  const canvasMat = createMaterial(color, 0.9, 0.0);
  const canvasGeo = new THREE.BoxGeometry(w - 4, h - 4, d * 0.5);
  const canvasMesh = new THREE.Mesh(canvasGeo, canvasMat);
  canvasMesh.position.set(0, h / 2 + 120, d * 0.3);
  group.add(canvasMesh);
}

function createMirror(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const frameMat = createMaterial('#555', 0.5, 0.3);
  const frameGeo = new THREE.BoxGeometry(w, h, d);
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.y = h / 2 + 100;
  group.add(frameMesh);
  const glassMat = createMaterial('#e0e8f0', 0.05, 0.9);
  const glassGeo = new THREE.BoxGeometry(w - 4, h - 4, 1);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, h / 2 + 100, d * 0.4);
  group.add(glassMesh);
}

function createClock(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.6, 0.2);
  const r = Math.min(w, d) / 2;
  const geo = new THREE.CylinderGeometry(r, r, d, 24);
  geo.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = r + 140;
  group.add(mesh);
  // Face
  const faceMat = createMaterial('#fff', 0.9, 0.0);
  const faceGeo = new THREE.CylinderGeometry(r * 0.9, r * 0.9, 1, 24);
  faceGeo.rotateX(Math.PI / 2);
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, r + 140, d * 0.4);
  group.add(face);
}

// Lighting fixtures
function createCeilingLight(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.3, 0.1);
  const r = Math.min(w, d) / 2;
  const geo = new THREE.CylinderGeometry(r, r * 0.8, h, 24);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 260 - h / 2; // Mounted on ceiling
  group.add(mesh);
  // Add actual light
  const light = new THREE.PointLight(0xfff5e0, 0.8, 500);
  light.position.y = 260 - h;
  light.castShadow = true;
  group.add(light);
}

function createChandelier(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.3, 0.5);
  // Central body
  const bodyGeo = new THREE.SphereGeometry(w * 0.15, 12, 12);
  const body = new THREE.Mesh(bodyGeo, mat);
  body.position.y = 260 - h * 0.5;
  group.add(body);
  // Arms with bulbs
  const armMat = createMaterial('#888', 0.3, 0.8);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const r = w * 0.35;
    const armGeo = new THREE.CylinderGeometry(1.5, 1.5, r, 6);
    armGeo.rotateZ(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(Math.cos(a) * r * 0.5, 260 - h * 0.5, Math.sin(a) * r * 0.5);
    arm.rotation.y = -a;
    group.add(arm);
    // Bulb
    const bulbGeo = new THREE.SphereGeometry(4, 8, 8);
    const bulbMat = createMaterial('#fffde0', 0.1, 0.0);
    bulbMat.emissive = new THREE.Color(0xfff5c0);
    bulbMat.emissiveIntensity = 0.5;
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(Math.cos(a) * r, 260 - h * 0.6, Math.sin(a) * r);
    group.add(bulb);
  }
  // Light
  const light = new THREE.PointLight(0xfff5e0, 1.2, 800);
  light.position.y = 260 - h;
  light.castShadow = true;
  group.add(light);
}

function createRecessedLight(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.2, 0.1);
  const r = Math.min(w, d) / 2;
  const geo = new THREE.CylinderGeometry(r, r, h, 16);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 260 - h / 2;
  group.add(mesh);
  const light = new THREE.SpotLight(0xfff5e0, 0.6, 400, Math.PI / 4, 0.5);
  light.position.y = 258;
  light.target.position.set(0, 0, 0);
  group.add(light);
  group.add(light.target);
}

function createFloorLamp(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  // Base
  const baseMat = createMaterial('#333', 0.5, 0.8);
  const baseGeo = new THREE.CylinderGeometry(w * 0.25, w * 0.3, 5, 16);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 2.5;
  group.add(base);
  // Pole
  const poleGeo = new THREE.CylinderGeometry(2, 2, h * 0.85, 8);
  const pole = new THREE.Mesh(poleGeo, baseMat);
  pole.position.y = h * 0.425 + 5;
  group.add(pole);
  // Shade
  const shadeMat = createMaterial(color, 0.9, 0.0);
  const shadeGeo = new THREE.CylinderGeometry(w * 0.3, w * 0.2, h * 0.15, 16, 1, true);
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.y = h * 0.925;
  group.add(shade);
  const light = new THREE.PointLight(0xfff5e0, 0.5, 300);
  light.position.y = h * 0.9;
  group.add(light);
}

function createTableLamp(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const baseMat = createMaterial('#555', 0.5, 0.5);
  const baseGeo = new THREE.CylinderGeometry(w * 0.2, w * 0.25, h * 0.15, 12);
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = h * 0.075;
  group.add(base);
  const poleGeo = new THREE.CylinderGeometry(1.5, 1.5, h * 0.5, 8);
  const pole = new THREE.Mesh(poleGeo, baseMat);
  pole.position.y = h * 0.4;
  group.add(pole);
  const shadeMat = createMaterial(color, 0.9, 0.0);
  const shadeGeo = new THREE.CylinderGeometry(w * 0.35, w * 0.45, h * 0.35, 16, 1, true);
  const shade = new THREE.Mesh(shadeGeo, shadeMat);
  shade.position.y = h * 0.825;
  group.add(shade);
  const light = new THREE.PointLight(0xfff5e0, 0.3, 200);
  light.position.y = h * 0.8;
  group.add(light);
}

function createWallSconce(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color, 0.5, 0.2);
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 180; // Mounted at 180cm
  group.add(mesh);
  const light = new THREE.PointLight(0xfff5e0, 0.3, 200);
  light.position.y = 180;
  group.add(light);
}

function createPendantLight(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  // Wire
  const wireMat = createMaterial('#333', 0.3, 0.8);
  const wireGeo = new THREE.CylinderGeometry(0.5, 0.5, 60, 4);
  const wire = new THREE.Mesh(wireGeo, wireMat);
  wire.position.y = 260 - 30;
  group.add(wire);
  // Shade
  const mat = createMaterial(color, 0.5, 0.2);
  const r = Math.min(w, d) / 2;
  const shadeGeo = new THREE.CylinderGeometry(r * 0.3, r, h, 16, 1, true);
  const shade = new THREE.Mesh(shadeGeo, mat);
  shade.position.y = 260 - 60 - h / 2;
  group.add(shade);
  const light = new THREE.PointLight(0xfff5e0, 0.6, 400);
  light.position.y = 260 - 60 - h;
  light.castShadow = true;
  group.add(light);
}

// ============ Outdoor Furniture ============

const WOOD_BROWN = '#8B6914';
const WOOD_DARK = '#5C4033';
const METAL_GRAY = '#707070';
const METAL_DARK = '#404040';
const FABRIC_RED = '#C0392B';
const PLANTER_BROWN = '#6B4226';

function createBenchOutdoor(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const wood = createMaterial(color || WOOD_BROWN, 0.8, 0.05);
  const seatH = 3; const seatY = h * 0.45;
  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w, seatH, d * 0.6), wood);
  seat.position.set(0, seatY, -d * 0.1);
  group.add(seat);
  // Back rest
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.45, 2), wood);
  back.position.set(0, seatY + h * 0.25, -d * 0.35);
  group.add(back);
  // Two side supports
  const supportMat = createMaterial(WOOD_DARK, 0.8, 0.05);
  for (const side of [-1, 1]) {
    const support = new THREE.Mesh(new THREE.BoxGeometry(3, seatY, d * 0.7), supportMat);
    support.position.set(side * (w / 2 - 3), seatY / 2, -d * 0.05);
    group.add(support);
  }
}

function createPicnicTable(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const wood = createMaterial(color || WOOD_BROWN, 0.8, 0.05);
  const tableTop = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d * 0.4), wood);
  tableTop.position.set(0, h, 0);
  group.add(tableTop);
  // Bench seats
  for (const side of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d * 0.2), wood);
    bench.position.set(0, h * 0.55, side * d * 0.35);
    group.add(bench);
  }
  // A-frame legs
  const legMat = createMaterial(WOOD_DARK, 0.8, 0.05);
  for (const xSide of [-1, 1]) {
    for (const zSide of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(3, h * 1.1, 3), legMat);
      leg.position.set(xSide * (w * 0.35), h * 0.5, zSide * d * 0.25);
      leg.rotation.z = xSide * zSide * 0.15;
      group.add(leg);
    }
  }
}

function createPatioTable(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || METAL_GRAY, 0.4, 0.6);
  const r = Math.min(w, d) / 2;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 3, 16), mat);
  top.position.y = h;
  group.add(top);
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, h, 8), mat);
  leg.position.y = h / 2;
  group.add(leg);
}

function createPatioChair(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || METAL_GRAY, 0.4, 0.5);
  const seatY = h * 0.45; const seatH = 2;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, seatH, d * 0.8), mat);
  seat.position.set(0, seatY, d * 0.05);
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, h * 0.5, 2), mat);
  back.position.set(0, seatY + h * 0.28, -d * 0.35);
  group.add(back);
  const legR = 1.5;
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR, seatY, 6), mat);
      leg.position.set(x * (w * 0.35), seatY / 2, z * (d * 0.3));
      group.add(leg);
    }
  }
}

function createUmbrella(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const poleMat = createMaterial(METAL_GRAY, 0.3, 0.7);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, h, 8), poleMat);
  pole.position.y = h / 2;
  group.add(pole);
  const canopyMat = createMaterial(color || FABRIC_RED, 0.9, 0.0);
  const r = Math.min(w, d) / 2;
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(r, h * 0.2, 8, 1, true), canopyMat);
  canopy.position.y = h * 0.92;
  group.add(canopy);
}

function createBBQGrill(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyMat = createMaterial(color || METAL_DARK, 0.4, 0.6);
  const bodyH = h * 0.4;
  const bodyY = h * 0.55;
  const body = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, bodyH, d * 0.7), bodyMat);
  body.position.set(0, bodyY, 0);
  group.add(body);
  // Lid
  const lid = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 3, d * 0.7), bodyMat);
  lid.position.set(0, bodyY + bodyH / 2 + 1.5, 0);
  group.add(lid);
  // 4 legs
  const legMat = createMaterial(METAL_GRAY, 0.3, 0.7);
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, bodyY - bodyH / 2, 6), legMat);
      leg.position.set(x * (w * 0.35), (bodyY - bodyH / 2) / 2, z * (d * 0.25));
      group.add(leg);
    }
  }
}

function createPergola(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const wood = createMaterial(color || WOOD_BROWN, 0.8, 0.05);
  const postW = Math.max(5, w * 0.04);
  // 4 posts
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(postW, h, postW), wood);
      post.position.set(x * (w / 2 - postW), h / 2, z * (d / 2 - postW));
      group.add(post);
    }
  }
  // Cross beams along width
  const beamH = Math.max(3, h * 0.05);
  const numBeams = Math.max(3, Math.round(d / 30));
  for (let i = 0; i < numBeams; i++) {
    const zPos = -d / 2 + postW + (i / (numBeams - 1)) * (d - 2 * postW);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w, beamH, postW * 0.6), wood);
    beam.position.set(0, h - beamH / 2, zPos);
    group.add(beam);
  }
  // Side beams
  for (const x of [-1, 1]) {
    const sideBeam = new THREE.Mesh(new THREE.BoxGeometry(postW * 0.6, beamH, d), wood);
    sideBeam.position.set(x * (w / 2 - postW), h - beamH / 2, 0);
    group.add(sideBeam);
  }
}

function createGazebo(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const wood = createMaterial(color || WOOD_BROWN, 0.8, 0.05);
  const r = Math.min(w, d) / 2;
  const postW = Math.max(4, r * 0.08);
  const numPosts = 6;
  // Posts in circle
  for (let i = 0; i < numPosts; i++) {
    const angle = (i / numPosts) * Math.PI * 2;
    const post = new THREE.Mesh(new THREE.BoxGeometry(postW, h * 0.8, postW), wood);
    post.position.set(Math.cos(angle) * (r - postW), h * 0.4, Math.sin(angle) * (r - postW));
    group.add(post);
  }
  // Cone roof
  const roofMat = createMaterial('#8B4513', 0.8, 0.05);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.1, h * 0.3, numPosts), roofMat);
  roof.position.y = h * 0.8 + h * 0.15;
  group.add(roof);
}

function createPicketFence(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const wood = createMaterial(color || '#F5F5DC', 0.8, 0.05);
  const picketW = 3; const picketGap = 5; const railH = 3;
  // Rails
  for (const yFrac of [0.3, 0.75]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, railH, d), wood);
    rail.position.set(0, h * yFrac, 0);
    group.add(rail);
  }
  // Pickets
  const numPickets = Math.max(2, Math.floor(w / (picketW + picketGap)));
  const totalSpan = (numPickets - 1) * (picketW + picketGap);
  for (let i = 0; i < numPickets; i++) {
    const xPos = -totalSpan / 2 + i * (picketW + picketGap);
    const picket = new THREE.Mesh(new THREE.BoxGeometry(picketW, h, d), wood);
    picket.position.set(xPos, h / 2, 0);
    group.add(picket);
  }
}

function createMetalFence(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const metal = createMaterial(color || METAL_DARK, 0.3, 0.7);
  const barR = 1; const barGap = 8;
  // Top and bottom rails
  for (const yFrac of [0.05, 0.95]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(w, 2, d), metal);
    rail.position.set(0, h * yFrac, 0);
    group.add(rail);
  }
  // Vertical bars
  const numBars = Math.max(2, Math.floor(w / barGap));
  const totalSpan = (numBars - 1) * barGap;
  for (let i = 0; i < numBars; i++) {
    const xPos = -totalSpan / 2 + i * barGap;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(barR, barR, h, 6), metal);
    bar.position.set(xPos, h / 2, 0);
    group.add(bar);
  }
}

function createLounger(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || WOOD_BROWN, 0.6, 0.2);
  // Flat seat
  const seatLen = d * 0.65;
  const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 3, seatLen), mat);
  seat.position.set(0, h * 0.35, d * 0.1);
  group.add(seat);
  // Angled back
  const backLen = d * 0.35;
  const back = new THREE.Mesh(new THREE.BoxGeometry(w, 3, backLen), mat);
  back.position.set(0, h * 0.55, -d * 0.3);
  back.rotation.x = -0.5;
  group.add(back);
  // Frame legs
  const legMat = createMaterial(METAL_GRAY, 0.3, 0.7);
  for (const x of [-1, 1]) {
    for (const z of [-0.3, 0.35]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, h * 0.35, 6), legMat);
      leg.position.set(x * (w * 0.4), h * 0.175, z * d);
      group.add(leg);
    }
  }
}

function createGardenShed(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const wallMat = createMaterial(color || '#A0522D', 0.8, 0.05);
  const wallH = h * 0.7;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
  walls.position.y = wallH / 2;
  group.add(walls);
  // Triangular roof using a prism (extruded triangle)
  const roofMat = createMaterial('#654321', 0.8, 0.05);
  const roofH = h * 0.3;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, 0);
  shape.lineTo(w / 2, 0);
  shape.lineTo(0, roofH);
  shape.closePath();
  const extrudeSettings = { depth: d, bevelEnabled: false };
  const roofGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.set(0, wallH, -d / 2);
  group.add(roof);
}

function createPlanterBox(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || PLANTER_BROWN, 0.85, 0.05);
  const thick = 2;
  // 4 walls, no top
  const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), mat);
  front.position.set(0, h / 2, d / 2);
  group.add(front);
  const backW = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), mat);
  backW.position.set(0, h / 2, -d / 2);
  group.add(backW);
  const left = new THREE.Mesh(new THREE.BoxGeometry(thick, h, d), mat);
  left.position.set(-w / 2, h / 2, 0);
  group.add(left);
  const right = new THREE.Mesh(new THREE.BoxGeometry(thick, h, d), mat);
  right.position.set(w / 2, h / 2, 0);
  group.add(right);
  // Bottom
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, thick, d), mat);
  bottom.position.set(0, thick / 2, 0);
  group.add(bottom);
  // Soil fill
  const soil = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * thick, h * 0.6, d - 2 * thick), createMaterial('#3E2723', 0.95, 0.0));
  soil.position.set(0, h * 0.3, 0);
  group.add(soil);
}

function createRaisedBed(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  // Same as planter but uses the provided (wider/lower) dimensions
  createPlanterBox(group, w, d, h, color || '#7B5B3A');
}

// --- Pool & Spa ---
function createPool(group: THREE.Group, w: number, d: number, h: number, color: string, type: string): void {
  const waterMat = createMaterial(color || '#0ea5e9', 0.3, 0.1);
  (waterMat as THREE.MeshStandardMaterial).transparent = true;
  (waterMat as THREE.MeshStandardMaterial).opacity = 0.7;
  const rimMat = createMaterial('#d6d3d1', 0.9, 0.0);
  const rimH = 8;
  if (type === 'pool_round' || type === 'pool_kidney') {
    const rx = w / 2, rz = d / 2;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(rx, rx, h, 32), waterMat);
    water.position.y = h / 2;
    group.add(water);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(rx, rimH / 2, 8, 32), rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = h;
    group.add(rim);
  } else {
    const water = new THREE.Mesh(new THREE.BoxGeometry(w - 16, h, d - 16), waterMat);
    water.position.y = h / 2;
    group.add(water);
    // Rim (4 edges)
    const addRim = (rx: number, rz: number, rw: number, rd: number) => {
      const r = new THREE.Mesh(new THREE.BoxGeometry(rw, rimH, rd), rimMat);
      r.position.set(rx, h + rimH / 2, rz);
      group.add(r);
    };
    addRim(0, -d / 2, w, rimH); addRim(0, d / 2, w, rimH);
    addRim(-w / 2, 0, rimH, d); addRim(w / 2, 0, rimH, d);
  }
}

function createHotTub(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#0284c7', 0.4, 0.1);
  (mat as THREE.MeshStandardMaterial).transparent = true;
  (mat as THREE.MeshStandardMaterial).opacity = 0.7;
  const wallMat = createMaterial('#78716c', 0.9, 0.0);
  const r = w / 2;
  // Outer shell
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), wallMat);
  outer.position.y = h / 2;
  group.add(outer);
  // Water inside
  const water = new THREE.Mesh(new THREE.CylinderGeometry(r - 5, r - 5, h - 5, 24), mat);
  water.position.y = h / 2 + 2.5;
  group.add(water);
}

function createDivingBoard(group: THREE.Group, w: number, d: number, h: number): void {
  const baseMat = createMaterial('#94a3b8', 0.7, 0.2);
  const boardMat = createMaterial('#e2e8f0', 0.6, 0.1);
  // Support base
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.7, 30), baseMat);
  base.position.set(0, h * 0.35, -d / 2 + 15);
  group.add(base);
  // Board
  const board = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 3, d), boardMat);
  board.position.set(0, h * 0.7, 0);
  group.add(board);
}

// --- Garage ---
function createCar(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const bodyMat = createMaterial(color || '#475569', 0.4, 0.5);
  const glassMat = createMaterial('#bfdbfe', 0.2, 0.6);
  (glassMat as THREE.MeshStandardMaterial).transparent = true;
  (glassMat as THREE.MeshStandardMaterial).opacity = 0.5;
  const wheelMat = createMaterial('#1e1e1e', 0.9, 0.0);
  // Body
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.4, d * 0.8), bodyMat);
  body.position.set(0, h * 0.2, 0);
  group.add(body);
  // Cabin
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, h * 0.35, d * 0.45), glassMat);
  cabin.position.set(0, h * 0.575, -d * 0.05);
  group.add(cabin);
  // Wheels (4)
  const wheelR = h * 0.15;
  const positions = [
    [-w / 2, wheelR, -d * 0.3], [w / 2, wheelR, -d * 0.3],
    [-w / 2, wheelR, d * 0.3], [w / 2, wheelR, d * 0.3]
  ];
  for (const [x, y, z] of positions) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 8, 12), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
  }
}

// --- Paths & Lawns ---
function createLawn(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#22c55e', 0.95, 0.0);
  const lawn = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  lawn.position.y = h / 2;
  group.add(lawn);
}

function createPath(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#a8a29e', 0.85, 0.0);
  const path = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  path.position.y = h / 2;
  group.add(path);
}

function createFlatSurface(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#d6d3d1', 0.9, 0.0);
  const surface = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  surface.position.y = h / 2;
  group.add(surface);
}

// --- Outdoor Lighting ---
function createLampPost(group: THREE.Group, w: number, d: number, h: number, color: string, isDouble: boolean): void {
  const poleMat = createMaterial(color || '#1e293b', 0.7, 0.3);
  const lightMat = createMaterial('#fbbf24', 0.3, 0.1);
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, h * 0.85, 8), poleMat);
  pole.position.y = h * 0.425;
  group.add(pole);
  // Lamp head(s)
  const addLamp = (offsetX: number) => {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 25, 6), poleMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(offsetX / 2, h * 0.85, 0);
    group.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), lightMat);
    lamp.position.set(offsetX, h * 0.9, 0);
    group.add(lamp);
  };
  if (isDouble) { addLamp(-15); addLamp(15); } else { addLamp(0); }
}

function createBollardLight(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#374151', 0.7, 0.3);
  const lightMat = createMaterial('#fbbf24', 0.3, 0.1);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(w / 3, w / 2.5, h * 0.8, 8), mat);
  post.position.y = h * 0.4;
  group.add(post);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 3, h * 0.2, 8), lightMat);
  top.position.y = h * 0.9;
  group.add(top);
}

// --- Garden Structures ---
function createGreenhouse(group: THREE.Group, w: number, d: number, h: number): void {
  const frameMat = createMaterial('#374151', 0.7, 0.3);
  const glassMat = createMaterial('#86efac', 0.2, 0.2);
  (glassMat as THREE.MeshStandardMaterial).transparent = true;
  (glassMat as THREE.MeshStandardMaterial).opacity = 0.35;
  // Frame posts (4 corners)
  const postW = 4;
  for (const [x, z] of [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(postW, h, postW), frameMat);
    post.position.set(x, h / 2, z);
    group.add(post);
  }
  // Glass walls (4 sides)
  const addWall = (x: number, z: number, ww: number, wd: number) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(ww, h * 0.85, wd), glassMat);
    wall.position.set(x, h * 0.425, z);
    group.add(wall);
  };
  addWall(0, -d/2, w, 2); addWall(0, d/2, w, 2);
  addWall(-w/2, 0, 2, d); addWall(w/2, 0, 2, d);
  // Pitched roof
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-w / 2, 0);
  roofShape.lineTo(0, h * 0.25);
  roofShape.lineTo(w / 2, 0);
  roofShape.lineTo(-w / 2, 0);
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: d, bevelEnabled: false });
  const roof = new THREE.Mesh(roofGeo, glassMat);
  roof.position.set(0, h, -d / 2);
  group.add(roof);
}

function createFountain(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#94a3b8', 0.7, 0.1);
  const waterMat = createMaterial('#60a5fa', 0.3, 0.1);
  // Base basin
  const base = new THREE.Mesh(new THREE.CylinderGeometry(w / 2, w / 2.2, h * 0.25, 24), mat);
  base.position.y = h * 0.125;
  group.add(base);
  // Middle tier
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(w / 4, w / 3.5, h * 0.3, 16), mat);
  mid.position.y = h * 0.4;
  group.add(mid);
  // Top
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w / 8, w / 6, h * 0.2, 12), mat);
  top.position.y = h * 0.7;
  group.add(top);
  // Water
  const water = new THREE.Mesh(new THREE.CylinderGeometry(w / 2.3, w / 2.3, h * 0.08, 24), waterMat);
  water.position.y = h * 0.2;
  group.add(water);
}

function createArbor(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || '#92400e', 0.85, 0.0);
  const postW = 6;
  // 4 posts
  for (const [x, z] of [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(postW, h, postW), mat);
    post.position.set(x, h / 2, z);
    group.add(post);
  }
  // Cross beams on top
  for (let i = 0; i < 4; i++) {
    const z = -d / 2 + (d / 3) * i;
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 20, 4, 4), mat);
    beam.position.set(0, h, z);
    group.add(beam);
  }
}

function createDeckPatio(group: THREE.Group, w: number, d: number, h: number, color: string): void {
  const mat = createMaterial(color || WOOD_BROWN, 0.8, 0.05);
  const plankW = 8; const gap = 1;
  const numPlanks = Math.max(1, Math.floor(w / (plankW + gap)));
  const totalW = numPlanks * plankW + (numPlanks - 1) * gap;
  for (let i = 0; i < numPlanks; i++) {
    const xPos = -totalW / 2 + plankW / 2 + i * (plankW + gap);
    const plank = new THREE.Mesh(new THREE.BoxGeometry(plankW, h, d), mat);
    plank.position.set(xPos, h / 2, 0);
    group.add(plank);
  }
}
