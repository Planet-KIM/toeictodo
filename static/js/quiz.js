/* ==========================================================================
   Quiz Module - Part 5 Suffix Derivations, 4-Option Generator & Exception Handling
   ========================================================================== */

function setupQuiz() {
  const startBtn = document.getElementById('start-quiz-btn');
  if (startBtn) startBtn.addEventListener('click', startQuiz);
  
  const retryBtn = document.getElementById('quiz-retry-btn');
  if (retryBtn) retryBtn.addEventListener('click', resetQuizSetup);

  const dashBtn = document.getElementById('quiz-dash-btn');
  if (dashBtn) dashBtn.addEventListener('click', () => switchTab('dashboard'));
}

function startQuizMode(type) {
  switchTab('quiz');
  if (type) {
    document.getElementById('quiz-type-select').value = type;
  }
}

/**
 * Generate Smart Part 5 Suffix Derivations (e.g. available -> availability, availably, avail)
 * Exception Handling: Falls back cleanly to related words of distinct POS if suffix rules fail.
 */
function generatePart5Choices(item) {
  const correct = item.word.trim();
  const lower = correct.toLowerCase();
  const choicesSet = new Set([correct]);

  // Stem extraction helper
  let stem = lower;
  if (lower.endsWith('able')) stem = lower.slice(0, -4);
  else if (lower.endsWith('ible')) stem = lower.slice(0, -4);
  else if (lower.endsWith('ive')) stem = lower.slice(0, -3);
  else if (lower.endsWith('al')) stem = lower.slice(0, -2);
  else if (lower.endsWith('ful')) stem = lower.slice(0, -3);
  else if (lower.endsWith('ous')) stem = lower.slice(0, -3);
  else if (lower.endsWith('ent')) stem = lower.slice(0, -3);
  else if (lower.endsWith('ant')) stem = lower.slice(0, -3);
  else if (lower.endsWith('ly')) stem = lower.slice(0, -2);

  // Attempt Rule-Based Derivations
  if (item.pos === '형용사') {
    choicesSet.add(lower + 'ly');
    choicesSet.add(stem + 'ability');
    choicesSet.add(stem + 'ness');
    choicesSet.add(stem + 'tion');
  } else if (item.pos === '부사') {
    if (lower.endsWith('ly')) {
      choicesSet.add(lower.slice(0, -2)); // adjective base
    }
    choicesSet.add(stem + 'tion');
    choicesSet.add(stem + 'ness');
  } else if (item.pos === '명사') {
    choicesSet.add(stem + 'able');
    choicesSet.add(lower + 'ly');
    choicesSet.add(stem + 'ize');
  } else if (item.pos === '동사') {
    choicesSet.add(stem + 'tion');
    choicesSet.add(stem + 'able');
    choicesSet.add(lower + 'ly');
  }

  // Filter out any invalid / blank entries
  let choicesList = Array.from(choicesSet).filter(c => c && c.trim().length > 1);

  // Exception Fallback: Fill up to 4 choices using other words of distinct POS from state.allWords
  if (choicesList.length < 4) {
    const otherWords = state.allWords.filter(w => w.id !== item.id);
    otherWords.sort(() => 0.5 - Math.random());

    for (let w of otherWords) {
      if (!choicesList.includes(w.word)) {
        choicesList.push(w.word);
      }
      if (choicesList.length >= 4) break;
    }
  }

  // Limit to 4 choices and shuffle
  choicesList = choicesList.slice(0, 4);
  choicesList.sort(() => 0.5 - Math.random());

  return choicesList;
}

function startQuiz() {
  const type = document.getElementById('quiz-type-select').value;
  const count = parseInt(document.getElementById('quiz-count-select').value);
  const prio = document.getElementById('quiz-prio-select').value;

  let pool = [...state.allWords];
  
  if (type === 'wrong') {
    if (!state.wrongWords.length) {
      alert('오답 노트에 저장된 틀린 단어가 없습니다! 먼저 실전 퀴즈를 풀어보세요.');
      return;
    }
    pool = [...state.wrongWords];
  } else if (prio !== 'all') {
    pool = pool.filter(w => w.priority === prio);
  }

  if (pool.length < 4) {
    alert('선택한 조건의 단어가 4개 미만입니다. 더 많은 단어가 포함된 등급/유형을 선택해주세요.');
    return;
  }

  pool.sort(() => 0.5 - Math.random());
  const selected = pool.slice(0, Math.min(count, pool.length));

  state.quizQuestions = selected.map(item => {
    let questionText = item.word;
    let questionSub = '';
    let correctAnswer = item.meaning;
    let choices = [item.meaning];

    if (type === 'word') {
      questionText = item.meaning;
      correctAnswer = item.word;
    } else if (type === 'blank') {
      if (item.example_en && item.example_en.toLowerCase().includes(item.word.toLowerCase())) {
        const regex = new RegExp(reEscape(item.word), 'gi');
        questionText = item.example_en.replace(regex, '_______');
        questionSub = item.example_ko;
      } else {
        questionText = `Sentence: The staff handles the task _______ .`;
        questionSub = `해석: 직원들은 업무를 처리합니다.`;
      }
      correctAnswer = item.word;
      choices = generatePart5Choices(item);
    } else if (type === 'wrong') {
      questionText = item.word;
      correctAnswer = item.meaning;
    }

    if (type !== 'blank') {
      const otherWords = state.allWords.filter(w => w.id !== item.id);
      otherWords.sort(() => 0.5 - Math.random());

      choices = [correctAnswer];
      for (let i = 0; i < 3; i++) {
        if (type === 'word') {
          choices.push(otherWords[i].word);
        } else {
          choices.push(otherWords[i].meaning);
        }
      }
      choices.sort(() => 0.5 - Math.random());
    }

    return {
      item,
      type,
      questionText,
      questionSub,
      correctAnswer,
      choices
    };
  });

  state.quizCurrentIdx = 0;
  state.quizScore = 0;
  state.wrongAnswers = [];

  document.getElementById('quiz-setup').classList.add('hidden');
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('quiz-active').classList.remove('hidden');

  renderQuizQuestion();
}

