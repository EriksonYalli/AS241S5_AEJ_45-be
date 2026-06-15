/* ══════════════════════════════════════
   AI INSIGHT — script.js
══════════════════════════════════════ */
const API_BASE = "http://localhost:8081/api";
let currentApi = "textgears";
let totalRequests = 0;

// ── DOM refs ────────────────────────────────────────
const textInput = document.getElementById('text-input');
const btnAnalyze = document.getElementById('btn-analyze');
const btnTextGears = document.getElementById('btn-textgears');
const btnCopilot = document.getElementById('btn-copilot');
const chatContainer = document.getElementById('chat-container');
const typingIndicator = document.getElementById('typing-indicator');
const historyList = document.getElementById('history-list');
const historyCount = document.getElementById('history-count');
const reqCount = document.getElementById('req-count');
const apiModeBadge = document.getElementById('current-api-badge');
const pillTextGears = document.getElementById('pill-textgears');
const pillCopilot = document.getElementById('pill-copilot');

// ── Particle canvas ──────────────────────────────────
(function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function createParticle() {
        return {
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.5 + 0.3,
            alpha: Math.random() * 0.5 + 0.1,
            dx: (Math.random() - 0.5) * 0.25,
            dy: (Math.random() - 0.5) * 0.25,
        };
    }

    function init() {
        resize();
        particles = Array.from({ length: 120 }, createParticle);
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(157,80,187,${p.alpha})`;
            ctx.fill();

            p.x += p.dx;
            p.y += p.dy;

            if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
        });
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    init();
    draw();
})();

// ── Auto-resize textarea ─────────────────────────────
textInput.addEventListener('input', () => {
    textInput.style.height = 'auto';
    textInput.style.height = Math.min(textInput.scrollHeight, 100) + 'px';
});

// ── Keyboard: Enter to send, Shift+Enter for newline ─
textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!btnAnalyze.disabled) analyzeText();
    }
});

// ── API switch ───────────────────────────────────────
const setApi = (api) => {
    currentApi = api;

    // Tabs
    btnTextGears.classList.toggle('active', api === 'textgears');
    btnCopilot.classList.toggle('active', api === 'copilot');

    // Sidebar pills
    pillTextGears.classList.toggle('active', api === 'textgears');
    pillCopilot.classList.toggle('active', api === 'copilot');

    // Header badge
    if (api === 'textgears') {
        apiModeBadge.innerHTML = '<i class="fa-solid fa-spell-check"></i> TextGears';
        textInput.placeholder = 'Corrige gramática y ortografía con TextGears...';
    } else {
        apiModeBadge.innerHTML = '<i class="fa-solid fa-robot"></i> Copilot';
        textInput.placeholder = 'Chatea con Copilot AI...';
    }

    // Clear chat
    chatContainer.innerHTML = '';
    typingIndicator.classList.add('hidden');
    fetchHistory();
};

// ── Fetch history ────────────────────────────────────
const fetchHistory = async () => {
    try {
        const res = await fetch(`${API_BASE}/logs`);
        const data = await res.json();

        const filtered = data.filter(log => {
            const name = (log.apiName || log.api_name || '').toLowerCase();
            return name === currentApi.toLowerCase();
        });

        historyCount.textContent = filtered.length;

        if (filtered.length === 0) {
            historyList.innerHTML = '<p class="empty-msg"><i class="fa-regular fa-clock"></i> Sin consultas para esta API</p>';
            return;
        }

        historyList.innerHTML = filtered.map(log => {
            const apiName = log.apiName || log.api_name || 'unknown';
            const time = log.createdAt || log.created_at;
            const text = log.requestText || log.request_text || '';
            return `
            <div class="history-item">
                <div class="history-item-header">
                    <span class="api-badge badge-${apiName.toLowerCase()}">${apiName}</span>
                    <span class="history-time">${time ? new Date(time).toLocaleTimeString() : ''}</span>
                </div>
                <div class="history-item-text">${text}</div>
            </div>`;
        }).join('');

    } catch (err) {
        console.warn('History fetch failed:', err.message);
    }
};

// ── Clear chat ───────────────────────────────────────
window.clearChat = () => {
    chatContainer.innerHTML = '';
    typingIndicator.classList.add('hidden');
};

// ── Add bubble ───────────────────────────────────────
const addBubble = (content, type, tickId = null) => {
    const div = document.createElement('div');
    div.classList.add('bubble', `bubble-${type}`);

    if (type === 'user') {
        div.innerHTML = `${escapeHtml(content)}<div class="ticks" id="${tickId}"><span>✓</span><span>✓</span></div>`;
    } else if (type === 'error') {
        div.style.color = '#ff6b6b';
        div.style.borderColor = 'rgba(255,80,80,0.3)';
        div.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${escapeHtml(content)}`;
    } else {
        div.innerHTML = content;
    }

    chatContainer.appendChild(div);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return div;
};

