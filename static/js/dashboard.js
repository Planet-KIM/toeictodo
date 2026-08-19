/* ==========================================================================
   Dashboard Module - Progress Tracking & Statistics Calculations
   ========================================================================== */

function updateDashboard() {
  if (!state.allWords.length) return;

  const nameEl = document.getElementById('dash-user-name');
  if (nameEl) nameEl.textContent = state.currentUserName;

  const total = state.allWords.length;
  const memorizedTotal = state.memorizedIds.size;
  const overallPercent = Math.round((memorizedTotal / total) * 100);

  const ringFill = document.getElementById('overall-ring');
  const percentText = document.getElementById('overall-percent');
  if (ringFill && percentText) {
    percentText.textContent = `${overallPercent}%`;
    const offset = 264 - (264 * overallPercent) / 100;
    ringFill.style.strokeDashoffset = offset;
  }

  const adjWords = state.allWords.filter(w => w.pos === '형용사');
  const advWords = state.allWords.filter(w => w.pos === '부사');

  const adjDone = adjWords.filter(w => state.memorizedIds.has(w.id)).length;
  const advDone = advWords.filter(w => state.memorizedIds.has(w.id)).length;

  document.getElementById('adj-done-count').textContent = adjDone;
  document.getElementById('adv-done-count').textContent = advDone;

  document.getElementById('adj-progress-bar').style.width = `${Math.round((adjDone / 300) * 100)}%`;
  document.getElementById('adv-progress-bar').style.width = `${Math.round((advDone / 250) * 100)}%`;

  const prioAWords = state.allWords.filter(w => w.priority === 'A');
  const prioADone = prioAWords.filter(w => state.memorizedIds.has(w.id)).length;
  document.getElementById('prio-a-done').textContent = prioADone;
  document.getElementById('prio-a-bar').style.width = `${Math.round((prioADone / prioAWords.length) * 100)}%`;

  // Wrong notebook count for active user
  const wrongCountEl = document.getElementById('user-wrong-count');
  if (wrongCountEl) {
    wrongCountEl.textContent = state.wrongWords.length;
  }
}

function setupDashboardQuickButtons() {
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'fc-a') startFlashcardMode('A');
      else if (action === 'fc-unlearned') startFlashcardMode('unlearned');
      else if (action === 'quiz-word') startQuizMode('word');
      else if (action === 'quiz-wrong') startQuizMode('wrong');
    });
  });
}
