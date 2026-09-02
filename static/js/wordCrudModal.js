/* ==========================================================================
   Word CRUD Modal Module - Add, Edit, Delete & Multi-POS / Multi-Meaning Support
   ========================================================================== */

let currentFormMode = 'add'; // 'add' or 'edit'
let editingWordId = null;

function setupWordCrudModal() {
  const addWordBtn = document.getElementById('add-new-word-btn');
  const modal = document.getElementById('word-form-modal');
  const closeBtn = document.getElementById('word-form-close-btn');
  const autoFetchBtn = document.getElementById('btn-auto-fetch-details');
  const formSubmitBtn = document.getElementById('btn-save-word');
  const wordInput = document.getElementById('form-word-input');

  if (addWordBtn) {
    addWordBtn.addEventListener('click', () => {
      openWordCrudModal('add');
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      if (modal) modal.classList.add('hidden');
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  // 🔍 Auto-Fetch Button Click Handler with Multi-POS & Multi-Meaning Support
  if (autoFetchBtn && wordInput) {
    autoFetchBtn.addEventListener('click', async () => {
      const word = wordInput.value.trim();
      if (!word) {
        alert('영어 단어를 먼저 입력해 주세요.');
        return;
      }

      autoFetchBtn.disabled = true;
      const origText = autoFetchBtn.textContent;
      autoFetchBtn.textContent = '🔍 검색 중...';

      try {
        const res = await fetch(`/api/words/auto-fetch?word=${encodeURIComponent(word)}`);
        const result = await res.json();

        if (res.ok && result.success && result.data) {
          const d = result.data;
          const posEl = document.getElementById('form-pos-input');
          const meaningEl = document.getElementById('form-meaning-input');
          const chipsContainer = document.getElementById('form-meaning-chips');

          if (posEl) posEl.value = d.pos || '형용사';
          if (meaningEl) meaningEl.value = d.meaning || '';
          
          document.getElementById('form-priority-select').value = d.priority || 'A';
          document.getElementById('form-collocation-input').value = d.collocation || '';
          document.getElementById('form-trap-input').value = d.trap_point || '';
          document.getElementById('form-example-en-input').value = d.example_en || '';
          document.getElementById('form-example-ko-input').value = d.example_ko || '';

          // Render Clickable Korean Meaning Chips
          if (chipsContainer && d.meaning_options && d.meaning_options.length > 0) {
            chipsContainer.innerHTML = '';
            d.meaning_options.forEach((opt) => {
              const chip = document.createElement('button');
              chip.type = 'button';
              chip.className = 'meaning-chip-btn';
              chip.textContent = `+ ${opt}`;
              chip.addEventListener('click', () => {
                const curVal = meaningEl.value.trim();
                if (!curVal) {
                  meaningEl.value = opt;
                } else if (!curVal.includes(opt)) {
                  meaningEl.value = `${curVal}, ${opt}`;
                }
              });
              chipsContainer.appendChild(chip);
            });
          }
        } else {
          alert('자동 예문 검색 실패: 직접 입력해 주세요.');
        }
      } catch (e) {
        console.error('Auto fetch error:', e);
        alert('자동 예문 파싱 실패. 직접 입력해 주세요.');
      } finally {
        autoFetchBtn.disabled = false;
        autoFetchBtn.textContent = origText;
      }
    });
  }

  // 💾 Save / Update Submit Handler
  if (formSubmitBtn) {
    formSubmitBtn.addEventListener('click', async () => {
      const word = document.getElementById('form-word-input').value.trim();
      const meaning = document.getElementById('form-meaning-input').value.trim();
      const pos = document.getElementById('form-pos-input') ? document.getElementById('form-pos-input').value.trim() : '형용사';
      const priority = document.getElementById('form-priority-select').value;
      const topic = document.getElementById('form-topic-input').value.trim() || '일반 업무';
      const collocation = document.getElementById('form-collocation-input').value.trim();
      const trap_point = document.getElementById('form-trap-input').value.trim();
      const example_en = document.getElementById('form-example-en-input').value.trim();
      const example_ko = document.getElementById('form-example-ko-input').value.trim();

      if (!word || !meaning) {
        alert('영어 단어와 한글 뜻은 필수 입력 항목입니다.');
        return;
      }

      const payload = {
        word,
        meaning,
        pos,
        priority,
        topic,
        collocation,
        trap_point,
        example_en,
        example_ko
      };

      try {
        let res, data;
        if (currentFormMode === 'add') {
          res = await fetch('/api/words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          res = await fetch(`/api/words/${editingWordId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }

        data = await res.json();
        if (res.ok && data.success) {
          alert(currentFormMode === 'add' ? `'${word}' 단어가 새롭게 등록되었습니다!` : `'${word}' 단어 정보가 수정되었습니다!`);
          if (modal) modal.classList.add('hidden');
          
          await loadData();
          updateDashboard();
          renderVocabs();
        } else {
          alert(data.error || '저장 실패');
        }
      } catch (e) {
        console.error('Word submit error:', e);
      }
    });
  }
}

function openWordCrudModal(mode, wordObj = null) {
  currentFormMode = mode;
  const modal = document.getElementById('word-form-modal');
  const titleEl = document.getElementById('word-form-modal-title');
  const submitBtn = document.getElementById('btn-save-word');
  const chipsContainer = document.getElementById('form-meaning-chips');
  if (chipsContainer) chipsContainer.innerHTML = '';

  if (mode === 'add') {
    titleEl.textContent = '➕ 새 단어 등록';
    submitBtn.textContent = '💾 DB에 단어 추가하기';
    editingWordId = null;

    document.getElementById('form-word-input').value = '';
    if (document.getElementById('form-pos-input')) document.getElementById('form-pos-input').value = '형용사';
    document.getElementById('form-meaning-input').value = '';
    document.getElementById('form-priority-select').value = 'A';
    document.getElementById('form-topic-input').value = '일반 업무';
    document.getElementById('form-collocation-input').value = '';
    document.getElementById('form-trap-input').value = '';
    document.getElementById('form-example-en-input').value = '';
    document.getElementById('form-example-ko-input').value = '';
  } else if (mode === 'edit' && wordObj) {
    titleEl.textContent = `✏️ 단어 수정: ${wordObj.word}`;
    submitBtn.textContent = '💾 수정사항 저장하기';
    editingWordId = wordObj.id;

    document.getElementById('form-word-input').value = wordObj.word || '';
    if (document.getElementById('form-pos-input')) document.getElementById('form-pos-input').value = wordObj.pos || '형용사';
    document.getElementById('form-meaning-input').value = wordObj.meaning || '';
    document.getElementById('form-priority-select').value = wordObj.priority || 'A';
    document.getElementById('form-topic-input').value = wordObj.topic || '일반 업무';
    document.getElementById('form-collocation-input').value = wordObj.collocation || '';
    document.getElementById('form-trap-input').value = wordObj.trap_point || '';
    document.getElementById('form-example-en-input').value = wordObj.example_en || '';
    document.getElementById('form-example-ko-input').value = wordObj.example_ko || '';
  }

  if (modal) modal.classList.remove('hidden');
}

async function deleteWord(wordId, wordText) {
  if (!confirm(`정말로 '${wordText}' 단어를 삭제하시겠습니까?`)) return;

  try {
    const res = await fetch(`/api/words/${wordId}`, { method: 'DELETE' });
    const data = await res.json();

    if (res.ok && data.success) {
      alert(`'${wordText}' 단어가 삭제되었습니다.`);
      await loadData();
      updateDashboard();
      renderVocabs();
    } else {
      alert('삭제 실패');
    }
  } catch (e) {
    console.error('Delete word error:', e);
  }
}
