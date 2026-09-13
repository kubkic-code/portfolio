/**
 * three-scene.js — Three.js 3D Hero Scene
 * Wireframe Sphere (datové uzly) + adaptivní částice + myš parallax
 * Autor: Jakub Sedlák | kubkic-code
 *
 * Závislosti: Three.js r162 (musí být načten před tímto souborem)
 */

"use strict";

(function ThreeScene() {
  // -----------------------------------------------------------------------
  // Konfigurace
  // -----------------------------------------------------------------------
  const CONFIG = {
    // Adaptivní počet částic podle výkonu zařízení
    PARTICLE_COUNT_DESKTOP: 2500,   // Sníženo z 5000 pro plynulejší scrollování
    PARTICLE_COUNT_MOBILE:  600,
    PARTICLE_COUNT_LOW_END: 1000,

    // Sphere
    SPHERE_RADIUS:    1.4,
    SPHERE_DETAIL:    4,      // IcosahedronGeometry detail level (desktop)
    SPHERE_DETAIL_MOBILE: 2,  // Snížený detail na mobilu — méně trojuhélníků = vyšší FPS
    NODE_COUNT:       180,    // počet datových uzlů na povrchu koule (desktop)
    NODE_COUNT_MOBILE: 80,    // Méně uzlů na mobilu = méně GPU work
    SPHERE_OFFSET_X:  1.5,    // Offset sféry doprava, aby nepřekrývala hero text

    // Barvy (shodné s CSS design tokeny)
    COLOR_INDIGO: 0x6366F1,
    COLOR_CYAN:   0x06B6D4,
    COLOR_WHITE:  0xffffff,

    // Animace
    SPHERE_ROTATION_SPEED: 0.0008,
    SPHERE_MOUSE_ROTATION: 0.15,   // Multiplikátor inverzního natáčení sféry od kurzoru myši (odpuzování)
    PARALLAX_STRENGTH:     0.04,
    REPULSION_RADIUS:      0.9,    // vzdálenost odpuzování částic od kurzoru (normalizovaná)
    REPULSION_STRENGTH:    0.15,

    // Kamera
    CAMERA_FOV:        60,
    CAMERA_Z:          4.5,
    CAMERA_Z_MIN:      2.0,        // dolly-in cílová pozice (po scrollu)
    // Mobilní kamera — oddáleno, sféra nepřekrývá text
    MOBILE_CAMERA_Z:   6.5,
    // Měřítko sféry na mobilu (75 %) — nezabere celý viewport
    MOBILE_SPHERE_SCALE: 0.75,

    // Výkon
    TARGET_FPS:    55,
    FPS_CHECK_MS:  2000,
  };

  // -----------------------------------------------------------------------
  // Stav
  // -----------------------------------------------------------------------
  let renderer, scene, camera, animFrameId;
  let sphere, wireframeMesh, nodeMesh;
  let particles, particlePositions, particleVelocities;
  let innerGlow, pointLight, pointLight2;
  let mouse = { x: 0, y: 0, nx: 0, ny: 0 };   // norm. souřadnice -1..1
  let sphereBaseRot = { x: 0, y: 0 };
  let sphereMouseTilt = { x: 0, y: 0 };
  let cameraTargetZ = CONFIG.CAMERA_Z;
  let isLowEnd = false;
  let particleCount;
  let lastTime = 0;
  let fpsMonitor = { frames: 0, lastCheck: 0, avgFps: 60 };
  let heroSection, canvas;
  let isVisible = true;   // zda je Hero sekce ve viewportu

  // --- Stav pro Easter Eggy (Suplex & Matrix) ---
  let origNodePositions = null;
  let nodeVelocities = null;
  let isSuplexActive = false;
  let suplexPhase = "idle";  // "burst" | "gravity" | "idle"
  let suplexTimer1 = null, suplexTimer2 = null;

  let rotationSpeedMultiplier = 1.0;
  let isMatrixActive = false;
  let matrixTimer = null;

  // -----------------------------------------------------------------------
  // Init
  // -----------------------------------------------------------------------
  function init() {
    canvas = document.getElementById("hero-canvas");
    heroSection = document.getElementById("hero");
    if (!canvas || typeof THREE === "undefined") return;

    const isMobile = window.matchMedia("(pointer: coarse)").matches
                  || window.innerWidth < 768;

    particleCount = isMobile
      ? CONFIG.PARTICLE_COUNT_MOBILE
      : CONFIG.PARTICLE_COUNT_DESKTOP;

    // --- Renderer ---
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isMobile,
      alpha: true,
      powerPreference: isMobile ? "default" : "high-performance",
    });
    // Na mobilu omezíme pixelRatio na max 1.0 — hlavni příčina sekní na high-DPI telefonech
    renderer.setPixelRatio(isMobile ? Math.min(window.devicePixelRatio, 1.0) : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // Na mobilu upravíme globální CONFIG pro sphere — méně geometrie = vyšší FPS
    if (isMobile) {
      CONFIG.SPHERE_DETAIL = CONFIG.SPHERE_DETAIL_MOBILE;
      CONFIG.NODE_COUNT    = CONFIG.NODE_COUNT_MOBILE;
    }

    // --- Scene ---
    scene = new THREE.Scene();

    // --- Camera ---
    camera = new THREE.PerspectiveCamera(
      CONFIG.CAMERA_FOV,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.z = CONFIG.CAMERA_Z;

    // --- Světlo ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    scene.add(ambientLight);

    pointLight = new THREE.PointLight(CONFIG.COLOR_INDIGO, 3, 8);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    pointLight2 = new THREE.PointLight(CONFIG.COLOR_CYAN, 1.5, 6);
    pointLight2.position.set(2, 1, 1);
    scene.add(pointLight2);

    // --- Sestavit scénu ---
    buildSphere();
    buildParticles(particleCount);
    buildInnerGlow();

    // Posuneme celou skupinu objektů sféry doprava (mimo hero text)
    // Použijeme skupinu (Group) nebo přímo posuneme objekty na ose X
    const sphereGroup = new THREE.Group();
    sphereGroup.position.x = CONFIG.SPHERE_OFFSET_X;
    // Přeneseme objekty do skupiny
    scene.remove(wireframeMesh);
    scene.remove(sphere);
    scene.remove(nodeMesh);
    scene.remove(innerGlow);
    scene.children
      .filter(c => c instanceof THREE.Mesh && c.geometry instanceof THREE.SphereGeometry && c !== wireframeMesh && c !== sphere)
      .forEach(c => {
        scene.remove(c);
        sphereGroup.add(c);
      });
    sphereGroup.add(wireframeMesh);
    sphereGroup.add(sphere);
    sphereGroup.add(nodeMesh);
    sphereGroup.add(innerGlow);
    // Přidáme halo (posledně přidaný mesh)
    const haloMesh = scene.children.find(c => c.material && c.material.opacity === 0.12);
    if (haloMesh) {
      scene.remove(haloMesh);
      sphereGroup.add(haloMesh);
    }
    scene.add(sphereGroup);
    // Uložíme referenci pro rotaci
    window._sphereGroup = sphereGroup;

    // --- Mobilní úpravy: kamera dál + zmenšení sféry ---
    if (isMobile) {
      // Oddálení kamery — sféra zabere méně místa a neblokuje scrollování
      camera.position.z = CONFIG.MOBILE_CAMERA_Z;
      cameraTargetZ = CONFIG.MOBILE_CAMERA_Z;
      // Zmenšení sférové skupiny
      if (window._sphereGroup) {
        window._sphereGroup.scale.setScalar(CONFIG.MOBILE_SPHERE_SCALE);
      }
    }

    // --- Eventy ---
    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    // Touch eventy — identická logika jako myš
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove",  onTouchMove,  { passive: true });

    // Visibility observer (přestaneme renderovat mimo Hero)
    setupVisibilityObserver();

    // Start smyčka
    animate(0);
  }

  // -----------------------------------------------------------------------
  // Wireframe Sphere s datovými uzly
  // -----------------------------------------------------------------------
  function buildSphere() {
    // Průhledná ikosahedron geometrie = kostra koule
    const geo = new THREE.IcosahedronGeometry(CONFIG.SPHERE_RADIUS, CONFIG.SPHERE_DETAIL);

    // Wireframe — Indigo neonové hrany
    const wireMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLOR_INDIGO,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    wireframeMesh = new THREE.Mesh(geo, wireMat);
    scene.add(wireframeMesh);

    // Průhledná mesh pro osvětlení jádra
    const innerGeo = new THREE.IcosahedronGeometry(CONFIG.SPHERE_RADIUS * 0.92, 2);
    const innerMat = new THREE.MeshPhongMaterial({
      color: CONFIG.COLOR_INDIGO,
      transparent: true,
      opacity: 0.04,
      side: THREE.BackSide,
    });
    sphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(sphere);

    // --- Datové uzly na povrchu ---
    const nodeGeo   = new THREE.BufferGeometry();
    const nodePositions = new Float32Array(CONFIG.NODE_COUNT * 3);
    const nodeSizes = new Float32Array(CONFIG.NODE_COUNT);
    const nodeColors = new Float32Array(CONFIG.NODE_COUNT * 3);

    // Rovnoměrné rozmístění bodů na sféře (Fibonacci sphere)
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
      const theta = Math.acos(1 - (2 * i) / CONFIG.NODE_COUNT);
      const phi   = 2 * Math.PI * i / goldenRatio;

      const r = CONFIG.SPHERE_RADIUS;
      nodePositions[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
      nodePositions[i * 3 + 1] = r * Math.sin(theta) * Math.sin(phi);
      nodePositions[i * 3 + 2] = r * Math.cos(theta);

      // Náhodná velikost uzlu
      nodeSizes[i] = Math.random() * 4 + 1.5;

      // Barva uzlu: 70% Indigo, 30% Cyan
      const t = Math.random();
      if (t < 0.7) {
        nodeColors[i * 3]     = 0.388; // R (indigo)
        nodeColors[i * 3 + 1] = 0.4;   // G
        nodeColors[i * 3 + 2] = 0.945; // B
      } else {
        nodeColors[i * 3]     = 0.024; // R (cyan)
        nodeColors[i * 3 + 1] = 0.714; // G
        nodeColors[i * 3 + 2] = 0.831; // B
      }
    }

    nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePositions, 3));
    nodeGeo.setAttribute("color",    new THREE.BufferAttribute(nodeColors, 3));
    nodeGeo.setAttribute("size",     new THREE.BufferAttribute(nodeSizes, 1));

    const nodeMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
      depthWrite: false,
    });

    nodeMesh = new THREE.Points(nodeGeo, nodeMat);
    scene.add(nodeMesh);

    // Uložit původní sférické pozice pro explozi a gravitační skládání (Suplex)
    origNodePositions = new Float32Array(CONFIG.NODE_COUNT * 3);
    origNodePositions.set(nodePositions);
    nodeVelocities = new Float32Array(CONFIG.NODE_COUNT * 3);
  }

  // -----------------------------------------------------------------------
  // Ambientní částice (hvězdné pole)
  // -----------------------------------------------------------------------
  function buildParticles(count) {
    const geo = new THREE.BufferGeometry();
    particlePositions = new Float32Array(count * 3);
    particleVelocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes  = new Float32Array(count);

    const spread = 9;

    for (let i = 0; i < count; i++) {
      // Náhodná pozice v prostoru (vyhnout se centru kde je koule)
      let x, y, z, dist;
      do {
        x = (Math.random() - 0.5) * spread;
        y = (Math.random() - 0.5) * spread;
        z = (Math.random() - 0.5) * spread;
        dist = Math.sqrt(x * x + y * y + z * z);
      } while (dist < CONFIG.SPHERE_RADIUS * 1.2);

      particlePositions[i * 3]     = x;
      particlePositions[i * 3 + 1] = y;
      particlePositions[i * 3 + 2] = z;

      // Pomalé orbitální rychlosti
      particleVelocities[i * 3]     = (Math.random() - 0.5) * 0.0005;
      particleVelocities[i * 3 + 1] = (Math.random() - 0.5) * 0.0005;
      particleVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.0003;

      // Barvy: bílé s různou průhledností (alpha)
      const bright = 0.6 + Math.random() * 0.4;
      colors[i * 3]     = bright;
      colors[i * 3 + 1] = bright;
      colors[i * 3 + 2] = bright;

      sizes[i] = Math.random() * 2.5 + 0.5;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    geo.setAttribute("color",    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.025,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false,
    });

    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  // -----------------------------------------------------------------------
  // Pulzující neonové jádro
  // -----------------------------------------------------------------------
  function buildInnerGlow() {
    const geo = new THREE.SphereGeometry(0.22, 16, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLOR_CYAN,
      transparent: true,
      opacity: 0.85,
    });
    innerGlow = new THREE.Mesh(geo, mat);
    scene.add(innerGlow);

    // Halo kolem jádra
    const haloGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const haloMat = new THREE.MeshBasicMaterial({
      color: CONFIG.COLOR_INDIGO,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    });
    scene.add(new THREE.Mesh(haloGeo, haloMat));
  }

  // -----------------------------------------------------------------------
  // Animační smyčka
  // -----------------------------------------------------------------------
  function animate(time) {
    animFrameId = requestAnimationFrame(animate);

    if (!isVisible) return;

    const dt = time - lastTime;
    lastTime = time;

    // FPS monitor — adaptivní redukce
    monitorFps(time, dt);

    const t = time * 0.001;  // sekundy

    // --- Rotace sféry (kontinuální drift + zrychlení pro Matrix + silnější inverzní natáčení od myši) ---
    sphereBaseRot.y += CONFIG.SPHERE_ROTATION_SPEED * rotationSpeedMultiplier;
    sphereBaseRot.x += CONFIG.SPHERE_ROTATION_SPEED * 0.4 * rotationSpeedMultiplier;

    // Inverzní náklon podle myši (odpuzování od kurzoru):
    // myš vpravo (mouse.nx > 0) -> natočení sféry doleva (targetTiltY záporné)
    // myš nahoře (mouse.ny < 0) -> natočení sféry dolů (targetTiltX záporné)
    const targetTiltY = -mouse.nx * CONFIG.SPHERE_MOUSE_ROTATION;
    const targetTiltX =  mouse.ny * CONFIG.SPHERE_MOUSE_ROTATION * 0.75;

    // Plynulý dojezd (lerp)
    sphereMouseTilt.x += (targetTiltX - sphereMouseTilt.x) * 0.06;
    sphereMouseTilt.y += (targetTiltY - sphereMouseTilt.y) * 0.06;

    if (window._sphereGroup) {
      window._sphereGroup.rotation.y = sphereBaseRot.y + sphereMouseTilt.y;
      window._sphereGroup.rotation.x = sphereBaseRot.x + sphereMouseTilt.x;
    } else if (wireframeMesh) {
      // Fallback pokud group nebyla vytvořena
      wireframeMesh.rotation.y = sphereBaseRot.y + sphereMouseTilt.y;
      wireframeMesh.rotation.x = sphereBaseRot.x + sphereMouseTilt.x;
      if (sphere) {
        sphere.rotation.y = wireframeMesh.rotation.y;
        sphere.rotation.x = wireframeMesh.rotation.x;
      }
      if (nodeMesh) {
        nodeMesh.rotation.y = wireframeMesh.rotation.y;
        nodeMesh.rotation.x = wireframeMesh.rotation.x;
      }
    }

    // --- Pulzace jádra ---
    if (innerGlow) {
      const pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
      innerGlow.scale.setScalar(pulse);
      innerGlow.material.opacity = 0.7 + 0.3 * Math.sin(t * 2.5);
      pointLight.intensity = 2.5 + 1.5 * Math.sin(t * 2.5);
    }

    // --- Pohyb částic (drift + odpuzování od kurzoru) ---
    if (particles && !isLowEnd) {
      const positions = particles.geometry.attributes.position.array;
      const spread = 9;

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;

        // Drift
        positions[ix]     += particleVelocities[ix];
        positions[ix + 1] += particleVelocities[ix + 1];
        positions[ix + 2] += particleVelocities[ix + 2];

        // Odpuzování od kurzoru (v 2D projekci)
        const px = positions[ix] / spread;
        const py = positions[ix + 1] / spread;
        const dx = px - mouse.nx * 0.5;
        const dy = py - mouse.ny * 0.5;
        const dist2 = dx * dx + dy * dy;

        if (dist2 < CONFIG.REPULSION_RADIUS * CONFIG.REPULSION_RADIUS * 0.04) {
          const force = (1 - Math.sqrt(dist2) / (CONFIG.REPULSION_RADIUS * 0.2)) * CONFIG.REPULSION_STRENGTH;
          particleVelocities[ix]     += dx * force * 0.002;
          particleVelocities[ix + 1] += dy * force * 0.002;
        }

        // Přitahování zpět k původní pozici (damping)
        particleVelocities[ix]     *= 0.99;
        particleVelocities[ix + 1] *= 0.99;
        particleVelocities[ix + 2] *= 0.99;

        // Wrap-around boundaries
        const half = spread / 2;
        if (positions[ix]     > half)  positions[ix]     -= spread;
        if (positions[ix]     < -half) positions[ix]     += spread;
        if (positions[ix + 1] > half)  positions[ix + 1] -= spread;
        if (positions[ix + 1] < -half) positions[ix + 1] += spread;
        if (positions[ix + 2] > half)  positions[ix + 2] -= spread;
        if (positions[ix + 2] < -half) positions[ix + 2] += spread;
      }

      particles.geometry.attributes.position.needsUpdate = true;
    }

    // --- Parallax mraku ambientních částic (hvězdný prach) ---
    // Jemný inverzní pohyb vůči myši posouvá vrstvu částic v hloubce
    // a vytváří realistický vícevrstvý 3D parallax efekt
    if (particles) {
      const targetParticlesX = -mouse.nx * 0.40;
      const targetParticlesY =  mouse.ny * 0.35;
      particles.position.x += (targetParticlesX - particles.position.x) * 0.035;
      particles.position.y += (targetParticlesY - particles.position.y) * 0.035;
      particles.rotation.y += (-mouse.nx * 0.05 - particles.rotation.y) * 0.02;
      particles.rotation.x += ( mouse.ny * 0.04 - particles.rotation.x) * 0.02;
    }

    // --- Fyzika Suplex exploze a gravitační rekonstrukce uzlů ---
    if (isSuplexActive && nodeMesh) {
      const pos = nodeMesh.geometry.attributes.position.array;
      for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
        const ix = i * 3;
        if (suplexPhase === "burst") {
          pos[ix]     += nodeVelocities[ix];
          pos[ix + 1] += nodeVelocities[ix + 1];
          pos[ix + 2] += nodeVelocities[ix + 2];
          nodeVelocities[ix]     *= 0.965;
          nodeVelocities[ix + 1] *= 0.965;
          nodeVelocities[ix + 2] *= 0.965;
        } else if (suplexPhase === "gravity") {
          const ox = origNodePositions[ix];
          const oy = origNodePositions[ix + 1];
          const oz = origNodePositions[ix + 2];
          const pullStrength = 0.040;
          nodeVelocities[ix]     += (ox - pos[ix]) * pullStrength;
          nodeVelocities[ix + 1] += (oy - pos[ix + 1]) * pullStrength;
          nodeVelocities[ix + 2] += (oz - pos[ix + 2]) * pullStrength;

          pos[ix]     += nodeVelocities[ix];
          pos[ix + 1] += nodeVelocities[ix + 1];
          pos[ix + 2] += nodeVelocities[ix + 2];

          nodeVelocities[ix]     *= 0.92;
          nodeVelocities[ix + 1] *= 0.92;
          nodeVelocities[ix + 2] *= 0.92;
        }
      }
      nodeMesh.geometry.attributes.position.needsUpdate = true;
    }

    // --- Parallax kamery — inverzní reakce pro silnější pocit odpuzování sféry ---
    const targetCamX = -mouse.nx * 0.15;
    const targetCamY =  mouse.ny * 0.15;
    camera.position.x += (targetCamX - camera.position.x) * 0.04;
    camera.position.y += (targetCamY - camera.position.y) * 0.04;

    // --- Dolly-in Z (GSAP nastaví cameraTargetZ) ---
    camera.position.z += (cameraTargetZ - camera.position.z) * 0.05;
    // lookAt míří na střed sféry (offsetovanou doprava)
    camera.lookAt(CONFIG.SPHERE_OFFSET_X * 0.4, 0, 0);

    renderer.render(scene, camera);
  }

  // -----------------------------------------------------------------------
  // FPS Monitor — adaptivní snížení kvality
  // -----------------------------------------------------------------------
  function monitorFps(time, dt) {
    fpsMonitor.frames++;
    if (time - fpsMonitor.lastCheck > CONFIG.FPS_CHECK_MS) {
      fpsMonitor.avgFps = (fpsMonitor.frames / (CONFIG.FPS_CHECK_MS / 1000));
      fpsMonitor.frames = 0;
      fpsMonitor.lastCheck = time;

      if (fpsMonitor.avgFps < CONFIG.TARGET_FPS && !isLowEnd) {
        isLowEnd = true;
        console.info("[ThreeScene] Nízký FPS detekován, snižuji kvalitu.");
        // Snížit počet částic
        if (particles) {
          particles.geometry.setDrawRange(0, Math.floor(particleCount * 0.4));
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Visibility Observer (stopnout rendering mimo viewport)
  // -----------------------------------------------------------------------
  function setupVisibilityObserver() {
    if (!heroSection || !("IntersectionObserver" in window)) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.01 }
    );
    obs.observe(heroSection);
  }

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------
  function onMouseMove(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    // Normalizace -1..1
    mouse.nx = (e.clientX / window.innerWidth)  * 2 - 1;
    mouse.ny = (e.clientY / window.innerHeight) * 2 - 1;
  }

  // -----------------------------------------------------------------------
  // Touch handlers — mapují první dotyk identicky jako pohyb myši
  // Sféra a částice tak reagují na prst stejně jako na kurzor
  // -----------------------------------------------------------------------
  function onTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.nx = (t.clientX / window.innerWidth)  * 2 - 1;
    mouse.ny = (t.clientY / window.innerHeight) * 2 - 1;
  }

  function onTouchMove(e) {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    mouse.x = t.clientX;
    mouse.y = t.clientY;
    mouse.nx = (t.clientX / window.innerWidth)  * 2 - 1;
    mouse.ny = (t.clientY / window.innerHeight) * 2 - 1;
  }

  function onResize() {
    if (!renderer || !camera) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // -----------------------------------------------------------------------
  // Easter Egg: Suplex (Masivní seismický otřes + drtivá exploze sféry + prodloužená gravitace)
  // -----------------------------------------------------------------------
  function triggerSuplex() {
    if (isSuplexActive || !nodeMesh || !origNodePositions) return;
    isSuplexActive = true;
    suplexPhase = "burst";

    // 1. GSAP Screen Shake (masivní otřesy obrazovky a body)
    if (typeof gsap !== "undefined") {
      const shakeTl = gsap.timeline();
      const shakeAmp = 28;
      for (let i = 0; i < 16; i++) {
        const decay = 1 - (i / 16);
        shakeTl.to(document.body, {
          x: (Math.random() - 0.5) * shakeAmp * decay,
          y: (Math.random() - 0.5) * shakeAmp * decay,
          rotation: (Math.random() - 0.5) * 1.6 * decay,
          duration: 0.04,
          ease: "power1.inOut"
        });
      }
      shakeTl.to(document.body, { x: 0, y: 0, rotation: 0, duration: 0.15, clearProps: "x,y,rotation" });

      // Masivní seismický otřes Three.js kamery
      if (camera) {
        const origZ = camera.position.z;
        const origX = camera.position.x;
        const origY = camera.position.y;
        const camTl = gsap.timeline();
        for (let i = 0; i < 14; i++) {
          const decay = 1 - (i / 14);
          camTl.to(camera.position, {
            x: origX + (Math.random() - 0.5) * 0.45 * decay,
            y: origY + (Math.random() - 0.5) * 0.45 * decay,
            z: origZ + (Math.random() - 0.5) * 0.75 * decay,
            duration: 0.04,
            ease: "power1.inOut"
          });
        }
        camTl.to(camera.position, { x: origX, y: origY, z: origZ, duration: 0.12 });
      }

      // Prudký záblesk centrálního jádra
      gsap.to(pointLight, { intensity: 14, duration: 0.1, yoyo: true, repeat: 1 });

      // Wireframe a vnitřní sféra se při explozi roztříští / smrští na minimum
      if (wireframeMesh) gsap.to(wireframeMesh.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.2, ease: "power4.out" });
      if (sphere) gsap.to(sphere.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.2, ease: "power4.out" });
      if (innerGlow) gsap.to(innerGlow.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.2, ease: "power4.out" });
    }

    // 2. Drtivý výpočet radiální expanze (vysoká burst velocity pro masivní rozlet)
    for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
      const ix = i * 3;
      const ox = origNodePositions[ix];
      const oy = origNodePositions[ix + 1];
      const oz = origNodePositions[ix + 2];
      const dist = Math.sqrt(ox * ox + oy * oy + oz * oz) || 1;
      const nx = ox / dist;
      const ny = oy / dist;
      const nz = oz / dist;

      const blastSpeed = 0.38 + Math.random() * 0.42;
      nodeVelocities[ix]     = nx * blastSpeed + (Math.random() - 0.5) * 0.18;
      nodeVelocities[ix + 1] = ny * blastSpeed + (Math.random() - 0.5) * 0.18;
      nodeVelocities[ix + 2] = nz * blastSpeed + (Math.random() - 0.5) * 0.18;
    }

    // 3. Po 1600ms (více než 2.5x déle než původně) přepnout na gravitační přitahování zpět
    clearTimeout(suplexTimer1);
    clearTimeout(suplexTimer2);
    suplexTimer1 = setTimeout(() => {
      suplexPhase = "gravity";
    }, 1600);

    // 4. Po 3800ms (více než 2.3x déle) dokončit rekonstrukci sféry a spustit elastic bounce
    suplexTimer2 = setTimeout(() => {
      suplexPhase = "idle";
      isSuplexActive = false;

      const pos = nodeMesh.geometry.attributes.position.array;
      for (let i = 0; i < CONFIG.NODE_COUNT * 3; i++) {
        pos[i] = origNodePositions[i];
        nodeVelocities[i] = 0;
      }
      nodeMesh.geometry.attributes.position.needsUpdate = true;

      if (typeof gsap !== "undefined") {
        if (wireframeMesh) gsap.to(wireframeMesh.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: "elastic.out(1.2, 0.4)" });
        if (sphere) gsap.to(sphere.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: "elastic.out(1.2, 0.4)" });
        if (innerGlow) gsap.to(innerGlow.scale, { x: 1, y: 1, z: 1, duration: 1.0, ease: "elastic.out(1.2, 0.4)" });
      }
    }, 3800);
  }

  // -----------------------------------------------------------------------
  // Easter Egg: Matrix Overdrive (Nekonečný neon zelená + 25x rotace do stisku Enter)
  // -----------------------------------------------------------------------
  function triggerMatrix() {
    if (isMatrixActive) return;
    isMatrixActive = true;

    // Extrémní zrychlení rotace
    if (typeof gsap !== "undefined") {
      gsap.to({ val: rotationSpeedMultiplier }, {
        val: 25.0,
        duration: 0.8,
        ease: "power2.in",
        onUpdate: function () {
          rotationSpeedMultiplier = this.targets()[0].val;
        }
      });
    } else {
      rotationSpeedMultiplier = 25.0;
    }

    // Přebarvení na neonovou Matrix zelenou
    const MATRIX_GREEN = 0x00ff66;
    const MATRIX_CORE = 0x39ff14;

    if (wireframeMesh) wireframeMesh.material.color.setHex(MATRIX_GREEN);
    if (sphere) sphere.material.color.setHex(MATRIX_GREEN);
    if (innerGlow) innerGlow.material.color.setHex(MATRIX_CORE);
    if (pointLight) pointLight.color.setHex(MATRIX_GREEN);
    if (pointLight2) pointLight2.color.setHex(MATRIX_GREEN);

    if (nodeMesh) {
      const colors = nodeMesh.geometry.attributes.color.array;
      for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
        colors[i * 3]     = 0.0;
        colors[i * 3 + 1] = 1.0;
        colors[i * 3 + 2] = 0.3;
      }
      nodeMesh.geometry.attributes.color.needsUpdate = true;
    }
  }

  function stopMatrix() {
    if (!isMatrixActive) return;

    if (typeof gsap !== "undefined") {
      gsap.to({ val: rotationSpeedMultiplier }, {
        val: 1.0,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: function () {
          rotationSpeedMultiplier = this.targets()[0].val;
        },
        onComplete: () => {
          isMatrixActive = false;
        }
      });
    } else {
      rotationSpeedMultiplier = 1.0;
      isMatrixActive = false;
    }

    // Návrat původních barev
    if (wireframeMesh) wireframeMesh.material.color.setHex(CONFIG.COLOR_INDIGO);
    if (sphere) sphere.material.color.setHex(CONFIG.COLOR_INDIGO);
    if (innerGlow) innerGlow.material.color.setHex(CONFIG.COLOR_CYAN);
    if (pointLight) pointLight.color.setHex(CONFIG.COLOR_INDIGO);
    if (pointLight2) pointLight2.color.setHex(CONFIG.COLOR_CYAN);

    if (nodeMesh) {
      const colors = nodeMesh.geometry.attributes.color.array;
      for (let i = 0; i < CONFIG.NODE_COUNT; i++) {
        const t = i / CONFIG.NODE_COUNT;
        if (t < 0.7) {
          colors[i * 3]     = 0.388;
          colors[i * 3 + 1] = 0.4;
          colors[i * 3 + 2] = 0.945;
        } else {
          colors[i * 3]     = 0.024;
          colors[i * 3 + 1] = 0.714;
          colors[i * 3 + 2] = 0.831;
        }
      }
      nodeMesh.geometry.attributes.color.needsUpdate = true;
    }
  }

  // -----------------------------------------------------------------------
  // Veřejné API (volá gsap-animations.js i main.js pro Easter Eggy)
  // -----------------------------------------------------------------------
  window.ThreeScene = {
    setCameraZ: (z) => { cameraTargetZ = z; },
    getCameraZ: ()  => cameraTargetZ,
    getDefaultZ: () => CONFIG.CAMERA_Z,
    isReady: () => !!renderer,
    triggerSuplex,
    triggerMatrix,
    stopMatrix,
  };

  // -----------------------------------------------------------------------
  // Spuštění po načtení DOMu
  // -----------------------------------------------------------------------
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
