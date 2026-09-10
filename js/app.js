// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyBx2LdEojJoyd5YZs4XeeoR-K2GuPRikTs",
  authDomain: "icfes-64344.firebaseapp.com",
  projectId: "icfes-64344",
  storageBucket: "icfes-64344.firebasestorage.app",
  messagingSenderId: "842370679823",
  appId: "1:842370679823:web:b834e95008effc0fb70f7a"
};

let db = null;
let firebaseLoaded = false;

async function loadFirebase() {
  if (firebaseLoaded) return;
  
  const scripts = [
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js'
  ];
  
  for (const src of scripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseLoaded = true;
    updateConnectionStatus(true);
    startRankingListener();
  } else {
    updateConnectionStatus(false);
  }
}

function updateConnectionStatus(connected) {
  const el = document.getElementById('connectionStatus');
  if (!el) return;
  el.className = 'connection-status ' + (connected ? 'online' : 'offline');
  el.innerHTML = `<span class="dot"></span> ${connected ? 'En línea' : 'Sin conectar'}`;
}

// ===== DATA =====
let BANCO = [];

async function loadBanco() {
  try {
    const res = await fetch('data/banco.json');
    BANCO = await res.json();
  } catch (e) {
    console.error('Error cargando banco:', e);
    BANCO = [];
  }
}

const AREAS = {
  matematicas: { nombre: 'Matemáticas', peso: 3, icon: '数', color: '#c9beff' },
  lectura: { nombre: 'Lectura Crítica', peso: 3, icon: '文', color: '#edb8cc' },
  sociales: { nombre: 'Sociales y Ciudadanas', peso: 3, icon: '国', color: '#c9c3dc' },
  ciencias: { nombre: 'Ciencias Naturales', peso: 3, icon: '理', color: '#e6deff' },
  ingles: { nombre: 'Inglés', peso: 1, icon: '語', color: '#ffb4ab' }
};

// ===== STATE =====
let state = {
  mode: null,
  questions: [],
  currentIndex: 0,
  answers: {},
  correct: {},
  startTime: null,
  timerInterval: null,
  elapsed: 0,
  errors: [],
  playerName: localStorage.getItem('icfes_name') || '',
  rankingTab: 'global',
  rankingData: [],
  rankingUnsubscribe: null,
  dotsCollapsed: true
};

// Load errors from localStorage
try {
  state.errors = JSON.parse(localStorage.getItem('icfes_errors') || '[]');
} catch(e) { state.errors = []; }

// ===== FIREBASE =====
function saveScoreToFirebase(score, area) {
  if (!db || !state.playerName) return;
  
  const scoreData = {
    name: state.playerName,
    score: score,
    area: area || 'global',
    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    date: new Date().toLocaleDateString('es-CO'),
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  };
  
  db.collection('scores').add(scoreData).catch(e => console.error(e));
}

function startRankingListener() {
  if (!db) return;
  if (state.rankingUnsubscribe) state.rankingUnsubscribe();
  
  let query = db.collection('scores').orderBy('score', 'desc').limit(50);
  if (state.rankingTab !== 'global') {
    query = query.where('area', '==', state.rankingTab);
  }
  
  state.rankingUnsubscribe = query.onSnapshot(snapshot => {
    state.rankingData = [];
    snapshot.forEach(doc => state.rankingData.push({ id: doc.id, ...doc.data() }));
    renderRanking();
  }, () => updateConnectionStatus(false));
}

