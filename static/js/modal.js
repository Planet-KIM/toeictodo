/* ==========================================================================
   Modal Module - Word Detail Popup Overlay Controls & Edit/Delete Buttons
   ========================================================================== */

let activeModalWordId = null;

function setupModal() {
  const modal = document.getElementById('detail-modal');
  const closeBtn = document.getElementById('modal-close-btn');

  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  document.getElementById('modal-tts-btn').addEventListener('click', (e) => {
    if (activeModalWordId) {
      const item = state.allWords.find(w => w.id === activeModalWordId);
      if (item) playNativeAudio(item.word, e.currentTarget);
    }
  });

  document.getElementById('modal-example-tts-btn').addEventListener('click', (e) => {
    if (activeModalWordId) {
      const item = state.allWords.find(w => w.id === activeModalWordId);
      if (item && item.example_en) playNativeAudio(item.example_en, e.currentTarget);
    }
  });

  document.getElementById('modal-toggle-mem-btn').addEventListener('click', () => {
    if (activeModalWordId) {
      toggleMemorized(activeModalWordId);
      openModal(activeModalWordId);
    }
  });

  // Edit Word Button Event
  const editBtn = document.getElementById('modal-edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if (activeModalWordId) {
        const item = state.allWords.find(w => w.id === activeModalWordId);
        if (item) {
          modal.classList.add('hidden');
          openWordCrudModal('edit', item);
        }
      }
    });
  }

  // Delete Word Button Event
  const deleteBtn = document.getElementById('modal-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (activeModalWordId) {
        const item = state.allWords.find(w => w.id === activeModalWordId);
        if (item) {
          modal.classList.add('hidden');
          deleteWord(item.id, item.word);
        }
      }
    });
  }
}

function openModal(wordId) {
  const item = state.allWords.find(w => w.id === wordId);
  if (!item) return;

  activeModalWordId = wordId;
  const isMem = state.memorizedIds.has(wordId);

  document.getElementById('modal-pos').textContent = item.pos;
  document.getElementById('modal-prio').textContent = `${item.priority}등급`;
  document.getElementById('modal-prio').className = `badge badge-${item.priority.toLowerCase()}`;
  document.getElementById('modal-topic').textContent = item.topic;

  document.getElementById('modal-word').textContent = item.word;
  document.getElementById('modal-meaning').textContent = item.meaning;

  document.getElementById('modal-collocation').textContent = item.collocation || '일반 품사 용례';
  document.getElementById('modal-trap').textContent = item.trap_point || '기본 품사 문제 확인';
  document.getElementById('modal-example-en').textContent = item.example_en || '등록된 토익 예문이 없습니다.';
  document.getElementById('modal-example-ko').textContent = item.example_ko || '';

  const btn = document.getElementById('modal-toggle-mem-btn');
  btn.textContent = isMem ? '✓ 암기 완료됨 (클릭 시 미암기로 변경)' : '+ 암기 완료 처리하기';
  btn.className = isMem ? 'secondary-btn' : 'primary-btn';

  document.getElementById('detail-modal').classList.remove('hidden');
}
