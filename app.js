let QUIZ_DATA = [];
const STORAGE_PREFIX = 'srvsop_pc_avion_progress_v1';
const userInput = document.getElementById('user-input');
const sectionSelect = document.getElementById('section-select');
const lengthSelect = document.getElementById('length-select');
const idSearchInput = document.getElementById('id-search-input');
const searchIdResult = document.getElementById('search-id-result');
const sessionToggleBtn = document.getElementById('session-toggle-btn');
const sessionHeader = document.getElementById('session-header');
const sessionSettingsBody = document.getElementById('session-settings-body');
const searchInlineRow = document.getElementById('search-inline-row');
const searchIdBtn = document.getElementById('search-id-btn');
const idPreviewCard = document.getElementById('id-preview-card');
const idPreviewQuestion = document.getElementById('id-preview-question');
const idPreviewOptions = document.getElementById('id-preview-options');
const clearSearchBtn = document.getElementById('clear-search-btn');
const startFromPreviewBtn = document.getElementById('start-from-preview-btn');
const appConfirmOverlay = document.getElementById('app-confirm-overlay');
const appConfirmTitle = document.getElementById('app-confirm-title');
const appConfirmText = document.getElementById('app-confirm-text');
const appConfirmCancel = document.getElementById('app-confirm-cancel');
const appConfirmYes = document.getElementById('app-confirm-yes');

function getUserStorageKey() {
    const safeName = (userInput.value || 'anon').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return `${STORAGE_PREFIX}_${safeName || 'anon'}`;
}

function loadProgress() {
    try {
        const raw = localStorage.getItem(getUserStorageKey());
        if (raw) return JSON.parse(raw);
    } catch (e) { }
    return { byId: {} };
}

function saveProgress(p) {
    try { localStorage.setItem(getUserStorageKey(), JSON.stringify(p)); } catch (e) { }
}

let progress = loadProgress();

function populateSections() {
    const sections = [...new Set(QUIZ_DATA.map(q => q.section))];
    sectionSelect.innerHTML = '<option value="__all__">Todas las materias</option>' +
        sections.map(s => `<option value="${s}">${s} (${QUIZ_DATA.filter(q => q.section === s).length})</option>`).join('');
}

function populateLengths() {
    lengthSelect.innerHTML = '';
    [5, 10, 15, 20, 30, 9999].forEach(n => {
        const opt = document.createElement('option');
        opt.value = n;
        opt.textContent = n === 9999 ? 'Todas' : (n + ' preguntas');
        lengthSelect.appendChild(opt);
    });
    lengthSelect.value = 10;
}

async function loadQuizData() {
    try {
        const response = await fetch('./quiz-data.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo cargar quiz-data.json');
        QUIZ_DATA = await response.json();
        populateSections();
        populateLengths();
        refreshHomeStats();
    } catch (err) {
        console.error(err);
        document.getElementById('section-progress').innerHTML = '<div class="muted">No se pudo cargar el archivo de preguntas.</div>';
    }
}

userInput.addEventListener('change', () => {
    progress = loadProgress();
    refreshHomeStats();
});