function renderRanking() {
  const container = document.getElementById('rankingList');
  if (!container) return;
  
  if (state.rankingData.length === 0) {
    container.innerHTML = `<div class="ranking-empty"><div class="icon">位</div><p>No hay puntajes aún</p><p style="font-size:12px;margin-top:4px;">¡Sé el primero!</p></div>`;
    return;
  }
  
  let html = `<div class="ranking-header"><span>#</span><span>Nombre</span><span>Puntaje</span><span class="detail">Detalle</span><span class="date">Fecha</span></div>`;
  
  state.rankingData.forEach((item, i) => {
    const topClass = i < 3 ? `top-${i+1}` : '';
    const initials = (item.name || '?').substring(0, 2).toUpperCase();
    const detail = item.area && item.area !== 'global' ? (AREAS[item.area]?.nombre || item.area) : 'Global';
    html += `<div class="ranking-row ${topClass}"><span class="pos">${i + 1}</span><span class="name"><span class="avatar">${initials}</span>${item.name || 'Anónimo'}</span><span class="score">${item.score}</span><span class="detail">${detail}</span><span class="date">${item.date || ''}</span></div>`;
  });
  
  container.innerHTML = html;
}

// ===== NAME MODAL =====
function showNameModal() {
  if (state.playerName) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'nameModal';
  overlay.innerHTML = `
    <div class="modal">
      <h3>¿Cómo te llamas?</h3>
      <p>Tu nombre aparecerá en el ranking cuando termines un examen.</p>
      <input type="text" class="modal-input" id="nameInput" placeholder="Tu nombre..." maxlength="20">
      <div class="modal-buttons">
        <button class="btn btn-secondary" onclick="closeNameModal()">Omitir</button>
        <button class="btn btn-primary" onclick="saveName()">Guardar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('nameInput').focus(), 100);
  document.getElementById('nameInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') saveName(); });
}

function saveName() {
  const name = document.getElementById('nameInput').value.trim();
  if (name) {
    state.playerName = name;
    localStorage.setItem('icfes_name', name);
  }
  closeNameModal();
}

function closeNameModal() {
  const modal = document.getElementById('nameModal');
  if (modal) modal.remove();
}

// ===== EXAMEN: estructura oficial + rotación =====
// Proporción real del ICFES (254 calificables) escalada a examen de 50:
// Mat 50/254→10 · Lec 41/254→8 · Soc 50/254→10 · Cie 58/254→11 · Ing 55/254→11
const EXAMEN_BLUEPRINT = { matematicas: 10, lectura: 8, sociales: 10, ciencias: 11, ingles: 11 };
// Examen por materia: tamaño real de cada prueba oficial
const AREA_EXAM_SIZE = { matematicas: 50, lectura: 41, sociales: 50, ciencias: 58, ingles: 55 };

// Fisher-Yates (sin sesgo)
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Rotación: prioriza preguntas no vistas (localStorage 'icfes_seen').
function getSeenIds() {
  try { return new Set(JSON.parse(localStorage.getItem('icfes_seen') || '[]')); }
  catch (e) { return new Set(); }
}

function markSeen(questions) {
  try {
    const seen = getSeenIds();
    questions.forEach(q => seen.add(q.id));
    localStorage.setItem('icfes_seen', JSON.stringify([...seen]));
  } catch (e) { /* almacenamiento lleno o bloqueado: rotación sigue aleatoria */ }
}

// Toma n preguntas de un pool priorizando las no vistas.
// Si las no vistas no alcanzan, completa con vistas (y resetea ese pool).
function sampleRotating(pool, n) {
  const seen = getSeenIds();
  const unseen = pool.filter(q => !seen.has(q.id));
  const picked = shuffle(unseen).slice(0, n);
  if (picked.length < n) {
    const need = n - picked.length;
    const rest = shuffle(pool.filter(q => !picked.includes(q)));
    picked.push(...rest.slice(0, need));
  }
  return shuffle(picked);
}

// Proporción oficial por partes (notebook ICFES): inglés P1 6/P2 6/P3 6/P4 10/P5 9/P6 6/P7 12 (de 55)
const PLAN_INGLES_50 = { P1: 1, P2: 1, P3: 1, P4: 2, P5: 2, P6: 1, P7: 3 };
const PLAN_INGLES_55 = { P1: 6, P2: 6, P3: 6, P4: 10, P5: 9, P6: 6, P7: 12 };
// Lectura oficial: Ubicar 25% / Global 42% / Evaluar 33% → examen-8: 2/3/3 · área-41: 10/17/14
const PLAN_LECTURA_8 = { L: 2, G: 3, E: 3 };
const PLAN_LECTURA_41 = { L: 10, G: 17, E: 14 };

function parteIngles(q) {
  const t = (q.competencia || '') + ' ' + (q.tema || '');
  if (/Parte 7/.test(t)) return 'P7';
  if (/Parte 6/.test(t)) return 'P6';
  if (/Parte 5/.test(t)) return 'P5';
  if (/Parte 4/.test(t) || /Cloze/.test(t)) return 'P4';
  if (/Parte 3/.test(t)) return 'P3';
  if (/Parte 2/.test(t)) return 'P2';
  if (/Parte 1(?!\-)/.test(t) || /Matching/.test(t)) return 'P1';
  return 'X';
}

function parteLectura(q) {
  const t = (q.competencia || '') + ' ' + (q.tema || '');
  if (/local/i.test(t)) return 'L';
  if (/global/i.test(t)) return 'G';
  if (/evaluar|reflexionar/i.test(t)) return 'E';
  return 'X';
}

// Toma rotando: primero cada parte según plan, faltantes desde el resto (X primero)
function takeRot(pool, pred, k, used) {
  const sub = pool.filter(q => !used.has(q.id) && pred(q));
  const got = sampleRotating(sub, Math.min(k, sub.length));
  got.forEach(q => used.add(q.id));
  return got;
}

function samplePorPartes(pool, plan, keyFn) {
  const used = new Set();
  let out = [];
  Object.keys(plan).forEach(p => {
    takeRot(pool, q => keyFn(q) === p, plan[p] || 0, used).forEach(q => out.push(q));
  });
  const total = Object.values(plan).reduce((a, b) => a + b, 0);
  let need = total - out.length;
  if (need > 0) {
    const restX = pool.filter(q => !used.has(q.id) && keyFn(q) === 'X');
    takeRot(restX, () => true, need, used).forEach(q => out.push(q));
    need = total - out.length;
  }
  if (need > 0) {
    const rest = pool.filter(q => !used.has(q.id));
    takeRot(rest, () => true, need, used).forEach(q => out.push(q));
  }
  return out;
}

function buildExamenCompleto() {
  // Bloques por materia (orden de sesión oficial ICFES), mezclado dentro de cada bloque.
  // Inglés y lectura respetan su proporción oficial por partes/competencias.
  const poolIng = BANCO.filter(q => q.area === 'ingles');
  const poolLec = BANCO.filter(q => q.area === 'lectura');
  const bloques = {
    matematicas: sampleRotating(BANCO.filter(q => q.area === 'matematicas'), EXAMEN_BLUEPRINT.matematicas),
    lectura: samplePorPartes(poolLec, PLAN_LECTURA_8, parteLectura),
    sociales: sampleRotating(BANCO.filter(q => q.area === 'sociales'), EXAMEN_BLUEPRINT.sociales),
    ciencias: sampleRotating(BANCO.filter(q => q.area === 'ciencias'), EXAMEN_BLUEPRINT.ciencias),
    ingles: samplePorPartes(poolIng, PLAN_INGLES_50, parteIngles)
  };
  let out = [];
  ['matematicas', 'lectura', 'sociales', 'ciencias', 'ingles'].forEach(area => {
    out = out.concat(agruparEstimulos(bloques[area]));
  });
  return out;
}

// Ordena para que las preguntas del mismo estímulo queden adyacentes (sin mezclar bloques)
function agruparEstimulos(qs) {
  return [...qs].sort((a, b) => {
    const ka = a.stimulus_id || ('~' + a.id);
    const kb = b.stimulus_id || ('~' + b.id);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return (a.stimulus_orden || 0) - (b.stimulus_orden || 0);
  });
}

// Limpia la numeración original del cuadernillo pegada al texto ("23. ...", ". Lea...")
function stripNumeroOrigen(t) {
  return (t || '').replace(/^\s*(\d+\s*\.\s*|\.\s+)/, '');
}

function buildExamenArea(area) {
  const pool = BANCO.filter(q => q.area === area);
  let qs;
  if (area === 'ingles') qs = samplePorPartes(pool, PLAN_INGLES_55, parteIngles);
  else if (area === 'lectura') qs = samplePorPartes(pool, PLAN_LECTURA_41, parteLectura);
  else {
    const n = Math.min(AREA_EXAM_SIZE[area] || pool.length, pool.length);
    qs = sampleRotating(pool, n);
  }
  return agruparEstimulos(qs);
}

// ===== MODES =====
function startMode(mode) {
  state.mode = mode;
  state.currentIndex = 0;
  state.answers = {};
  state.correct = {};
  state.elapsed = 0;

  if (mode === 'examen') {
    state.questions = buildExamenCompleto();
    markSeen(state.questions);
    startTimer();
  } else {
    return;
  }

  showQuestionSection();
  renderQuestion();
}

function startAreaExam(area) {
  state.mode = 'area';
  state.currentIndex = 0;
  state.answers = {};
  state.correct = {};
  state.elapsed = 0;
  state.questions = buildExamenArea(area);
  markSeen(state.questions);
  startTimer();
  showQuestionSection();
  renderQuestion();
}

function startTimer() {
  state.startTime = Date.now();
  document.getElementById('timerContainer').style.display = 'flex';
  state.timerInterval = setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = null;
  document.getElementById('timerContainer').style.display = 'none';
}

function updateTimerDisplay() {
  const h = Math.floor(state.elapsed / 3600);
  const m = Math.floor((state.elapsed % 3600) / 60);
  const s = state.elapsed % 60;
  const el = document.getElementById('timer');
  el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  el.className = 'timer';
  if (state.elapsed > 16200) el.classList.add('danger');
  else if (state.elapsed > 14400) el.classList.add('warning');
}

function showQuestionSection() {
  document.getElementById('landing').style.display = 'none';
  document.getElementById('questionSection').classList.add('active');
  document.getElementById('resultsSection').classList.remove('active');
  
  const filters = document.getElementById('filters');
  if (filters) filters.style.display = 'none';
  document.getElementById('statsBar').style.display = (state.mode === 'examen' || state.mode === 'area') ? 'flex' : 'none';
  document.getElementById('progressContainer').style.display = 'block';
  
  state.dotsCollapsed = state.questions.length > 50;
}

// ===== SOCRATIC EXPLANATION BUILDER =====
function buildSocraticFeedback(q, selectedIdx) {
  const isCorrect = selectedIdx === q.respuesta_correcta;
  const correctLetter = ['A', 'B', 'C', 'D', 'E', 'F', 'G'][q.respuesta_correcta];
  const selectedLetter = ['A', 'B', 'C', 'D', 'E', 'F', 'G'][selectedIdx];
  
  let html = '';
  
  // Estado: correcto o incorrecto
  if (isCorrect) {
    html += `<div class="feedback-header feedback-correct">正 ¡Correcto! La respuesta es ${correctLetter}</div>`;
  } else {
    html += `<div class="feedback-header feedback-incorrect">誤 Incorrecto. Elegiste ${selectedLetter}, la correcta es ${correctLetter}</div>`;
  }
  
  // Explicación (si existe)
  if (q.explicacion) {
    html += `<div class="feedback-explanation"><strong>解 Explicación:</strong> ${q.explicacion}</div>`;
  }
  
  // Método socrático: guiar con preguntas
  if (q.tema) {
    html += `<div class="feedback-socratic"><strong>省 Para reflexionar:</strong> `;
    if (isCorrect) {
      html += `Excelente elección. ¿Podrías explicar por qué la opción ${correctLetter} es correcta sin mirar la explicación? Esto ayudará a consolidar tu conocimiento sobre <em>${q.tema}</em>.`;
    } else {
      html += `Cuando revises esta pregunta de <em>${q.tema}</em>, pregúntate: ¿qué información clave del enunciado me faltó por considerar? ¿Qué distractor me confundió y por qué?`;
    }
    html += `</div>`;
  }
  
  // Competencia evaluada
  if (q.competencia && q.competencia !== q.tema) {
    html += `<div class="feedback-competencia"><strong>技 Competencia:</strong> ${q.competencia}</div>`;
  }
  
  return html;
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;
  
  const container = document.getElementById('questionContainer');
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const opts = (q.opciones || []).map(stripNumeroOrigen);
  const stem = stripNumeroOrigen(q.enunciado);
  const isAnswered = state.answers[state.currentIndex] !== undefined;
  const selectedIdx = state.answers[state.currentIndex];
  
  // Estímulo compartido: se muestra una vez por grupo, luego referencia
  const prevQ = state.questions[state.currentIndex - 1];
  const mismoGrupo = prevQ && q.stimulus_id && prevQ.stimulus_id === q.stimulus_id;
  let passageHtml = '';
  if (q.pasaje && !mismoGrupo) {
    passageHtml = `<div class="question-passage">${q.pasaje}</div>`;
  } else if (q.pasaje && mismoGrupo) {
    const totalGrupo = state.questions.filter(x => x.stimulus_id === q.stimulus_id).length;
    passageHtml = `<div class="question-passage group-ref">↑ Mismo texto anterior · pregunta ${q.stimulus_orden || '?'} de ${totalGrupo} del grupo</div>`;
  }
  
  let optionsHtml = '';
  opts.forEach((opt, i) => {
    const isCorrect = i === q.respuesta_correcta;
    let cls = 'option';
    
    if (isAnswered) {
      if (selectedIdx === i) {
        cls += isCorrect ? ' correct' : ' incorrect';
      } else {
        cls += ' disabled';
      }
    }
    
    optionsHtml += `
      <div class="${cls}" onclick="selectOption(${i})" id="opt-${i}">
        <div class="option-letter">${letters[i]}</div>
        <div class="option-text">${opt}</div>
      </div>`;
  });
  
  // Feedback socrático (visible después de responder en exámenes)
  let feedbackHtml = '';
  if (isAnswered && (state.mode === 'examen' || state.mode === 'area')) {
    feedbackHtml = `<div class="socratic-feedback fade-in">${buildSocraticFeedback(q, selectedIdx)}</div>`;
  }
  
  // Figura con HTML/CSS/SVG (barras, tabla, plano) o imagen
  let figuraHtml = '';
  if (q.figura) figuraHtml = renderFigura(q.figura);
  else if (q.media) figuraHtml = `<img class="fig-img" src="${q.media}" alt="${(q.media_alt || 'Figura de la pregunta').replace(/"/g, '&quot;')}">`;

  container.innerHTML = `
    <div class="question-card fade-in">
      <div class="question-header">
        <div class="question-meta">
          <span class="question-tag competencia">${q.tema || q.competencia || ''}</span>
          <span class="question-tag dificultad-${q.dificultad || 'media'}">${q.dificultad || 'media'}</span>
        </div>
      </div>
      ${passageHtml}
      ${figuraHtml}
      <div class="question-text">${stem}</div>
      <div class="options">${optionsHtml}</div>
      ${feedbackHtml}
    </div>`;
  
  updateProgress();
  renderDots();
  renderNavButtons();
}