const escapeHtml = (str) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── Main analyze ─────────────────────────────────────
const analyzeText = async () => {
    const text = textInput.value.trim();
    if (!text) {
        textInput.focus();
        textInput.style.borderColor = '#ff6b6b';
        setTimeout(() => textInput.style.borderColor = '', 800);
        return;
    }

    const tickId = `ticks-${Date.now()}`;
    addBubble(text, 'user', tickId);

    textInput.value = '';
    textInput.style.height = 'auto';
    typingIndicator.classList.remove('hidden');
    chatContainer.scrollTop = chatContainer.scrollHeight;
    btnAnalyze.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/${currentApi}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text }),
        });

        const data = await res.json();

        // Mark ticks as seen
        const tickEl = document.getElementById(tickId);
        if (tickEl) tickEl.classList.add('seen');

        // Small natural delay
        await new Promise(r => setTimeout(r, 500));

        let message = '';
        try {
            const parsed = typeof data === 'string' ? JSON.parse(data) : data;
            if (currentApi === 'textgears') {
                message = parsed.response?.corrected ?? parsed.corrected ?? JSON.stringify(parsed);
            } else {
                message = parsed.data?.message ?? parsed.message ?? JSON.stringify(parsed);
            }
        } catch {
            message = String(data);
        }

        addBubble(message, 'ai');

        totalRequests++;
        reqCount.textContent = totalRequests;

        await fetchHistory();

    } catch (err) {
        addBubble(`Error: ${err.message}`, 'error');
    } finally {
        typingIndicator.classList.add('hidden');
        btnAnalyze.disabled = false;
        textInput.focus();
    }
};

// ── Events ───────────────────────────────────────────
btnTextGears.addEventListener('click', () => setApi('textgears'));
btnCopilot.addEventListener('click', () => setApi('copilot'));
btnAnalyze.addEventListener('click', analyzeText);

// ── Init ─────────────────────────────────────────────
setApi('textgears');

