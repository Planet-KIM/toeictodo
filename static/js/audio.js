/* ==========================================================================
   Audio Module - Native Audio Player, Accent Switcher & Exception Safe Async
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

/**
 * Exception-Safe Audio Player with Timeout Race Boundary (Default 3.5s timeout fallback)
 */
function playAudioAsync(url, rate = null, timeoutMs = 3500) {
  return new Promise((resolve) => {
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      if (activeAudio) {
        activeAudio.pause();
        activeAudio = null;
      }
      resolve();
    };

    // Timeout safety fallback
    const timer = setTimeout(() => {
      console.warn('[Audio] Playback timeout boundary triggered:', url);
      cleanup();
    }, timeoutMs);

    try {
      const audio = new Audio(url);
      activeAudio = audio;

      const currentRate = rate !== null ? rate : parseFloat(document.getElementById('playlist-speed-select')?.value || '1.0');
      audio.playbackRate = currentRate;

      audio.onended = () => {
        clearTimeout(timer);
        cleanup();
      };
      audio.onerror = (err) => {
        console.warn('[Audio] Audio load error fallback:', err);
        clearTimeout(timer);
        cleanup();
      };
      audio.play().catch((err) => {
        console.warn('[Audio] Play promise exception fallback:', err);
        clearTimeout(timer);
        cleanup();
      });
    } catch (e) {
      console.warn('[Audio] Exception caught in audio creation:', e);
      clearTimeout(timer);
      cleanup();
    }
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