// ===== FIGURAS (HTML/CSS/SVG) =====
// q.figura: {tipo:'barras'|'tabla'|'plano', titulo, ...}
//   barras: {titulo, unidad, datos:[{etiqueta, valor}]}
//   tabla: {titulo, columnas:[], filas:[[]]}
//   plano: {titulo, puntos:[{x, y, nombre}]}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderFigura(f) {
  if (!f || !f.tipo) return '';
  let html = `<div class="figura"><div class="figura-titulo">${esc(f.titulo || 'Figura')}</div>`;
  if (f.tipo === 'tabla') {
    html += '<table class="fig-table"><thead><tr>';
    (f.columnas || []).forEach(c => { html += `<th>${esc(c)}</th>`; });
    html += '</tr></thead><tbody>';
    (f.filas || []).forEach(fila => {
      html += '<tr>';
      fila.forEach(celda => { html += `<td>${esc(celda)}</td>`; });
      html += '</tr>';
    });
    html += '</tbody></table>';
  } else if (f.tipo === 'barras') {
    const datos = f.datos || [];
    const max = Math.max.apply(null, [0].concat(datos.map(d => Number(d.valor) || 0))) || 1;
    datos.forEach(d => {
      const pct = Math.round((Number(d.valor) || 0) / max * 100);
      html += `<div class="fig-bar-row"><span class="fig-bar-label">${esc(d.etiqueta)}</span>` +
        `<span class="fig-bar-track"><span class="fig-bar-fill" style="width:${pct}%"></span></span>` +
        `<span class="fig-bar-value">${esc(d.valor)}${f.unidad ? ' ' + esc(f.unidad) : ''}</span></div>`;
    });
  } else if (f.tipo === 'plano') {
    const pts = f.puntos || [];
    const W = 240, H = 240, P = 24;
    let xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    let minX = Math.min.apply(null, [0].concat(xs)) - 1, maxX = Math.max.apply(null, [0].concat(xs)) + 1;
    let minY = Math.min.apply(null, [0].concat(ys)) - 1, maxY = Math.max.apply(null, [0].concat(ys)) + 1;
    const X = v => P + (v - minX) / (maxX - minX) * (W - 2 * P);
    const Y = v => H - P - (v - minY) / (maxY - minY) * (H - 2 * P);
    html += `<svg class="fig-plane" viewBox="0 0 ${W} ${H}" role="img">`;
    for (let gx = Math.ceil(minX); gx <= maxX; gx++) {
      html += `<line x1="${X(gx)}" y1="${P}" x2="${X(gx)}" y2="${H - P}" class="grid"/>`;
    }
    for (let gy = Math.ceil(minY); gy <= maxY; gy++) {
      html += `<line x1="${P}" y1="${Y(gy)}" x2="${W - P}" y2="${Y(gy)}" class="grid"/>`;
    }
    html += `<line x1="${X(0)}" y1="${P}" x2="${X(0)}" y2="${H - P}" class="axis"/>` +
            `<line x1="${P}" y1="${Y(0)}" x2="${W - P}" y2="${Y(0)}" class="axis"/>`;
    pts.forEach(p => {
      html += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4.5" class="pt"/>` +
              `<text x="${X(p.x) + 8}" y="${Y(p.y) - 8}" class="pt-label">${esc(p.nombre || '')}(${p.x},${p.y})</text>`;
    });
    html += '</svg>';
  }
  html += '</div>';
  return html;
}

