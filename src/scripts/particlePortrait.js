import * as THREE from "three";

export function initParticlePortrait(canvas, portrait) {
  const mount = canvas.parentElement;

  // ── Parse ASCII ──
  const lines = portrait.split("\n");
  const rawTargets = [];
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (let y = 0; y < lines.length; y++) {
    const line = lines[y];
    for (let x = 0; x < line.length; x++) {
      if (line[x] === "█") {
        rawTargets.push({ x, y });
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (rawTargets.length === 0) {
    console.warn("No '█' characters found in portrait data.");
    return;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;

  const scaleX = 0.6;
  const scaleY = 1.0;

  const targets = [];
  for (const pt of rawTargets) {
    targets.push(
      (pt.x - centerX) * scaleX,
      -(pt.y - centerY) * scaleY,
      0
    );
  }

  const count = targets.length / 3;
  console.log(`Parsed ${count} particles for portrait.`);

  const targetPositions = new Float32Array(targets);
  const floatPositions = new Float32Array(count * 3);
  const randomPhases = new Float32Array(count); 

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    floatPositions[i3] = (Math.random() - 0.5) * 150;
    floatPositions[i3 + 1] = (Math.random() - 0.5) * 150;
    floatPositions[i3 + 2] = (Math.random() - 0.5) * 50;
    
    // Add jitter to break the perfect grid of ASCII
    targetPositions[i3] += (Math.random() - 0.5) * 0.8;
    targetPositions[i3 + 1] += (Math.random() - 0.5) * 0.4;
    
    randomPhases[i] = Math.random() * Math.PI * 2;
  }

  const w = mount.clientWidth || window.innerWidth;
  const h = mount.clientHeight || window.innerHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 2000);
  
  const portraitWidth = width * scaleX;
  const portraitHeight = height * scaleY;
  camera.position.z = Math.max(portraitWidth, portraitHeight) * 1.4;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h, false);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(floatPositions.slice(), 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0x245bff,
    size: 1.5, 
    transparent: true,
    opacity: 0.8,
    // sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  let progress = 0;
  
  const updateProgress = () => {
    const rect = mount.getBoundingClientRect();
    const vh = window.innerHeight;
    
    if (rect.bottom < 0 || rect.top > vh) {
      progress = 0;
      return;
    }

    const elementCenter = rect.top + rect.height / 2;
    const plateauTop = vh * 0.35;
    const plateauBottom = vh * 0.65;
    
    let p = 0;
    if (elementCenter < plateauTop) {
      p = Math.max(0, 1 - (plateauTop - elementCenter) / (vh * 0.4));
    } else if (elementCenter > plateauBottom) {
      p = Math.max(0, 1 - (elementCenter - plateauBottom) / (vh * 0.4));
    } else {
      p = 1;
    }
    
    progress = p * p * (3 - 2 * p);
  };

  const clock = new THREE.Clock();
  const pos = points.geometry.attributes.position.array;

  const tick = () => {
    updateProgress();
    
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = randomPhases[i];
      
      const scatterAmount = (1 - progress) * 8;
      const floatAmount = 0.3;
      
      // Using random phase prevents the "wavy line" sync effect
      const wx = Math.sin(t * 0.6 + phase) * (scatterAmount + floatAmount);
      const wy = Math.cos(t * 0.7 + phase * 1.5) * (scatterAmount + floatAmount);
      const wz = Math.sin(t * 0.5 + phase * 2) * (floatAmount * 2);

      const targetX = targetPositions[i3];
      const targetY = targetPositions[i3 + 1];
      const targetZ = targetPositions[i3 + 2];

      const startX = floatPositions[i3];
      const startY = floatPositions[i3 + 1];
      const startZ = floatPositions[i3 + 2];

      pos[i3] = startX + (targetX - startX) * progress + wx;
      pos[i3 + 1] = startY + (targetY - startY) * progress + wy;
      pos[i3 + 2] = startZ + (targetZ - startZ) * progress + wz;
    }
    points.geometry.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  };
  tick();

  window.addEventListener("resize", () => {
    const nw = mount.clientWidth || window.innerWidth;
    const nh = mount.clientHeight || window.innerHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  });
}
