/* ==========================================================================
   Auto-Player Module - Sequential Continuous Auto-Playback Engine
   Features: Pause/Resume, Start Position Selection, Realtime Speed & Gap Changing
   ========================================================================== */

function setupAutoPlayer() {
  const playBtn = document.getElementById('auto-play-btn');
  const pauseBtn = document.getElementById('auto-pause-btn');
  const resetBtn = document.getElementById('auto-reset-btn');
  const startSelect = document.getElementById('playlist-start-select');
  const speedSelect = document.getElementById('playlist-speed-select');

  if (playBtn) playBtn.addEventListener('click', () => startAutoPlayback());
  if (pauseBtn) pauseBtn.addEventListener('click', () => pauseAutoPlayback());
  if (resetBtn) resetBtn.addEventListener('click', () => resetAutoPlayback());

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

    // 2단계: 해당 국가 원어민 발음 MP3 재생 (미국/영국/호주)
    const enUrl = `/api/audio?text=${encodeURIComponent(item.word)}&accent=${state.currentAccent}`;
    await playAudioAsync(enUrl);

    if (!state.isAutoPlaying) break;
    await new Promise(r => setTimeout(r, 150));

    // 3단계: 한글 뜻 & 품사 재생 ("이용 가능한. 형용사.")
    const koInfoText = `${item.meaning}. ${item.pos}.`;
    const koInfoUrl = `/api/audio?text=${encodeURIComponent(koInfoText)}&accent=ko`;
    await playAudioAsync(koInfoUrl);

    if (!state.isAutoPlaying) break;

    // 실시간 대기 간격 조율 (루프 돌 때마다 최신 간격 값 동적 읽기!)
    const currentGapMult = parseFloat(document.getElementById('playlist-gap-select').value || '1.0');
    const gapMs = Math.round(1000 * currentGapMult);
    await new Promise(r => setTimeout(r, gapMs));

    state.autoPlayIndex++;
  }

  if (state.isAutoPlaying && state.autoPlayIndex >= state.currentPlaylistWords.length) {
    resetAutoPlayback();
    alert('목록의 모든 단어 자동 재생이 완료되었습니다! 🎉');
  }
}