// ===== SELECT OPTION =====
function selectOption(idx) {
  const q = state.questions[state.currentIndex];
  
  // No permitir cambiar respuesta
  if (state.answers[state.currentIndex] !== undefined) return;
  
  state.answers[state.currentIndex] = idx;
  state.correct[state.currentIndex] = (idx === q.respuesta_correcta);
  
  // Guardar errores
  if (idx !== q.respuesta_correcta) {
    const errorQ = state.questions[state.currentIndex];
    if (!state.errors.find(e => e.id === errorQ.id)) {
      state.errors.push(errorQ);
      localStorage.setItem('icfes_errors', JSON.stringify(state.errors));
    }
  }
  
  // Actualizar UI
  document.querySelectorAll('.option').forEach((el, i) => {
    el.classList.remove('selected', 'correct', 'incorrect', 'disabled');
    if (i === idx) {
      el.classList.add(idx === q.respuesta_correcta ? 'correct' : 'incorrect');
    } else {
      el.classList.add('disabled');
    }
  });
  
  // Mostrar feedback socrático (en exámenes)
  if (state.mode === 'examen' || state.mode === 'area') {
    const container = document.getElementById('questionContainer');
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'socratic-feedback fade-in';
    feedbackDiv.innerHTML = buildSocraticFeedback(q, idx);
    container.querySelector('.question-card').appendChild(feedbackDiv);
  }
  
  updateStats();
  renderDots();
}

