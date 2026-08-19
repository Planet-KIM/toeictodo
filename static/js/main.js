/* ==========================================================================
   Main Entrypoint Module - App Initialization & Auth Management
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  setupAccentSelector();
  setupNavigation();
  setupDashboardQuickButtons();
  setupFilters();
  setupAutoPlayer();
  setupFlashcards();
  setupQuiz();
  setupModal();
  setupAuthUI();

  await loadData();
  await checkAuthStatus();

  renderPairs();
  renderTraps();
});

// Theme Initialization (Dark / Light Mode)
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('toeic_theme') || 'dark-theme';
  document.body.className = savedTheme;

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.contains('dark-theme');
      const newTheme = isDark ? 'light-theme' : 'dark-theme';
      document.body.className = newTheme;
      localStorage.setItem('toeic_theme', newTheme);
    });
  }
}

// Fetch Core Words, Pairs, Traps
async function loadData() {
  try {
    const [wordsRes, pairsRes, trapsRes] = await Promise.all([
      fetch('/api/words'),
      fetch('/api/pairs'),
      fetch('/api/traps')
    ]);

    state.allWords = await wordsRes.json();
    state.allPairs = await pairsRes.json();
    state.allTraps = await trapsRes.json();

    console.log(`[Main] Loaded ${state.allWords.length} words, ${state.allPairs.length} pairs, ${state.allTraps.length} traps.`);
  } catch (err) {
    console.error('[Main] Failed to load data:', err);
  }
}

async function switchUserProfile(userId) {
  setActiveUserId(userId);
  const user = state.usersList.find(u => u.id === userId) || { id: userId, name: `학습자 ${userId}` };
  state.currentUserName = user.name;

  try {
    // Fetch User Scoped Progress & Wrong Words from DB
    const [progressRes, wrongRes] = await Promise.all([
      fetch(`/api/users/${userId}/progress`),
      fetch(`/api/users/${userId}/wrong-words`)
    ]);

    const progressData = await progressRes.json();
    state.wrongWords = await wrongRes.json();

    state.memorizedIds = new Set(progressData.memorized_ids || []);
    state.reviewCounts = progressData.review_counts || {};

    updateDashboard();
    renderVocabs();
  } catch (e) {
    console.error('[Main] Failed to load user profile progress:', e);
  }
}

async function reloadUserWrongWords() {
  try {
    const res = await fetch(`/api/users/${state.currentUserId}/wrong-words`);
    state.wrongWords = await res.json();
  } catch (e) {
    console.error('[Main] Failed to reload user wrong words:', e);
  }
}

// Navigation & Tab Switching
function setupNavigation() {
  const navBtns = document.querySelectorAll('.nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  const heroBtnVocabs = document.getElementById('hero-btn-vocabs');
  if (heroBtnVocabs) heroBtnVocabs.addEventListener('click', () => switchTab('vocabs'));

  const heroBtnQuiz = document.getElementById('hero-btn-quiz');
  if (heroBtnQuiz) heroBtnQuiz.addEventListener('click', () => switchTab('quiz'));
}

function switchTab(tabName) {
  if (state.isAutoPlaying) stopAutoPlayback();

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));

  const targetBtn = document.querySelector(`.nav-btn[data-tab="${tabName}"]`);
  const targetView = document.getElementById(`view-${tabName}`);

  if (targetBtn) targetBtn.classList.add('active');
  if (targetView) targetView.classList.add('active');

  if (tabName === 'flashcards' && state.fcDeck.length === 0) {
    initFlashcards('all');
  }
  if (tabName === 'dashboard') {
    updateDashboard();
  }
}
