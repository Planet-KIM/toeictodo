/* ==========================================================================
   Vocabs Module - Vocabulary Grid, Dynamic Multi-POS Filters & Active Recall Masking
   Phase 1-4 + Multi-POS / Multi-Meaning + Active Recall Blind Masking
   ========================================================================== */

function renderPosBadges(posStr) {
  if (!posStr) return `<span class="tag tag-pos-기타어휘">기타어휘</span>`;
  const parts = posStr.split(/[,/]/).map(p => p.trim()).filter(Boolean);
  if (!parts.length) return `<span class="tag tag-pos-기타어휘">기타어휘</span>`;
  return parts.map(p => `<span class="tag tag-pos-${p}">${p}</span>`).join(' ');
}

function getFilteredWords() {
  if (!state.allWords || !state.allWords.length) return [];
  
  const wrongIds = new Set(state.wrongWords.map(w => w.id));

  return state.allWords.filter(w => {
    if (state.currentPosFilter !== 'all' && (!w.pos || !w.pos.includes(state.currentPosFilter))) return false;
    if (state.currentPrioFilter !== 'all' && w.priority !== state.currentPrioFilter) return false;

    const isMem = state.memorizedIds.has(w.id);
    if (state.currentStatusFilter === 'memorized' && !isMem) return false;
    if (state.currentStatusFilter === 'unmemorized' && isMem) return false;
    if (state.currentStatusFilter === 'wrong_notebook' && !wrongIds.has(w.id)) return false;

    // Alphabet Jumper Filter
    if (state.alphabetFilter && state.alphabetFilter !== 'all') {
      const firstChar = w.word.charAt(0).toUpperCase();
      if (firstChar !== state.alphabetFilter) return false;
    }

    if (state.searchQuery) {
      const targetStr = `${w.word} ${w.meaning} ${w.collocation} ${w.example_en} ${w.example_ko}`.toLowerCase();
      if (!targetStr.includes(state.searchQuery)) return false;
    }

    return true;
  });
}

/**
 * Renders A-Z Alphabet Jumper Pills
 */
function renderAlphabetJumper() {
  const container = document.getElementById('alphabet-jumper-bar');
  if (!container) return;

  const alphabets = ['all', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];
  container.innerHTML = alphabets.map(letter => {
    const label = letter === 'all' ? 'All (A-Z)' : letter;
    const activeClass = state.alphabetFilter === letter ? 'active' : '';
    return `<button class="alpha-btn ${activeClass}" data-alpha="${letter}">${label}</button>`;
  }).join('');

  container.querySelectorAll('.alpha-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.alpha-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.alphabetFilter = btn.getAttribute('data-alpha');
      state.currentPage = 1;
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  });
}

