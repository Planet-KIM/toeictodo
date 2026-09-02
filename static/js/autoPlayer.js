/* ==========================================================================
   Auto-Player Module - Sequential Continuous Auto-Playback Engine
   Features: Pause/Resume, Start Position Selection, Realtime Speed & Gap Changing,
   Phase 2: 3-Accent (US -> UK -> AU) Continuous Pronunciation Mode
   ========================================================================== */

function setupAutoPlayer() {
  const playBtn = document.getElementById('auto-play-btn');
  const pauseBtn = document.getElementById('auto-pause-btn');
  const resetBtn = document.getElementById('auto-reset-btn');
  const startSelect = document.getElementById('playlist-start-select');
  const speedSelect = document.getElementById('playlist-speed-select');
  const tripleAccentBtn = document.getElementById('accent-triple-toggle');

  if (playBtn) playBtn.addEventListener('click', () => startAutoPlayback());
  if (pauseBtn) pauseBtn.addEventListener('click', () => pauseAutoPlayback());
  if (resetBtn) resetBtn.addEventListener('click', () => resetAutoPlayback());

  if (tripleAccentBtn) {
    tripleAccentBtn.addEventListener('click', () => {
      state.is3AccentMode = !state.is3AccentMode;
      if (state.is3AccentMode) {
        tripleAccentBtn.classList.add('active');
        tripleAccentBtn.style.background = 'var(--accent-gradient)';
        tripleAccentBtn.style.color = '#fff';
        tripleAccentBtn.textContent = '🌐 3국 억양 연속 재생 ON (🇺🇸➔🇬🇧➔🇦🇺)';
      } else {
        tripleAccentBtn.classList.remove('active');
        tripleAccentBtn.style.background = '';
        tripleAccentBtn.style.color = '';
        tripleAccentBtn.textContent = '🌐 3국 억양 연속 재생 (미국➔영국➔호주)';
      }
    });
  }

  if (startSelect) {
    startSelect.addEventListener('change', (e) => {
      const selectedIdx = parseInt(e.target.value);
      state.autoPlayIndex = selectedIdx;
      if (state.isAutoPlaying) {
        pauseAutoPlayback();
        startAutoPlayback(selectedIdx);
      }
    });
  }

  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      const speed = parseFloat(e.target.value);
      state.speechSpeed = speed;
      if (activeAudio) {
        activeAudio.playbackRate = speed;
      }
    });
  }
}

async function startAutoPlayback(overrideIdx = null) {
  const words = getFilteredWords();
  if (words.length === 0) {
    alert('재생할 단어가 없습니다.');
    return;
  }

  state.currentPlaylistWords = words;
  if (overrideIdx !== null) {
    state.autoPlayIndex = overrideIdx;
  } else {
    const startSelect = document.getElementById('playlist-start-select');
    if (startSelect && startSelect.value) {
      state.autoPlayIndex = parseInt(startSelect.value);
    }
  }

  if (state.autoPlayIndex >= words.length) {
    state.autoPlayIndex = 0;
  }

  state.isAutoPlaying = true;

  document.getElementById('auto-play-btn').classList.add('hidden');
  document.getElementById('auto-pause-btn').classList.remove('hidden');
  document.getElementById('playlist-status').classList.remove('hidden');

  await runAutoPlayLoop();
}

function startAutoPlaybackFromIndex(idx) {
  if (state.isAutoPlaying) {
    stopAudioImmediately();
  }
  startAutoPlayback(idx);
}

function pauseAutoPlayback() {
  state.isAutoPlaying = false;
  stopAudioImmediately();

  const playBtn = document.getElementById('auto-play-btn');
  const pauseBtn = document.getElementById('auto-pause-btn');
  const statusText = document.getElementById('playlist-status-text');

  if (playBtn) {
    playBtn.textContent = `▶️ 이어 재생 (${state.autoPlayIndex + 1}번부터)`;
    playBtn.classList.remove('hidden');
  }
  if (pauseBtn) pauseBtn.classList.add('hidden');
  if (statusText) {
    statusText.textContent = `⏸️ 일시정지 (${state.autoPlayIndex + 1}번 대기 중)`;
  }
}