function refreshHomeStats() {
    const total = QUIZ_DATA.length;
    const answered = Object.values(progress.byId).filter(x => x.seen > 0).length;
    let correctSum = 0, totalSum = 0;
    Object.values(progress.byId).forEach(x => { correctSum += x.correctCount; totalSum += x.correctCount + x.wrongCount; });
    const acc = totalSum > 0 ? Math.round(100 * correctSum / totalSum) + '%' : '–';
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-answered').textContent = answered;
    document.getElementById('stat-accuracy').textContent = acc;

    const sections = [...new Set(QUIZ_DATA.map(q => q.section))];
    const secDiv = document.getElementById('section-progress');
    secDiv.innerHTML = sections.map(s => {
        const qs = QUIZ_DATA.filter(q => q.section === s);
        const seen = qs.filter(q => progress.byId[q.id] && progress.byId[q.id].seen > 0).length;
        const pct = Math.round(100 * seen / qs.length);
        return `<div style="margin-bottom:10px;">
      <div style="display:flex; justify-content:space-between; font-size:0.85rem; margin-bottom:4px;">
        <span>${s}</span><span class="muted">${seen}/${qs.length}</span>
      </div>
      <div class="progress-bar" style="margin-bottom:0;"><div class="progress-fill" style="width:${pct}%"></div></div>
    </div>`;
    }).join('');
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

let sessionPanelOpen = true;

function toggleSessionPanel(forceState) {
    if (typeof forceState === 'boolean') {
        sessionPanelOpen = forceState;
    } else {
        sessionPanelOpen = !sessionPanelOpen;
    }

    sessionSettingsBody.classList.toggle('session-collapsed', !sessionPanelOpen);
    sessionToggleBtn.setAttribute('aria-expanded', String(sessionPanelOpen));
    sessionToggleBtn.textContent = sessionPanelOpen ? '▾' : '▸';
}

function showQuestionPreview(question) {
    idPreviewCard.style.display = 'block';
    idPreviewQuestion.textContent = question.question;
    idPreviewOptions.innerHTML = '';
    Object.keys(question.options).sort().forEach(letter => {
        const item = document.createElement('div');
        item.style.marginBottom = '8px';
        item.style.padding = '10px 12px';
        item.style.border = '1px solid var(--border)';
        item.style.borderRadius = '10px';
        item.style.background = 'var(--card2)';
        item.innerHTML = `<b>${letter}.</b> ${question.options[letter]}`;
        idPreviewOptions.appendChild(item);
    });
}

function hideQuestionPreview() {
    idPreviewCard.style.display = 'none';
    idPreviewQuestion.textContent = '';
    idPreviewOptions.innerHTML = '';
    searchIdResult.textContent = '';
    idSearchInput.value = '';
}

function startQuestionById(inputId) {
    const found = QUIZ_DATA.find(q => String(q.id) === inputId);
    if (!found) {
        searchIdResult.textContent = 'No encontré una pregunta con ese ID.';
        return false;
    }

    sectionSelect.value = found.section;
    lengthSelect.value = 1;
    session = { questions: [found], idx: 0, correct: 0, wrong: 0, missed: [] };
    showScreen('screen-quiz');
    renderQuestion();
    return true;
}

function toggleIdSearchControls() {
    const visible = searchInlineRow.classList.toggle('visible');
    searchIdBtn.textContent = visible ? 'Cerrar buscador por ID' : 'Buscar pregunta por ID';
    if (!visible) {
        hideQuestionPreview();
    }
}

let pendingConfirmAction = null;

function openConfirmModal({ title, text, confirmText, onConfirm }) {
    appConfirmTitle.textContent = title;
    appConfirmText.textContent = text;
    appConfirmYes.textContent = confirmText;
    pendingConfirmAction = onConfirm;
    appConfirmOverlay.classList.add('show');
}

function closeConfirmModal() {
    appConfirmOverlay.classList.remove('show');
    pendingConfirmAction = null;
}

// ---------- HOME SCREEN SETUP ----------
populateLengths();
loadQuizData();

toggleSessionPanel(false);
sessionHeader.addEventListener('click', () => toggleSessionPanel());
sessionToggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleSessionPanel();
});
clearSearchBtn.addEventListener('click', () => hideQuestionPreview());
searchIdBtn.addEventListener('click', () => toggleIdSearchControls());
appConfirmCancel.addEventListener('click', closeConfirmModal);
appConfirmOverlay.addEventListener('click', (event) => {
    if (event.target === appConfirmOverlay) closeConfirmModal();
});
appConfirmYes.addEventListener('click', () => {
    if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
    closeConfirmModal();
});
startFromPreviewBtn.addEventListener('click', () => {
    const inputId = (idSearchInput.value || '').trim();
    if (!inputId) {
        searchIdResult.textContent = 'Ingresá un ID para ver la pregunta.';
        return;
    }
    startQuestionById(inputId);
});

document.getElementById('reset-btn').addEventListener('click', () => {
    openConfirmModal({
        title: 'Reiniciar progreso',
        text: `¿Borrar todo el progreso guardado para "${userInput.value || 'anon'}" en este dispositivo?`,
        confirmText: 'Reiniciar',
        onConfirm: () => {
            progress = { byId: {} };
            saveProgress(progress);
            refreshHomeStats();
        }
    });
});

// ---------- QUIZ STATE ----------
let session = null; // {questions:[], idx:0, correct:0, wrong:0, missed:[]}

function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildQuestionSet() {
    const inputId = (idSearchInput.value || '').trim();
    if (inputId) {
        const found = QUIZ_DATA.find(q => String(q.id) === inputId);
        if (!found) {
            searchIdResult.textContent = 'No encontré una pregunta con ese ID.';
            return [];
        }

        searchIdResult.textContent = `Pregunta ${found.id} encontrada en ${found.section}.`;
        sectionSelect.value = found.section;
        lengthSelect.value = 1;
        return [found];
    }

    const sec = sectionSelect.value;
    const mode = document.getElementById('mode-select').value;
    const len = parseInt(lengthSelect.value, 10);

    let pool = QUIZ_DATA.filter(q => sec === '__all__' || q.section === sec);

    if (mode === 'unseen') {
        pool = pool.filter(q => !progress.byId[q.id] || progress.byId[q.id].seen === 0);
    } else if (mode === 'wrong') {
        pool = pool.filter(q => progress.byId[q.id] && progress.byId[q.id].lastCorrect === false);
    }

    pool = shuffle(pool);
    if (len !== 9999) pool = pool.slice(0, len);
    return pool;
}

const performSearchById = () => {
    const inputId = (idSearchInput.value || '').trim();
    if (!inputId) {
        searchIdResult.textContent = 'Ingresá un ID para buscar.';
        idPreviewCard.style.display = 'none';
        return;
    }

    const found = QUIZ_DATA.find(q => String(q.id) === inputId);
    if (!found) {
        searchIdResult.textContent = 'No encontré una pregunta con ese ID.';
        idPreviewCard.style.display = 'none';
        return;
    }

    searchIdResult.textContent = `Encontrada: ${found.id} · ${found.section}.`;
    hideQuestionPreview();
    startQuestionById(inputId);
};

