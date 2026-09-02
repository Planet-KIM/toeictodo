/* ==========================================================================
   Vocabs Module - Vocabulary Grid, Dynamic POS Filters & Offline Sync
   Phase 2: Custom POS Tag Color System & Responsive Render Logic
   ========================================================================== */

function getFilteredWords() {
  if (!state.allWords || !state.allWords.length) return [];
  
  const wrongIds = new Set(state.wrongWords.map(w => w.id));

  return state.allWords.filter(w => {
    if (state.currentPosFilter !== 'all' && w.pos !== state.currentPosFilter) return false;
    if (state.currentPrioFilter !== 'all' && w.priority !== state.currentPrioFilter) return false;

    const isMem = state.memorizedIds.has(w.id);
    if (state.currentStatusFilter === 'memorized' && !isMem) return false;
    if (state.currentStatusFilter === 'unmemorized' && isMem) return false;
    if (state.currentStatusFilter === 'wrong_notebook' && !wrongIds.has(w.id)) return false;

    if (state.searchQuery) {
      const targetStr = `${w.word} ${w.meaning} ${w.collocation} ${w.example_en} ${w.example_ko}`.toLowerCase();
      if (!targetStr.includes(state.searchQuery)) return false;
    }

    return true;
  });
}

function renderDynamicPosFilterPills() {
  const container = document.getElementById('pos-filters');
  if (!container || !state.allWords) return;

  const posCounts = {};
  state.allWords.forEach(w => {
    const p = w.pos || '기타';
    posCounts[p] = (posCounts[p] || 0) + 1;
  });

  const total = state.allWords.length;
  let html = `<button class="filter-pill ${state.currentPosFilter === 'all' ? 'active' : ''}" data-pos="all">전체 (${total})</button>`;

  const knownOrder = ['형용사', '부사', '명사', '동사', '전치사', '접속사'];
  const allPosKeys = Object.keys(posCounts);

  knownOrder.forEach(p => {
    if (posCounts[p]) {
      html += `<button class="filter-pill ${state.currentPosFilter === p ? 'active' : ''}" data-pos="${p}">${p} (${posCounts[p]})</button>`;
    }
  });

  allPosKeys.forEach(p => {
    if (!knownOrder.includes(p)) {
      html += `<button class="filter-pill ${state.currentPosFilter === p ? 'active' : ''}" data-pos="${p}">${p} (${posCounts[p]})</button>`;
    }
  });

  container.innerHTML = html;

  container.querySelectorAll('.filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPosFilter = btn.getAttribute('data-pos');
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  });
}

function updateStartSelectOptions() {
  const select = document.getElementById('playlist-start-select');
  if (!select) return;

  const words = getFilteredWords();
  select.innerHTML = words.map((w, idx) => `
    <option value="${idx}">${idx + 1}번: ${w.word}</option>
  `).join('');

  if (state.autoPlayIndex < words.length) {
    select.value = state.autoPlayIndex;
  }
}

function setupFilters() {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      searchClear.style.display = state.searchQuery ? 'block' : 'none';
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  }

  if (searchClear) {
    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      state.searchQuery = '';
      searchClear.style.display = 'none';
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  }

  document.querySelectorAll('#prio-filters .filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#prio-filters .filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPrioFilter = btn.getAttribute('data-prio');
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  });

  document.querySelectorAll('#status-filters .filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#status-filters .filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentStatusFilter = btn.getAttribute('data-status');
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  });

  document.getElementById('reset-progress-btn').addEventListener('click', () => {
    if (confirm(`'${state.currentUserName}' 님의 현재 학습 상태를 초기화하시겠습니까?`)) {
      state.memorizedIds.clear();
      state.reviewCounts = {};
      updateDashboard();
      renderVocabs();
    }
  });

  // Download Audio Pack Handler
  const downloadAudioBtn = document.getElementById('download-audio-pack-btn');
  if (downloadAudioBtn) {
    downloadAudioBtn.addEventListener('click', () => {
      const originalText = downloadAudioBtn.textContent;
      downloadAudioBtn.disabled = true;
      downloadOfflineAudioPack((completed, total, percent) => {
        downloadAudioBtn.textContent = `📲 [${percent}%] (${completed}/${total})`;
        if (percent === 100) {
          downloadAudioBtn.disabled = false;
          downloadAudioBtn.textContent = '✅ 오프라인 음성 준비 완료';
        }
      });
    });
  }
}

