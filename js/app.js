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
  matematicas: { nombre: 'Matemáticas', peso: 3, icon: '📐', color: '#3b82f6' },
  lectura: { nombre: 'Lectura Crítica', peso: 3, icon: '📖', color: '#8b5cf6' },
  sociales: { nombre: 'Sociales y Ciudadanas', peso: 3, icon: '🏛️', color: '#f59e0b' },
  ciencias: { nombre: 'Ciencias Naturales', peso: 3, icon: '🔬', color: '#10b981' },
  ingles: { nombre: 'Inglés', peso: 1, icon: '🌍', color: '#ef4444' }
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
    container.innerHTML = `<div class="ranking-empty"><div class="icon">🏆</div><p>No hay puntajes aún</p><p style="font-size:12px;margin-top:4px;">¡Sé el primero!</p></div>`;
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
      <h3>👋 ¿Cómo te llamas?</h3>
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

function buildExamenCompleto() {
  let out = [];
  Object.keys(EXAMEN_BLUEPRINT).forEach(area => {
    const pool = BANCO.filter(q => q.area === area);
    out = out.concat(sampleRotating(pool, Math.min(EXAMEN_BLUEPRINT[area], pool.length)));
  });
  return shuffle(out);
}

function buildExamenArea(area) {
  const pool = BANCO.filter(q => q.area === area);
  const n = Math.min(AREA_EXAM_SIZE[area] || pool.length, pool.length);
  return sampleRotating(pool, n);
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
  const correctLetter = ['A', 'B', 'C', 'D'][q.respuesta_correcta];
  const selectedLetter = ['A', 'B', 'C', 'D'][selectedIdx];
  
  let html = '';
  
  // Estado: correcto o incorrecto
  if (isCorrect) {
    html += `<div class="feedback-header feedback-correct">✅ ¡Correcto! La respuesta es ${correctLetter}</div>`;
  } else {
    html += `<div class="feedback-header feedback-incorrect">❌ Incorrecto. Elegiste ${selectedLetter}, la correcta es ${correctLetter}</div>`;
  }
  
  // Explicación (si existe)
  if (q.explicacion) {
    html += `<div class="feedback-explanation"><strong>💡 Explicación:</strong> ${q.explicacion}</div>`;
  }
  
  // Método socrático: guiar con preguntas
  if (q.tema) {
    html += `<div class="feedback-socratic"><strong>🧠 Para reflexionar:</strong> `;
    if (isCorrect) {
      html += `Excelente elección. ¿Podrías explicar por qué la opción ${correctLetter} es correcta sin mirar la explicación? Esto ayudará a consolidar tu conocimiento sobre <em>${q.tema}</em>.`;
    } else {
      html += `Cuando revises esta pregunta de <em>${q.tema}</em>, pregúntate: ¿qué información clave del enunciado me faltó por considerar? ¿Qué distractor me confundió y por qué?`;
    }
    html += `</div>`;
  }
  
  // Competencia evaluada
  if (q.competencia && q.competencia !== q.tema) {
    html += `<div class="feedback-competencia"><strong>📝 Competencia:</strong> ${q.competencia}</div>`;
  }
  
  return html;
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;
  
  const container = document.getElementById('questionContainer');
  const letters = ['A', 'B', 'C', 'D'];
  const opts = q.opciones || [];
  const isAnswered = state.answers[state.currentIndex] !== undefined;
  const selectedIdx = state.answers[state.currentIndex];
  
  let passageHtml = q.pasaje ? `<div class="question-passage">${q.pasaje}</div>` : '';
  
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
  
  container.innerHTML = `
    <div class="question-card fade-in">
      <div class="question-header">
        <span class="question-number">Pregunta ${state.currentIndex + 1} de ${state.questions.length}</span>
        <div class="question-meta">
          <span class="question-tag competencia">${q.tema || q.competencia || ''}</span>
          <span class="question-tag dificultad-${q.dificultad || 'media'}">${q.dificultad || 'media'}</span>
        </div>
      </div>
      ${passageHtml}
      <div class="question-text">${q.enunciado}</div>
      <div class="options">${optionsHtml}</div>
      ${feedbackHtml}
    </div>`;
  
  updateProgress();
  renderDots();
  renderNavButtons();
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
