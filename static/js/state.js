/* ==========================================================================
   State Module - Application Global State & Persistent Data Management
   ========================================================================== */

const state = {
  // Base Data
  allWords: [],
  allPairs: [],
  allTraps: [],

  // User Profile State
  usersList: [],
  currentUserId: parseInt(localStorage.getItem('toeic_active_user_id') || '1'),
  currentUserName: '학습자 1',

  // User Scoped Progress (Synced with SQLite DB)
  memorizedIds: new Set(),
  reviewCounts: {},
  wrongWords: [],

  // User Preference State
  currentAccent: localStorage.getItem('toeic_accent_pref') || 'en-us',

  // Active Filters & Mobile UX
  currentPosFilter: 'all',
  currentPrioFilter: 'all',
  currentStatusFilter: 'all',
  searchQuery: '',
  alphabetFilter: 'all',
  viewMode: 'card',   // 'card' or 'compact'
  pageSize: 20,       // 20, 50, 100, or 'all'
  currentPage: 1,

  // Playlist & Speed State
  isAutoPlaying: false,
  autoPlayIndex: 0,
  currentPlaylistWords: [],
  speechSpeed: 1.0,
  is3AccentMode: false, // Phase 2: TOEIC 3-Accent Mode (US -> UK -> AU)

  // Flashcard State
  fcDeck: [],
  fcCurrentIdx: 0,
  fcFacePreference: 'en',

  // Quiz State
  quizQuestions: [],
  quizCurrentIdx: 0,
  quizScore: 0,
  wrongAnswers: []
};

function saveAccentPreference(accent) {
  state.currentAccent = accent;
  localStorage.setItem('toeic_accent_pref', accent);
}

function setActiveUserId(userId) {
  state.currentUserId = userId;
  localStorage.setItem('toeic_active_user_id', userId.toString());
}