// ===== DOTS (COLLAPSIBLE) =====
function renderDots() {
  const container = document.getElementById('dotsContainer');
  const total = state.questions.length;
  
  if (total > 50 && state.dotsCollapsed) {
    const window = 20;
    const start = Math.max(0, state.currentIndex - Math.floor(window / 2));
    const end = Math.min(total, start + window);
    
    let html = `<button class="dots-toggle" onclick="toggleDots()">▼ Mostrar todas (${total})</button>`;
    html += `<div class="dots-row">`;
    
    for (let i = start; i < end; i++) {
      let cls = 'dot';
      if (i === state.currentIndex) cls += ' current';
      else if (state.correct[i] === true) cls += ' correct';
      else if (state.correct[i] === false) cls += ' incorrect';
      else if (state.answers[i] !== undefined) cls += ' answered';
      html += `<div class="${cls}" onclick="goToQuestion(${i})">${i + 1}</div>`;
    }
    html += `</div>`;
    
    container.innerHTML = html;
  } else {
    let html = total > 50 ? `<button class="dots-toggle" onclick="toggleDots()">▲ Ocultar</button>` : '';
    html += `<div class="dots-row ${total > 50 ? 'dots-scroll' : ''}">`;
    
    state.questions.forEach((q, i) => {
      let cls = 'dot';
      if (i === state.currentIndex) cls += ' current';
      else if (state.correct[i] === true) cls += ' correct';
      else if (state.correct[i] === false) cls += ' incorrect';
      else if (state.answers[i] !== undefined) cls += ' answered';
      html += `<div class="${cls}" onclick="goToQuestion(${i})">${i + 1}</div>`;
    });
    html += `</div>`;
    container.innerHTML = html;
  }
}