function renderDynamicPosFilterPills() {
  const container = document.getElementById('pos-filters');
  if (!container || !state.allWords) return;

  const posCounts = {};
  state.allWords.forEach(w => {
    if (!w.pos) {
      posCounts['기타어휘'] = (posCounts['기타어휘'] || 0) + 1;
    } else {
      const parts = w.pos.split(/[,/]/).map(p => p.trim()).filter(Boolean);
      parts.forEach(p => {
        posCounts[p] = (posCounts[p] || 0) + 1;
      });
    }
  });

  const total = state.allWords.length;
  let html = `<button class="filter-pill ${state.currentPosFilter === 'all' ? 'active' : ''}" data-pos="all">전체 (${total})</button>`;

  const knownOrder = ['형용사', '부사', '접속사', '접속부사', '전치사', '관계사', '명사', '동사'];
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
      state.currentPage = 1;
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

/**
 * Renders Top & Bottom Pagination Control Bar
 */
function renderPaginationControls(totalItems) {
  const topContainer = document.getElementById('pagination-top');
  const bottomContainer = document.getElementById('pagination-bottom');

  if (state.pageSize === 'all' || totalItems <= state.pageSize) {
    if (topContainer) topContainer.innerHTML = '';
    if (bottomContainer) bottomContainer.innerHTML = '';
    return;
  }

  const totalPages = Math.ceil(totalItems / state.pageSize);
  if (state.currentPage > totalPages) state.currentPage = totalPages;
  if (state.currentPage < 1) state.currentPage = 1;

  const html = `
    <button class="page-btn prev-btn" ${state.currentPage <= 1 ? 'disabled' : ''}>◀ 이전</button>
    <span class="page-info">${state.currentPage} / ${totalPages} 페이지</span>
    <button class="page-btn next-btn" ${state.currentPage >= totalPages ? 'disabled' : ''}>다음 ▶</button>
  `;

  [topContainer, bottomContainer].forEach(c => {
    if (!c) return;
    c.innerHTML = html;
    c.querySelector('.prev-btn')?.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderVocabs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
    c.querySelector('.next-btn')?.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderVocabs();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}

function setupFilters() {
  renderAlphabetJumper();

  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.toLowerCase().trim();
      searchClear.style.display = state.searchQuery ? 'block' : 'none';
      state.currentPage = 1;
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
      state.currentPage = 1;
      if (state.isAutoPlaying) stopAutoPlayback();
      state.autoPlayIndex = 0;
      renderVocabs();
    });
  }

  // View Mode Toggle Listeners
  const cardViewBtn = document.getElementById('view-mode-card');
  const compactViewBtn = document.getElementById('view-mode-compact');
  if (cardViewBtn && compactViewBtn) {
    cardViewBtn.addEventListener('click', () => {
      cardViewBtn.classList.add('active');
      compactViewBtn.classList.remove('active');
      state.viewMode = 'card';
      renderVocabs();
    });
    compactViewBtn.addEventListener('click', () => {
      compactViewBtn.classList.add('active');
      cardViewBtn.classList.remove('active');
      state.viewMode = 'compact';
      renderVocabs();
    });
  }

  // Active Recall Mask Mode Toggle Listeners
  const maskNoneBtn = document.getElementById('mask-mode-none');
  const maskMeaningBtn = document.getElementById('mask-mode-meaning');
  const maskWordBtn = document.getElementById('mask-mode-word');

  if (maskNoneBtn && maskMeaningBtn && maskWordBtn) {
    [maskNoneBtn, maskMeaningBtn, maskWordBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        [maskNoneBtn, maskMeaningBtn, maskWordBtn].forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.id === 'mask-mode-meaning') state.maskMode = 'meaning';
        else if (btn.id === 'mask-mode-word') state.maskMode = 'word';
        else state.maskMode = 'none';
        renderVocabs();
      });
    });
  }

  // Page Size Select Listener
  const pageSizeSelect = document.getElementById('page-size-select');
  if (pageSizeSelect) {
    pageSizeSelect.addEventListener('change', (e) => {
      const val = e.target.value;
      state.pageSize = val === 'all' ? 'all' : parseInt(val);
      state.currentPage = 1;
      renderVocabs();
    });
  }

  document.querySelectorAll('#prio-filters .filter-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#prio-filters .filter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentPrioFilter = btn.getAttribute('data-prio');
      state.currentPage = 1;
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
      state.currentPage = 1;
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
  const allFiltered = getFilteredWords();
  document.getElementById('result-count').textContent = allFiltered.length;
  updateStartSelectOptions();

  renderPaginationControls(allFiltered.length);

  if (allFiltered.length === 0) {
    container.className = 'vocab-grid';
    container.innerHTML = `<div class="empty-state text-muted" style="grid-column: 1/-1; text-align:center; padding: 40px;">검색 결과에 해당하는 단어가 없습니다.</div>`;
    return;
  }

  // Slice words for active page
  let displayWords = allFiltered;
  let pageOffset = 0;
  if (state.pageSize !== 'all') {
    pageOffset = (state.currentPage - 1) * state.pageSize;
    displayWords = allFiltered.slice(pageOffset, pageOffset + state.pageSize);
  }

  // Active Recall Masking Helpers
  const getWordHtml = (wText) => {
    if (state.maskMode === 'word') {
      return `<span class="masked-content" title="클릭하여 단어 확인">${wText}</span>`;
    }
    return wText;
  };

  const getMeaningHtml = (mText) => {
    if (state.maskMode === 'meaning') {
      return `<span class="masked-content" title="클릭하여 뜻 확인">${mText}</span>`;
    }
    return mText;
  };

  // Render Compact 1-Line View Mode
  if (state.viewMode === 'compact') {
    container.className = 'vocab-grid compact-mode';
    container.innerHTML = displayWords.map((w, idx) => {
      const globalIdx = pageOffset + idx;
      const isMem = state.memorizedIds.has(w.id);
      const prioClass = `badge-${w.priority.toLowerCase()}`;
      return `
        <div class="compact-row ${isMem ? 'memorized' : ''}" data-word-id="${w.id}" data-item-idx="${globalIdx}">
          <div class="compact-left">
            <span class="compact-no">${globalIdx + 1}</span>
            <span class="compact-word">${getWordHtml(w.word)}</span>
            <span class="badge ${prioClass}">${w.priority}</span>
            ${renderPosBadges(w.pos)}
            <span class="compact-meaning">${getMeaningHtml(w.meaning)}</span>
          </div>
          <div class="compact-right">
            <button class="speech-btn" data-tts-word="${w.word}" title="원어민 발음 듣기">🔊</button>
            <button class="check-mem-btn ${isMem ? 'checked' : ''}" data-toggle-id="${w.id}">
              ${isMem ? '✓' : '+'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Render Card 3D View Mode
    container.className = 'vocab-grid';
    container.innerHTML = displayWords.map((w, idx) => {
      const globalIdx = pageOffset + idx;
      const isMem = state.memorizedIds.has(w.id);
      const prioClass = `badge-${w.priority.toLowerCase()}`;
      return `
        <div class="vocab-card ${isMem ? 'memorized' : ''}" data-word-id="${w.id}" data-item-idx="${globalIdx}">
          <div class="card-top">
            <span class="card-word">${getWordHtml(w.word)}</span>
            <div class="card-tags">
              <span class="badge ${prioClass}">${w.priority}등급</span>
              ${renderPosBadges(w.pos)}
            </div>
          </div>
          <div class="card-meaning">${getMeaningHtml(w.meaning)}</div>
          ${w.collocation ? `<div class="card-collocation">💡 ${w.collocation}</div>` : ''}
          <div class="card-footer">
            <div class="card-footer-left">
              <button class="speech-btn" data-tts-word="${w.word}" title="원어민 발음 들으러가기">🔊</button>
              <button class="play-from-here-btn" data-play-from-idx="${globalIdx}" title="이 단어부터 연속 재생">▶️ 이 위치부터</button>
            </div>
            <button class="check-mem-btn ${isMem ? 'checked' : ''}" data-toggle-id="${w.id}">
              ${isMem ? '✓ 암기완료' : '+ 암기하기'}
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Attach Card & Compact Row Click Event Handlers
  container.querySelectorAll('.vocab-card, .compact-row').forEach(card => {
    const wordId = card.getAttribute('data-word-id');
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('.masked-content')) return;
      openModal(wordId);
    });
  });

  // Attach Mask Unmask Click Handlers
  container.querySelectorAll('.masked-content').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      el.classList.toggle('unmasked');
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