document.getElementById('search-id-inline-btn').addEventListener('click', () => {
    performSearchById();
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (!QUIZ_DATA.length) {
        alert('Todavía no se cargaron las preguntas. Reintentá en unos segundos.');
        return;
    }

    const qs = buildQuestionSet();
    if (qs.length === 0) {
        alert('No hay preguntas disponibles con esos filtros. Probá otro modo o materia.');
        return;
    }

    session = { questions: qs, idx: 0, correct: 0, wrong: 0, missed: [] };
    showScreen('screen-quiz');
    renderQuestion();
});

function renderQuestion() {
    const q = session.questions[session.idx];
    document.getElementById('quiz-tag').textContent = `${q.section} · ${session.idx + 1}/${session.questions.length}`;
    document.getElementById('quiz-question').textContent = q.question;
    document.getElementById('progress-fill').style.width = Math.round(100 * session.idx / session.questions.length) + '%';

    const optsDiv = document.getElementById('quiz-options');
    optsDiv.innerHTML = '';
    Object.keys(q.options).sort().forEach(letter => {
        const btn = document.createElement('button');
        btn.className = 'opt';
        btn.innerHTML = `<b>${letter}.</b> ${q.options[letter]}`;
        btn.addEventListener('click', () => selectAnswer(letter));
        optsDiv.appendChild(btn);
    });

    document.getElementById('quiz-feedback').innerHTML = '';
    document.getElementById('next-btn').style.display = 'none';
}

function selectAnswer(letter) {
    const q = session.questions[session.idx];
    const isCorrect = letter === q.answer;

    // update stored progress
    if (!progress.byId[q.id]) progress.byId[q.id] = { seen: 0, correctCount: 0, wrongCount: 0, lastCorrect: null };
    const rec = progress.byId[q.id];
    rec.seen += 1;
    if (isCorrect) { rec.correctCount += 1; rec.lastCorrect = true; }
    else { rec.wrongCount += 1; rec.lastCorrect = false; }
    saveProgress(progress);

    if (isCorrect) session.correct++;
    else { session.wrong++; session.missed.push(q); }

    // lock options, mark correct/incorrect
    document.querySelectorAll('.opt').forEach(btn => {
        btn.classList.add('disabled');
        const btnLetter = btn.querySelector('b').textContent.replace('.', '').trim();
        if (btnLetter === q.answer) btn.classList.add('correct');
        else if (btnLetter === letter) btn.classList.add('incorrect');
    });

    const fb = document.getElementById('quiz-feedback');
    fb.innerHTML = `<div class="feedback ${isCorrect ? 'good' : 'bad'}">
      <div class="lead">${isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto — la respuesta era ' + q.answer}</div>
      <div class="expl">${q.explanation}</div>
    </div>`;

    document.getElementById('next-btn').style.display = 'block';
}

document.getElementById('next-btn').addEventListener('click', () => {
    session.idx++;
    if (session.idx >= session.questions.length) {
        finishSession();
    } else {
        renderQuestion();
    }
});

document.getElementById('quit-btn').addEventListener('click', () => {
    openConfirmModal({
        title: 'Salir al inicio',
        text: '¿Seguro que querés salir de la práctica actual? La sesión en curso se perderá.',
        confirmText: 'Salir',
        onConfirm: () => {
            showScreen('screen-home');
            refreshHomeStats();
        }
    });
});

function finishSession() {
    document.getElementById('progress-fill').style.width = '100%';
    const total = session.questions.length;
    const pct = Math.round(100 * session.correct / total);
    document.getElementById('result-score').textContent = `${session.correct}/${total} (${pct}%)`;
    let msg = '';
    if (pct === 100) msg = '¡Impecable! Dominás este bloque.';
    else if (pct >= 80) msg = 'Muy bien, vas encaminado.';
    else if (pct >= 60) msg = 'Bien, pero conviene repasar los fallos.';
    else msg = 'Convendría repasar esta materia con más calma.';
    document.getElementById('result-sub').textContent = msg;

    const missCard = document.getElementById('miss-card');
    const missList = document.getElementById('miss-list');
    if (session.missed.length) {
        missCard.style.display = 'block';
        missList.innerHTML = session.missed.map(q => `
      <div class="miss-item">
        <div class="q">${q.id} — ${q.question}</div>
        <div class="a">Correcta: ${q.answer}. ${q.options[q.answer]}</div>
      </div>`).join('');
    } else {
        missCard.style.display = 'none';
    }

    showScreen('screen-results');
}

document.getElementById('again-btn').addEventListener('click', () => {
    showScreen('screen-home');
    refreshHomeStats();
});
document.getElementById('home-btn').addEventListener('click', () => {
    showScreen('screen-home');
    refreshHomeStats();
});