function toggleDots() {
  state.dotsCollapsed = !state.dotsCollapsed;
  renderDots();
}

// ===== PROGRESS & STATS =====
function updateProgress() {
  const total = state.questions.length;
  const current = state.currentIndex + 1;
  const pct = Math.round((current / total) * 100);
  
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = `Pregunta ${current} de ${total}`;
  document.getElementById('progressPercent').textContent = pct + '%';
}

function updateStats() {
  const correct = Object.values(state.correct).filter(v => v === true).length;
  const incorrect = Object.values(state.correct).filter(v => v === false).length;
  
  document.getElementById('statCorrectas').textContent = correct;
  document.getElementById('statIncorrectas').textContent = incorrect;
  
  const m = Math.floor(state.elapsed / 60);
  const s = state.elapsed % 60;
  document.getElementById('statTiempo').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ===== NAVIGATION =====
function renderNavButtons() {
  const container = document.getElementById('navButtons');
  const hasPrev = state.currentIndex > 0;
  const hasNext = state.currentIndex < state.questions.length - 1;
  const isLast = state.currentIndex === state.questions.length - 1;
  
  container.innerHTML = `
    <button class="btn btn-secondary" onclick="goHome()">← Inicio</button>
    <button class="btn btn-secondary" onclick="prevQuestion()" ${!hasPrev ? 'disabled' : ''}>← Anterior</button>
    <button class="btn btn-primary" onclick="nextQuestion()" ${!hasNext ? 'disabled' : ''}>Siguiente →</button>
    ${isLast && (state.mode === 'examen' || state.mode === 'area') ? '<button class="btn btn-success" onclick="finishExam()">Finalizar examen ✓</button>' : ''}
  `;
}

function goToQuestion(idx) {
  state.currentIndex = idx;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevQuestion() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function nextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ===== RESULTS =====
function finishExam() {
  stopTimer();
  showResults();
}

function showResults() {
  document.getElementById('questionSection').classList.remove('active');
  document.getElementById('resultsSection').classList.add('active');
  
  const areaScores = {};
  const areaTotals = {};
  
  Object.keys(state.answers).forEach(idx => {
    const q = state.questions[idx];
    const area = q.area;
    if (!areaScores[area]) { areaScores[area] = 0; areaTotals[area] = 0; }
    areaTotals[area]++;
    if (state.correct[idx]) areaScores[area]++;
  });
  
  let globalScore = 0;
  const weights = { matematicas: 3, lectura: 3, sociales: 3, ciencias: 3, ingles: 1 };
  let totalWeight = 0;
  
  Object.keys(areaScores).forEach(area => {
    const pct = (areaScores[area] / areaTotals[area]) * 100;
    globalScore += pct * (weights[area] || 1);
    totalWeight += (weights[area] || 1);
  });
  
  globalScore = Math.round((globalScore / totalWeight) * 5);
  
  document.getElementById('finalScore').textContent = globalScore;
  
  let breakdown = '';
  Object.keys(areaScores).forEach(area => {
    const pct = Math.round((areaScores[area] / areaTotals[area]) * 100);
    const correct = areaScores[area];
    const total = areaTotals[area];
    breakdown += `<div class="result-item"><div class="area-name">${AREAS[area]?.nombre || area}</div><div class="area-score">${pct}/100</div><div class="area-detail">${correct}/${total} correctas · Peso ${weights[area] || 1}</div></div>`;
  });
  document.getElementById('resultsBreakdown').innerHTML = breakdown;
  
  saveScoreToFirebase(globalScore, 'global');
}

function goHome() {
  stopTimer();
  state.mode = null;
  state.questions = [];
  state.currentIndex = 0;
  state.answers = {};
  state.correct = {};
  
  document.getElementById('landing').style.display = 'block';
  document.getElementById('questionSection').classList.remove('active');
  document.getElementById('resultsSection').classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function restartMode() {
  if (state.mode === 'area') {
    // Re-construye desde el banco para rotar preguntas
    const area = state.questions[0]?.area;
    if (area) startAreaExam(area);
    return;
  }
  startMode(state.mode);
}

function calcularPuntaje() {
  const lectura = parseFloat(document.getElementById('calcLectura').value) || 0;
  const matematicas = parseFloat(document.getElementById('calcMatematicas').value) || 0;
  const sociales = parseFloat(document.getElementById('calcSociales').value) || 0;
  const ciencias = parseFloat(document.getElementById('calcCiencias').value) || 0;
  const ingles = parseFloat(document.getElementById('calcIngles').value) || 0;
  
  const global = Math.round(((3*lectura + 3*matematicas + 3*sociales + 3*ciencias + 1*ingles) / 13) * 5);
  document.getElementById('calcResult').textContent = global;
}

function switchRankingTab(tab) {
  state.rankingTab = tab;
  document.querySelectorAll('.ranking-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  startRankingListener();
}

// ===== INIT =====
async function init() {
  await loadBanco();
  await loadFirebase();
  showNameModal();

  const bancoEl = document.getElementById('bancoCount');
  if (bancoEl) bancoEl.textContent = BANCO.length + ' preguntas';
  const edEl = document.getElementById('editionCount');
  if (edEl) edEl.textContent = BANCO.length + ' preguntas';

  // LOCAL clock — dossier bar
  const clockEl = document.getElementById('localTime');
  if (clockEl) {
    const tick = () => {
      const d = new Date();
      clockEl.textContent = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map(n => String(n).padStart(2, '0')).join(':');
    };
    tick();
    setInterval(tick, 1000);
  }
  
  const areasGrid = document.getElementById('areasGrid');
  Object.keys(AREAS).forEach(key => {
    const area = AREAS[key];
    const card = document.createElement('div');
    card.className = 'area-card';
    card.onclick = () => startAreaExam(key);
    card.innerHTML = `<div class="area-icon" style="background:${area.color}20;color:${area.color}">${area.icon}</div><div class="area-info"><h4>${area.nombre}</h4><div class="meta">Peso ${area.peso} · ${AREA_EXAM_SIZE[key]} preguntas · ${BANCO.filter(q => q.area === key).length} en banco</div></div>`;
    areasGrid.appendChild(card);
  });
}

init();
