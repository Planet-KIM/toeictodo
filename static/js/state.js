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

  // Active Filters
  currentPosFilter: 'all',
  currentPrioFilter: 'all',
  currentStatusFilter: 'all',
  searchQuery: '',

  // Playlist & Speed State
  isAutoPlaying: false,
  autoPlayIndex: 0,
  currentPlaylistWords: [],
  speechSpeed: 1.0,

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