function renderVocabs() {
  const container = document.getElementById('vocab-grid');
  if (!container) return;

  renderDynamicPosFilterPills();
  const filtered = getFilteredWords();
  document.getElementById('result-count').textContent = filtered.length;
  updateStartSelectOptions();

  if (filtered.length === 0) {
    container.innerHTML = `<div class="empty-state text-muted" style="grid-column: 1/-1; text-align:center; padding: 40px;">검색 결과에 해당하는 단어가 없습니다.</div>`;
    return;
  }

  container.innerHTML = filtered.map((w, idx) => {
    const isMem = state.memorizedIds.has(w.id);
    const prioClass = `badge-${w.priority.toLowerCase()}`;
    const posTagClass = `tag-pos-${w.pos || '기타어휘'}`;
    return `
      <div class="vocab-card ${isMem ? 'memorized' : ''}" data-word-id="${w.id}" data-item-idx="${idx}">
        <div class="card-top">
          <span class="card-word">${w.word}</span>
          <div class="card-tags">
            <span class="badge ${prioClass}">${w.priority}등급</span>
            <span class="tag ${posTagClass}">${w.pos}</span>
          </div>
        </div>
        <div class="card-meaning">${w.meaning}</div>
        ${w.collocation ? `<div class="card-collocation">💡 ${w.collocation}</div>` : ''}
        <div class="card-footer">
          <div class="card-footer-left">
            <button class="speech-btn" data-tts-word="${w.word}" title="원어민 발음 들으러가기">🔊</button>
            <button class="play-from-here-btn" data-play-from-idx="${idx}" title="이 단어부터 연속 재생">▶️ 이 위치부터</button>
          </div>
          <button class="check-mem-btn ${isMem ? 'checked' : ''}" data-toggle-id="${w.id}">
            ${isMem ? '✓ 암기완료' : '+ 암기하기'}
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.vocab-card').forEach(card => {
    const wordId = card.getAttribute('data-word-id');
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      openModal(wordId);
    });
  });

  container.querySelectorAll('[data-tts-word]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const word = btn.getAttribute('data-tts-word');
      playNativeAudio(word, btn);
    });
  });

  container.querySelectorAll('[data-play-from-idx]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-play-from-idx'));
      startAutoPlaybackFromIndex(idx);
    });
  });

  container.querySelectorAll('[data-toggle-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wordId = btn.getAttribute('data-toggle-id');
      toggleMemorized(wordId);
    });
  });
}

async function toggleMemorized(id) {
  const isMem = !state.memorizedIds.has(id);
  if (isMem) {
    state.memorizedIds.add(id);
  } else {
    state.memorizedIds.delete(id);
  }
  state.reviewCounts[id] = (state.reviewCounts[id] || 0) + 1;

  updateDashboard();
  renderVocabs();

  await saveLocalProgress(state.currentUserId, id, isMem);

  if (navigator.onLine) {
    try {
      await fetch(`/api/users/${state.currentUserId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word_id: id, is_memorized: isMem, toggle: true })
      });
    } catch (e) {
      console.warn('Network unavailable, progress saved locally to IndexedDB.');
    }
  }
}

function renderPairs() {
  const container = document.getElementById('pairs-grid');
  if (!container || !state.allPairs.length) return;

  container.innerHTML = state.allPairs.map(p => `
    <div class="pair-card">
      <div class="pair-row">
        <span class="pair-word text-adj">${p.adj_word} (형)</span>
        <span class="pair-meaning">${p.adj_meaning}</span>
      </div>
      <div class="pair-row">
        <span class="pair-word text-adv">${p.adv_word} (부)</span>
        <span class="pair-meaning">${p.adv_meaning}</span>
      </div>
      <div style="font-size:0.82rem; color:var(--text-muted);">💡 ${p.point}</div>
    </div>
  `).join('');
}

function renderTraps() {
  const container = document.getElementById('traps-grid');
  if (!container || !state.allTraps.length) return;

  container.innerHTML = state.allTraps.map(t => `
    <div class="trap-card">
      <h3>⚠️ ${t.type}</h3>
      <div class="trap-example">예시: ${t.example}</div>
      <div class="trap-guide"><strong>판단 꿀팁:</strong> ${t.guide}</div>
    </div>
  `).join('');
}