/* ══════════════════════════════════════
   3D ROBOT — Three.js
══════════════════════════════════════ */
(function initRobot() {
    if (typeof THREE === 'undefined') return;

    const canvas = document.getElementById('robot-canvas');
    const container = document.getElementById('robot-container');
    const W = 160, H = 200;

    // Scene
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0.5, 5);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;

    // Lights
    const ambient = new THREE.AmbientLight(0x9d50bb, 0.6);
    scene.add(ambient);

    const pointLight = new THREE.PointLight(0x00f2fe, 2, 15);
    pointLight.position.set(3, 4, 3);
    scene.add(pointLight);

    const fillLight = new THREE.PointLight(0x9d50bb, 1.5, 10);
    fillLight.position.set(-3, -2, 2);
    scene.add(fillLight);

    // Materials
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x1a1040,
        metalness: 0.8,
        roughness: 0.15,
    });
    const accentMat = new THREE.MeshStandardMaterial({
        color: 0x9d50bb,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0x9d50bb,
        emissiveIntensity: 0.3,
    });
    const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x00f2fe,
        emissive: 0x00f2fe,
        emissiveIntensity: 1.2,
        metalness: 0,
        roughness: 0,
    });
    const lightMat = new THREE.MeshStandardMaterial({
        color: 0xff6b6b,
        emissive: 0xff6b6b,
        emissiveIntensity: 0.8,
    });

    // Helper: box mesh
    const box = (w, h, d, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z); m.castShadow = true;
        return m;
    };
    const sphere = (r, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 16), mat);
        m.position.set(x, y, z);
        return m;
    };
    const cyl = (r, h, mat, x = 0, y = 0, z = 0) => {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat);
        m.position.set(x, y, z);
        return m;
    };

    // ── Robot group ───────────────────────────────────
    const robot = new THREE.Group();

    // Torso
    const torso = box(0.9, 1.1, 0.55, bodyMat, 0, 0, 0);
    // Torso chest panel
    const panel = box(0.55, 0.45, 0.05, accentMat, 0, 0.05, 0.28);
    // Chest light
    const chestLight = sphere(0.09, lightMat, 0, 0.05, 0.34);
    torso.add(panel, chestLight);
    robot.add(torso);

    // Head group (for rotation toward mouse)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.85, 0);
    robot.add(headGroup);

    const head = box(0.72, 0.6, 0.55, bodyMat, 0, 0, 0);
    headGroup.add(head);

    // Visor
    const visor = box(0.62, 0.22, 0.04, accentMat, 0, 0.05, 0.28);
    headGroup.add(visor);

    // Eyes
    const eyeL = sphere(0.07, eyeMat, -0.14, 0.06, 0.3);
    const eyeR = sphere(0.07, eyeMat, 0.14, 0.06, 0.3);
    headGroup.add(eyeL, eyeR);

    // Antenna
    const antennaBase = cyl(0.04, 0.1, accentMat, 0, 0.35, 0);
    const antennaTip = sphere(0.06, eyeMat, 0, 0.46, 0);
    headGroup.add(antennaBase, antennaTip);

    // Ears
    const earL = box(0.08, 0.22, 0.22, accentMat, -0.41, 0, 0);
    const earR = box(0.08, 0.22, 0.22, accentMat, 0.41, 0, 0);
    headGroup.add(earL, earR);

    // Neck
    const neck = cyl(0.1, 0.15, bodyMat, 0, 0.63, 0);
    robot.add(neck);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.2, 0.75, 0.2);
    const armL = new THREE.Mesh(armGeo, bodyMat);
    armL.position.set(-0.6, -0.05, 0);
    const armR = new THREE.Mesh(armGeo, bodyMat);
    armR.position.set(0.6, -0.05, 0);
    // Arm accents
    const aAccL = box(0.22, 0.08, 0.22, accentMat, -0.6, 0.22, 0);
    const aAccR = box(0.22, 0.08, 0.22, accentMat, 0.6, 0.22, 0);
    // Hands
    const handL = sphere(0.12, bodyMat, -0.6, -0.45, 0);
    const handR = sphere(0.12, bodyMat, 0.6, -0.45, 0);
    robot.add(armL, armR, aAccL, aAccR, handL, handR);

    // Legs
    const legGeo = new THREE.BoxGeometry(0.28, 0.6, 0.28);
    const legL = new THREE.Mesh(legGeo, bodyMat);
    legL.position.set(-0.25, -0.88, 0);
    const legR = new THREE.Mesh(legGeo, bodyMat);
    legR.position.set(0.25, -0.88, 0);
    // Feet
    const footL = box(0.32, 0.12, 0.38, accentMat, -0.25, -1.24, 0.04);
    const footR = box(0.32, 0.12, 0.38, accentMat, 0.25, -1.24, 0.04);
    robot.add(legL, legR, footL, footR);

    robot.position.y = -0.3;
    scene.add(robot);

    // ── Mouse tracking ────────────────────────────────
    let targetRotX = 0, targetRotY = 0;
    let currentRotX = 0, currentRotY = 0;

    document.addEventListener('mousemove', (e) => {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;

        // Horizontal: -1 to 1 (left to right)
        const nx = (e.clientX - cx) / cx;
        // Vertical: -1 to 1 (top to bottom) -> Inverted for 3D (1 is top, -1 is bottom)
        const ny = (cy - e.clientY) / cy;

        targetRotY = nx * 0.8; // Looking left/right
        targetRotX = ny * 0.45; // Looking up/down
    });

    // ── Animation loop ────────────────────────────────
    let t = 0;
    const animate = () => {
        requestAnimationFrame(animate);
        t += 0.02;

        // Float idle animation
        robot.position.y = -0.3 + Math.sin(t) * 0.08;

        // Arm swing
        armL.rotation.z = 0.1 + Math.sin(t) * 0.08;
        armR.rotation.z = -0.1 - Math.sin(t) * 0.08;

        // Eye glow pulse
        eyeMat.emissiveIntensity = 0.8 + Math.sin(t * 2) * 0.4;
        antennaTip.material.emissiveIntensity = 0.6 + Math.sin(t * 3) * 0.4;

        // Smooth head track mouse
        currentRotY += (targetRotY - currentRotY) * 0.12;
        currentRotX += (targetRotX - currentRotX) * 0.12;

        // headGroup rotation
        headGroup.rotation.y = currentRotY;
        headGroup.rotation.x = currentRotX;

        // Body follows slightly
        robot.rotation.y = currentRotY * 0.25;
        robot.rotation.x = currentRotX * 0.1;

        renderer.render(scene, camera);
    };

    animate();
})();
