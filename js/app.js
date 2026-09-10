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
  immediateExp: false,
  filterArea: 'todas',
  filterTema: 'todos',
  filterDificultad: 'todas',
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

// ===== MODES =====
function startMode(mode) {
  state.mode = mode;
  state.currentIndex = 0;
  state.answers = {};
  state.correct = {};
  state.elapsed = 0;
  
  if (mode === 'examen') {
    state.questions = getRandomQuestions(50);
    startTimer();
  } else if (mode === 'practica') {
    state.questions = [...BANCO];
    stopTimer();
  } else if (mode === 'estudio') {
    state.questions = [...BANCO];
    state.immediateExp = true;
    stopTimer();
  } else if (mode === 'repaso') {
    state.questions = state.errors.length > 0 ? [...state.errors] : [...BANCO];
    stopTimer();
  }
  
  showQuestionSection();
  renderQuestion();
}

function getRandomQuestions(n) {
  const shuffled = [...BANCO].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, shuffled.length));
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
  filters.style.display = state.mode === 'practica' ? 'flex' : 'none';
  document.getElementById('statsBar').style.display = state.mode === 'examen' ? 'flex' : 'none';
  document.getElementById('progressContainer').style.display = 'block';
  
  // Reset dots to collapsed for large question sets
  state.dotsCollapsed = state.questions.length > 50;
}

// ===== RENDER QUESTION =====
function renderQuestion() {
  const q = state.questions[state.currentIndex];
  if (!q) return;
  
  const container = document.getElementById('questionContainer');
  const letters = ['A', 'B', 'C', 'D'];
  const opts = q.opciones || [];
  
  let passageHtml = q.pasaje ? `<div class="question-passage">${q.pasaje}</div>` : '';
  
  let optionsHtml = '';
  opts.forEach((opt, i) => {
    const isAnswered = state.answers[state.currentIndex] !== undefined;
    const isCorrect = i === q.respuesta_correcta;
    
    let cls = 'option';
    if (isAnswered) {
      if (state.immediateExp && state.mode === 'estudio') {
        // Modo estudio: mostrar cuál es correcta visualmente desde antes
        if (isCorrect) cls += ' correct';
        cls += ' disabled';
      } else {
        if (state.answers[state.currentIndex] === i) {
          cls += isCorrect ? ' correct' : ' incorrect';
        }
        cls += ' disabled';
      }
    }
    
    optionsHtml += `
      <div class="${cls}" onclick="selectOption(${i})" id="opt-${i}">
        <div class="option-letter">${letters[i]}</div>
        <div class="option-text">${opt}</div>
      </div>`;
  });
  
  // Explicación visible
  let explanationHtml = '';
  const showExp = state.immediateExp && state.mode === 'estudio' ? true : state.answers[state.currentIndex] !== undefined;
  if (q.explicacion && showExp) {
    explanationHtml = `
      <div class="explanation show" id="explanation">
        <div class="explanation-title">Explicación</div>
        ${q.explicacion}
      </div>`;
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
      ${explanationHtml}
    </div>`;
  
  updateProgress();
  renderDots();
  renderNavButtons();
}

// ===== SELECT OPTION =====
function selectOption(idx) {
  const q = state.questions[state.currentIndex];
  
  // Si ya respondió en modo estudio, no hacer nada (solo lectura)
  if (state.mode === 'estudio' && state.answers[state.currentIndex] !== undefined) return;
  
  // Si ya respondió en otros modos, no hacer nada
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
  
  // Mostrar explicación
  const exp = document.getElementById('explanation');
  if (exp) exp.classList.add('show');
  
  updateStats();
  renderDots();
}

// ===== DOTS (COLLAPSIBLE) =====
function renderDots() {
  const container = document.getElementById('dotsContainer');
  const total = state.questions.length;
  
  // Si hay muchas preguntas, mostrar solo ventana deslizable + botón expandir
  if (total > 50 && state.dotsCollapsed) {
    // Mostrar solo 20 alrededor de la actual
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
    // Mostrar todas (con scroll si son muchas)
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
    ${isLast ? '<button class="btn btn-success" onclick="finishExam()">Finalizar examen ✓</button>' : ''}
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
  startMode(state.mode);
}

// ===== TOGGLES =====
function toggleExplanation() {
  state.immediateExp = !state.immediateExp;
  document.getElementById('toggleExp').classList.toggle('active', state.immediateExp);
}

function applyFilters() {
  state.filterArea = document.getElementById('filterArea').value;
  state.filterTema = document.getElementById('filterTema').value;
  state.filterDificultad = document.getElementById('filterDificultad').value;
  
  let filtered = [...BANCO];
  
  if (state.filterArea !== 'todas') filtered = filtered.filter(q => q.area === state.filterArea);
  if (state.filterTema !== 'todos') filtered = filtered.filter(q => q.tema === state.filterTema);
  if (state.filterDificultad !== 'todas') filtered = filtered.filter(q => q.dificultad === state.filterDificultad);
  
  state.questions = filtered;
  state.currentIndex = 0;
  state.answers = {};
  state.correct = {};
  renderQuestion();
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
  
  // Populate area filter
  const areaSelect = document.getElementById('filterArea');
  Object.keys(AREAS).forEach(key => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = AREAS[key].nombre;
    areaSelect.appendChild(opt);
  });
  
  // Populate areas grid
  const areasGrid = document.getElementById('areasGrid');
  Object.keys(AREAS).forEach(key => {
    const area = AREAS[key];
    const card = document.createElement('div');
    card.className = 'area-card';
    card.onclick = () => {
      state.mode = 'practica';
      state.currentIndex = 0;
      state.answers = {};
      state.correct = {};
      state.questions = BANCO.filter(q => q.area === key);
      stopTimer();
      showQuestionSection();
      renderQuestion();
    };
    card.innerHTML = `<div class="area-icon" style="background:${area.color}20;color:${area.color}">${area.icon}</div><div class="area-info"><h4>${area.nombre}</h4><div class="meta">Peso ${area.peso} · ${BANCO.filter(q => q.area === key).length} preguntas</div></div>`;
    areasGrid.appendChild(card);
  });
  
  document.getElementById('filterArea').addEventListener('change', function() {
    const temaSelect = document.getElementById('filterTema');
    temaSelect.innerHTML = '<option value="todos">Todos</option>';
    const area = this.value;
    const allTemas = area === 'todas' ? [...new Set(BANCO.map(q => q.tema).filter(Boolean))].sort() : [...new Set(BANCO.filter(q => q.area === area).map(q => q.tema).filter(Boolean))].sort();
    allTemas.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t;
      opt.textContent = t;
      temaSelect.appendChild(opt);
    });
  });
}

init();
