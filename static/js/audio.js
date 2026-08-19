/* ==========================================================================
   Audio Module - Native Audio Player & Accent Switcher
   ========================================================================== */

let activeAudio = null;

function setupAccentSelector() {
  const container = document.getElementById('accent-pills');
  if (!container) return;

  const activeBtn = container.querySelector(`[data-accent="${state.currentAccent}"]`);
  if (activeBtn) {
    container.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
    activeBtn.classList.add('active');
  }

  container.querySelectorAll('.accent-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.accent-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const accent = btn.getAttribute('data-accent');
      saveAccentPreference(accent);

      playNativeAudio('TOEIC Accent Changed');
    });
  });
}

function playAudioAsync(url, rate = null) {
  return new Promise((resolve) => {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio = null;
    }
    const audio = new Audio(url);
    activeAudio = audio;

    // Apply playback speed rate
    const currentRate = rate !== null ? rate : parseFloat(document.getElementById('playlist-speed-select')?.value || '1.0');
    audio.playbackRate = currentRate;

    audio.onended = () => {
      activeAudio = null;
      resolve();
    };
    audio.onerror = () => {
      activeAudio = null;
      resolve();
    };
    audio.play().catch(() => {
      activeAudio = null;
      resolve();
    });
  });
}

function playNativeAudio(text, btnElement = null, accent = state.currentAccent) {
  if (!text) return;

  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }

  document.querySelectorAll('.speech-btn').forEach(b => b.classList.remove('playing'));
  if (btnElement) btnElement.classList.add('playing');

  const audioUrl = `/api/audio?text=${encodeURIComponent(text)}&accent=${accent}`;

  playAudioAsync(audioUrl).then(() => {
    if (btnElement) btnElement.classList.remove('playing');
  });
}