function resetAutoPlayback() {
  state.isAutoPlaying = false;
  stopAudioImmediately();
  state.autoPlayIndex = 0;

  const playBtn = document.getElementById('auto-play-btn');
  const pauseBtn = document.getElementById('auto-pause-btn');
  const statusEl = document.getElementById('playlist-status');
  const startSelect = document.getElementById('playlist-start-select');

  if (playBtn) {
    playBtn.textContent = '▶️ 연속 재생';
    playBtn.classList.remove('hidden');
  }
  if (pauseBtn) pauseBtn.classList.add('hidden');
  if (statusEl) statusEl.classList.add('hidden');
  if (startSelect) startSelect.value = 0;

  document.querySelectorAll('.vocab-card').forEach(c => c.classList.remove('playing-active'));
}

function stopAudioImmediately() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
}

async function runAutoPlayLoop() {
  while (state.isAutoPlaying && state.autoPlayIndex < state.currentPlaylistWords.length) {
    const item = state.currentPlaylistWords[state.autoPlayIndex];
    const totalCount = state.currentPlaylistWords.length;
    const itemNum = state.autoPlayIndex + 1;

    const statusText = document.getElementById('playlist-status-text');
    if (statusText) {
      statusText.textContent = `${itemNum} / ${totalCount} 단어: ${item.word}`;
    }

    const startSelect = document.getElementById('playlist-start-select');
    if (startSelect) startSelect.value = state.autoPlayIndex;

    // Highlight Card & Scroll into view
    document.querySelectorAll('.vocab-card').forEach(c => c.classList.remove('playing-active'));
    const cardEl = document.querySelector(`.vocab-card[data-word-id="${item.id}"]`);
    if (cardEl) {
      cardEl.classList.add('playing-active');
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // 1단계: 한국어 번호 재생 ("1번")
    const numUrl = `/api/audio?text=${encodeURIComponent(itemNum + '번')}&accent=ko`;
    await playAudioAsync(numUrl);

    if (!state.isAutoPlaying) break;
    await new Promise(r => setTimeout(r, 100));

    // 2단계: 영어 단어 재생 (Single Accent vs 3-Accent Consecutive Mode)
    if (state.is3AccentMode) {
      // 🇺🇸 미국 억양
      if (statusText) statusText.textContent = `${itemNum}/${totalCount} 🇺🇸 ${item.word}`;
      const usUrl = `/api/audio?text=${encodeURIComponent(item.word)}&accent=en-us`;
      await playAudioAsync(usUrl);

      if (!state.isAutoPlaying) break;
      await new Promise(r => setTimeout(r, 120));

      // 🇬🇧 영국 억양
      if (statusText) statusText.textContent = `${itemNum}/${totalCount} 🇬🇧 ${item.word}`;
      const gbUrl = `/api/audio?text=${encodeURIComponent(item.word)}&accent=en-gb`;
      await playAudioAsync(gbUrl);

      if (!state.isAutoPlaying) break;
      await new Promise(r => setTimeout(r, 120));

      // 🇦🇺 호주 억양
      if (statusText) statusText.textContent = `${itemNum}/${totalCount} 🇦🇺 ${item.word}`;
      const auUrl = `/api/audio?text=${encodeURIComponent(item.word)}&accent=en-au`;
      await playAudioAsync(auUrl);
    } else {
      const enUrl = `/api/audio?text=${encodeURIComponent(item.word)}&accent=${state.currentAccent}`;
      await playAudioAsync(enUrl);
    }

    if (!state.isAutoPlaying) break;
    await new Promise(r => setTimeout(r, 150));

    // 3단계: 한글 뜻 & 품사 재생 ("이용 가능한. 형용사.")
    const koInfoText = `${item.meaning}. ${item.pos}.`;
    const koInfoUrl = `/api/audio?text=${encodeURIComponent(koInfoText)}&accent=ko`;
    await playAudioAsync(koInfoUrl);

    if (!state.isAutoPlaying) break;

    // 실시간 대기 간격 조율
    const currentGapMult = parseFloat(document.getElementById('playlist-gap-select')?.value || '1.0');
    const gapMs = Math.round(1000 * currentGapMult);
    await new Promise(r => setTimeout(r, gapMs));

    state.autoPlayIndex++;
  }

  if (state.isAutoPlaying && state.autoPlayIndex >= state.currentPlaylistWords.length) {
    resetAutoPlayback();
    alert('목록의 모든 단어 자동 재생이 완료되었습니다! 🎉');
  }
}