function reEscape(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderQuizQuestion() {
  const q = state.quizQuestions[state.quizCurrentIdx];
  if (!q) return;

  document.getElementById('q-curr-num').textContent = state.quizCurrentIdx + 1;
  document.getElementById('q-total-num').textContent = state.quizQuestions.length;

  const scorePercent = Math.round((state.quizScore / Math.max(1, state.quizCurrentIdx)) * 100);
  document.getElementById('q-live-score').textContent = state.quizCurrentIdx === 0 ? '100%' : `${scorePercent}%`;

  document.getElementById('q-category-tag').textContent = `${q.item.pos} · ${q.item.priority}등급`;
  document.getElementById('q-question-text').textContent = q.questionText;
  document.getElementById('q-question-sub').textContent = q.questionSub || '';

  const optionsContainer = document.getElementById('q-options-container');
  optionsContainer.innerHTML = q.choices.map((choice, idx) => `
    <button class="quiz-opt-btn" data-choice-idx="${idx}" data-choice-val="${choice.replace(/"/g, '&quot;')}">
      (${String.fromCharCode(65 + idx)}) ${choice}
    </button>
  `).join('');

  optionsContainer.querySelectorAll('.quiz-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const choiceIdx = parseInt(btn.getAttribute('data-choice-idx'));
      const choiceVal = btn.getAttribute('data-choice-val');
      selectQuizAnswer(choiceIdx, choiceVal);
    });
  });

  document.getElementById('q-explanation-box').classList.add('hidden');
}

function selectQuizAnswer(choiceIdx, selectedAnswer) {
  const q = state.quizQuestions[state.quizCurrentIdx];
  const buttons = document.querySelectorAll('.quiz-opt-btn');

  buttons.forEach(btn => btn.disabled = true);

  const isCorrect = selectedAnswer === q.correctAnswer;
  if (isCorrect) {
    state.quizScore++;
    buttons[choiceIdx].classList.add('correct');
  } else {
    buttons[choiceIdx].classList.add('wrong');
    state.wrongAnswers.push(q);
    buttons.forEach(btn => {
      if (btn.getAttribute('data-choice-val') === q.correctAnswer) {
        btn.classList.add('correct');
      }
    });
  }

  const expBox = document.getElementById('q-explanation-box');
  const resultBadge = document.getElementById('q-result-badge');

  resultBadge.textContent = isCorrect ? '🎉 정답입니다!' : '❌ 오답입니다!';
  resultBadge.style.color = isCorrect ? 'var(--success)' : 'var(--error)';

  document.getElementById('exp-word').textContent = q.item.word;
  document.getElementById('exp-meaning').textContent = q.item.meaning;
  document.getElementById('exp-collocation').textContent = q.item.collocation || '기본 용례';
  document.getElementById('exp-trap').textContent = q.item.trap_point || '품사 판단 유의';
  document.getElementById('exp-example').textContent = q.item.example_en ? `${q.item.example_en} (${q.item.example_ko})` : '예문 없음';

  expBox.classList.remove('hidden');

  const nextBtn = document.getElementById('q-next-btn');
  nextBtn.onclick = () => {
    state.quizCurrentIdx++;
    if (state.quizCurrentIdx < state.quizQuestions.length) {
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  };
}

async function finishQuiz() {
  document.getElementById('quiz-active').classList.add('hidden');
  document.getElementById('quiz-result').classList.remove('hidden');

  const total = state.quizQuestions.length;
  const percent = Math.round((state.quizScore / total) * 100);

  document.getElementById('final-score-percent').textContent = `${percent}%`;
  document.getElementById('final-correct-count').textContent = state.quizScore;
  document.getElementById('final-total-count').textContent = total;

  const wrongSection = document.getElementById('wrong-answers-section');
  const wrongList = document.getElementById('wrong-list');

  const wrongWordIds = state.wrongAnswers.map(w => w.item.id);

  if (state.wrongAnswers.length > 0) {
    wrongSection.classList.remove('hidden');
    wrongList.innerHTML = state.wrongAnswers.map(w => `
      <div class="vocab-card" style="margin-bottom:10px;">
        <strong>${w.item.word}</strong>: ${w.item.meaning}
        <div class="text-muted" style="font-size:0.8rem;">${w.item.collocation}</div>
      </div>
    `).join('');
  } else {
    wrongSection.classList.add('hidden');
  }

  // Save Quiz Result to DB for active user
  try {
    const type = document.getElementById('quiz-type-select').value;
    await fetch(`/api/users/${state.currentUserId}/quiz-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quiz_type: type,
        score: state.quizScore,
        total: total,
        wrong_word_ids: wrongWordIds
      })
    });

    await reloadUserWrongWords();
    updateDashboard();
  } catch (e) {
    console.error('Failed to log quiz result to DB:', e);
  }
}

function resetQuizSetup() {
  document.getElementById('quiz-result').classList.add('hidden');
  document.getElementById('quiz-active').classList.add('hidden');
  document.getElementById('quiz-setup').classList.remove('hidden');
}
