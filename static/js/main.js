/* ==========================================================================
   Main Entrypoint Module - ServiceWorker, Offline DB & App Initialization
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  registerServiceWorker();
  setupOnlineAutoSync();
  setupAccentSelector();
  setupNavigation();
  setupDashboardQuickButtons();
  setupFilters();
  setupAutoPlayer();
  setupFlashcards();
  setupQuiz();
  setupModal();
  setupWordCrudModal();
  setupAuthUI();

  await loadData();
  await checkAuthStatus();

  renderPairs();
  renderTraps();
});

// PWA ServiceWorker Registration (iOS Safari & Android Chrome)
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      console.log('[SW] PWA ServiceWorker registered with scope:', reg.scope);
    }).catch((err) => {
      console.warn('[SW] ServiceWorker registration failed:', err);
    });
  }
}

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

// Fetch Core Words, Pairs, Traps with Offline Cache Fallback
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
    console.warn('[Main] Network offline, relying on PWA cached data.');
  }
}

async function switchUserProfile(userId) {
  setActiveUserId(userId);
  const user = state.usersList.find(u => u.id === userId) || { id: userId, name: `학습자 ${userId}` };
  state.currentUserName = user.name;

  try {
    if (navigator.onLine) {
      // Fetch User Scoped Progress & Wrong Words from Backend DB
      const [progressRes, wrongRes] = await Promise.all([
        fetch(`/api/users/${userId}/progress`),
        fetch(`/api/users/${userId}/wrong-words`)
      ]);

      const progressData = await progressRes.json();
      state.wrongWords = await wrongRes.json();

      state.memorizedIds = new Set(progressData.memorized_ids || []);
      state.reviewCounts = progressData.review_counts || {};
    } else {
      // Load offline progress from mobile IndexedDB
      const progressData = await loadLocalProgress(userId);
      state.memorizedIds = new Set(progressData.memorized_ids || []);
      state.reviewCounts = {};
    }

    updateDashboard();
    renderVocabs();
  } catch (e) {
    console.error('[Main] Failed to load user profile progress:', e);
  }
}

async function reloadUserWrongWords() {
  try {
    if (navigator.onLine) {
      const res = await fetch(`/api/users/${state.currentUserId}/wrong-words`);
      state.wrongWords = await res.json();
    }
  } catch (e) {
    console.warn('[Main] Offline, skipping reload wrong words.');
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
