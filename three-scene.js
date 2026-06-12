/* Hero motion graphic: ~1,100 "token" particles scattered in space
   assemble into an ordered lattice — raw text becoming a context window.
   Decorative only: fails silently, pauses offscreen, respects reduced motion. */

import * as THREE from 'three';

const COLS = 16;
const ROWS = 10;
const LAYERS = 7;
const LATTICE_W = 12;
const LATTICE_H = 7;
const LATTICE_D = 5;
const SCATTER_RADIUS = 16;
const ASSEMBLE_DELAY_S = 0.35;
const ASSEMBLE_DURATION_S = 2.4;
const MAX_STAGGER_S = 1.4;
const FRAME_FADE_START_S = 2.4;
const FRAME_FADE_LEN_S = 1.4;
const FRAME_MAX_OPACITY = 0.5;
const DESKTOP_BREAKPOINT_PX = 1024;

const container = document.getElementById('heroCanvas');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (container) {
    try {
        initScene();
    } catch {
        container.remove();
    }
}

function initScene() {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 17;

    const group = new THREE.Group();
    scene.add(group);

    const { points, scatter, grid, delays, phases, positionAttr } = buildParticles();
    group.add(points);

    const frame = buildFrame();
    group.add(frame);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const clock = new THREE.Clock();
    const count = scatter.length / 3;
    let isVisible = true;
    let rafId = 0;

    layout();
    window.addEventListener('resize', layout);

    if (reducedMotion) {
        // Render the assembled lattice once; no animation, no listeners.
        positionAttr.array.set(grid);
        positionAttr.needsUpdate = true;
        frame.material.opacity = FRAME_MAX_OPACITY;
        renderer.render(scene, camera);
        return;
    }

    window.addEventListener('pointermove', (event) => {
        pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    });

    const visObserver = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) start();
    });
    visObserver.observe(container);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isVisible) start();
    });

    start();

    function start() {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
    }

    function tick() {
        if (!isVisible || document.hidden) return;

        const t = clock.getElapsedTime();
        const pos = positionAttr.array;

        for (let i = 0; i < count; i += 1) {
            const i3 = i * 3;
            const local = clamp((t - ASSEMBLE_DELAY_S - delays[i]) / ASSEMBLE_DURATION_S, 0, 1);
            const e = easeInOutCubic(local);
            const drift = Math.sin(t * 0.65 + phases[i]) * 0.07 * e;
            pos[i3] = scatter[i3] + (grid[i3] - scatter[i3]) * e;
            pos[i3 + 1] = scatter[i3 + 1] + (grid[i3 + 1] - scatter[i3 + 1]) * e + drift;
            pos[i3 + 2] = scatter[i3 + 2] + (grid[i3 + 2] - scatter[i3 + 2]) * e;
        }
        positionAttr.needsUpdate = true;

        frame.material.opacity =
            FRAME_MAX_OPACITY * easeInOutCubic(clamp((t - FRAME_FADE_START_S) / FRAME_FADE_LEN_S, 0, 1));

        pointer.x += (pointer.tx - pointer.x) * 0.05;
        pointer.y += (pointer.ty - pointer.y) * 0.05;
        group.rotation.y = t * 0.05 + pointer.x * 0.18;
        group.rotation.x = -0.06 + pointer.y * 0.1;

        renderer.render(scene, camera);
        rafId = requestAnimationFrame(tick);
    }

    function layout() {
        const w = container.clientWidth;
        const h = container.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        // Push the lattice toward the photo column on wide screens.
        group.position.x = window.innerWidth > DESKTOP_BREAKPOINT_PX ? 3.4 : 0;
        if (reducedMotion) renderer.render(scene, camera);
    }
}

function buildParticles() {
    const count = COLS * ROWS * LAYERS;
    const scatter = new Float32Array(count * 3);
    const grid = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const delays = new Float32Array(count);
    const phases = new Float32Array(count);

    const ink = new THREE.Color('#3a404c');
    const cobalt = new THREE.Color('#2334e0');
    const periwinkle = new THREE.Color('#8d9aff');

    let i = 0;
    for (let x = 0; x < COLS; x += 1) {
        for (let y = 0; y < ROWS; y += 1) {
            for (let z = 0; z < LAYERS; z += 1) {
                const i3 = i * 3;
                grid[i3] = (x / (COLS - 1) - 0.5) * LATTICE_W;
                grid[i3 + 1] = (y / (ROWS - 1) - 0.5) * LATTICE_H;
                grid[i3 + 2] = (z / (LAYERS - 1) - 0.5) * LATTICE_D;

                const dir = new THREE.Vector3().randomDirection();
                const r = Math.cbrt(Math.random()) * SCATTER_RADIUS;
                scatter[i3] = dir.x * r;
                scatter[i3 + 1] = dir.y * r;
                scatter[i3 + 2] = dir.z * r;

                const roll = Math.random();
                const tint = roll < 0.08 ? cobalt : roll < 0.13 ? periwinkle : ink;
                colors[i3] = tint.r;
                colors[i3 + 1] = tint.g;
                colors[i3 + 2] = tint.b;

                delays[i] = Math.random() * MAX_STAGGER_S;
                phases[i] = Math.random() * Math.PI * 2;
                i += 1;
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(scatter.slice(), 3);
    geometry.setAttribute('position', positionAttr);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.13,
        map: makeDotTexture(),
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        sizeAttenuation: true,
    });

    return { points: new THREE.Points(geometry, material), scatter, grid, delays, phases, positionAttr };
}

function buildFrame() {
    const box = new THREE.BoxGeometry(LATTICE_W + 1, LATTICE_H + 1, LATTICE_D + 0.8);
    const edges = new THREE.EdgesGeometry(box);
    const material = new THREE.LineBasicMaterial({
        color: new THREE.Color('#2334e0'),
        transparent: true,
        opacity: 0,
    });
    return new THREE.LineSegments(edges, material);
}

function makeDotTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
