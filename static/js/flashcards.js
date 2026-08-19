/* ==========================================================================
   Flashcards Module - 3D Flashcard Logic & Control Handlers
   ========================================================================== */

function setupFlashcards() {
  const card = document.getElementById('flashcard-card');
  if (card) {
    card.addEventListener('click', () => {
      card.classList.toggle('flipped');
    });
  }

  document.querySelectorAll('input[name="fc-face"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.fcFacePreference = e.target.value;
      renderFlashcard();
    });
  });

  document.getElementById('fc-prev-btn').addEventListener('click', () => {
    if (state.fcCurrentIdx > 0) {
      state.fcCurrentIdx--;
      renderFlashcard();
    }
  });

  document.getElementById('fc-next-btn').addEventListener('click', () => {
    if (state.fcCurrentIdx < state.fcDeck.length - 1) {
      state.fcCurrentIdx++;
      renderFlashcard();
    }
  });

  document.getElementById('fc-memorized-btn').addEventListener('click', () => {
    if (!state.fcDeck[state.fcCurrentIdx]) return;
    const wordId = state.fcDeck[state.fcCurrentIdx].id;
    state.memorizedIds.add(wordId);
    saveMemorizedIds();
    updateDashboard();

    if (state.fcCurrentIdx < state.fcDeck.length - 1) {
      state.fcCurrentIdx++;
    }
    renderFlashcard();
  });

  document.getElementById('fc-unmemorized-btn').addEventListener('click', () => {
    if (!state.fcDeck[state.fcCurrentIdx]) return;
    const wordId = state.fcDeck[state.fcCurrentIdx].id;
    state.memorizedIds.delete(wordId);
    saveMemorizedIds();
    updateDashboard();

    if (state.fcCurrentIdx < state.fcDeck.length - 1) {
      state.fcCurrentIdx++;
    }
    renderFlashcard();
  });

  document.getElementById('fc-tts-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.fcDeck[state.fcCurrentIdx]) {
      playNativeAudio(state.fcDeck[state.fcCurrentIdx].word, e.currentTarget);
    }
  });

  document.getElementById('fc-example-tts-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (state.fcDeck[state.fcCurrentIdx] && state.fcDeck[state.fcCurrentIdx].example_en) {
      playNativeAudio(state.fcDeck[state.fcCurrentIdx].example_en, e.currentTarget);
    }
  });
}

function startFlashcardMode(mode) {
  switchTab('flashcards');
  initFlashcards(mode);
}

function initFlashcards(filterType) {
  if (filterType === 'A') {
    state.fcDeck = state.allWords.filter(w => w.priority === 'A');
  } else if (filterType === 'unlearned') {
    state.fcDeck = state.allWords.filter(w => !state.memorizedIds.has(w.id));
  } else {
    state.fcDeck = [...state.allWords];
  }

  if (state.fcDeck.length === 0) state.fcDeck = [...state.allWords];

  state.fcCurrentIdx = 0;
  renderFlashcard();
}

function renderFlashcard() {
  const card = document.getElementById('flashcard-card');
  if (!card) return;
  card.classList.remove('flipped');

  if (!state.fcDeck.length) return;
  const item = state.fcDeck[state.fcCurrentIdx];

  document.getElementById('fc-current-idx').textContent = state.fcCurrentIdx + 1;
  document.getElementById('fc-total-count').textContent = state.fcDeck.length;

  document.getElementById('fc-pos-badge').textContent = item.pos;
  document.getElementById('fc-prio-badge').textContent = `${item.priority}등급`;
  document.getElementById('fc-prio-badge').className = `badge badge-${item.priority.toLowerCase()}`;

  const mainWordText = document.getElementById('fc-main-word');
  const meaningText = document.getElementById('fc-meaning-text');

  if (state.fcFacePreference === 'en') {
    mainWordText.textContent = item.word;
    meaningText.textContent = item.meaning;
  } else {
    mainWordText.textContent = item.meaning;
    meaningText.textContent = item.word;
  }

  document.getElementById('fc-collocation').textContent = item.collocation || '일반 용례';
  document.getElementById('fc-trap').textContent = item.trap_point || '기본 품사 문제';
  document.getElementById('fc-example-en').textContent = item.example_en || '';
  document.getElementById('fc-example-ko').textContent = item.example_ko || '';
}
