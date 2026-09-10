/* ==========================================================================
   Quiz Module - Real TOEIC Practice Quiz, Part 5 Fill-in-Blank & Voice STT Quiz
   ========================================================================== */

function setupQuiz() {
  const startBtn = document.getElementById('start-quiz-btn');
  const retryBtn = document.getElementById('quiz-retry-btn');
  const dashBtn = document.getElementById('quiz-dash-btn');

  if (startBtn) {
    startBtn.addEventListener('click', async () => {
      await startQuiz();
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      document.getElementById('quiz-result').classList.add('hidden');
      document.getElementById('quiz-setup').classList.remove('hidden');
    });
  }

  if (dashBtn) {
    dashBtn.addEventListener('click', () => {
      switchTab('dashboard');
    });
  }
}

/**
 * Pre-checks and requests microphone permissions before starting Voice Quiz.
 * Supports both Secure Contexts (HTTPS/Localhost) and HTTP IP environments.
 */
async function requestMicPermissionBeforeQuiz() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    alert('🎤 현재 브라우저가 음성 인식을 지원하지 않습니다. Chrome 또는 Safari 최신 버전을 사용해 주세요.');
    return false;
  }

  // If navigator.mediaDevices.getUserMedia is available (HTTPS / Localhost)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all audio tracks immediately after permission check
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      alert('🎤 마이크 권한이 거부되어 있습니다.\n\n[권한 차단 해제 방법]\n브라우저 주소창 좌측 🔒(자물쇠) 또는 ⚙️ 설정 아이콘을 클릭하여 마이크 권한을 "허용"으로 설정해 주세요.');
      return false;
    }
  }

  // On HTTP IP environments (http://34.64.206.234:7071), mediaDevices is restricted by browser policy.
  // We proceed directly to SpeechRecognition!
  return true;
}

function generatePart5Choices(correctItem) {
  const pos = correctItem.pos || '형용사';
  const word = correctItem.word;
  const choices = [word];

  if (pos.includes('형용사')) {
    if (word.endsWith('able')) choices.push(word.replace(/able$/, 'ability'));
    else if (word.endsWith('ive')) choices.push(word.replace(/ive$/, 'ion'));
    else if (word.endsWith('ant')) choices.push(word.replace(/ant$/, 'ance'));
    else if (word.endsWith('ent')) choices.push(word.replace(/ent$/, 'ence'));
    else choices.push(word + 'ness');

    choices.push(word + 'ly');
    choices.push(word + 's');
  } else if (pos.includes('부사')) {
    if (word.endsWith('ly')) {
      const stem = word.slice(0, -2);
      choices.push(stem);
      choices.push(stem + 'ness');
      choices.push(stem + 's');
    } else {
      choices.push(word + 'ful');
      choices.push(word + 'ness');
      choices.push(word + 'ing');
    }
  } else if (pos.includes('전치사') || pos.includes('접속사')) {
    const grammWords = ['because of', 'although', 'despite', 'however', 'provided that', 'during', 'while', 'unless'];
    const others = grammWords.filter(w => w.toLowerCase() !== word.toLowerCase());
    others.sort(() => 0.5 - Math.random());
    choices.push(others[0], others[1], others[2]);
  } else {
    choices.push(word + 'ly', word + 'tion', word + 'ed');
  }

  while (choices.length < 4) {
    choices.push(word + '_' + choices.length);
  }

  choices.sort(() => 0.5 - Math.random());
  return choices;
}

async function startQuiz() {
  const type = document.getElementById('quiz-type-select').value;
  const count = parseInt(document.getElementById('quiz-count-select').value);
  const prio = document.getElementById('quiz-prio-select').value;

  // Check microphone permission beforehand if Voice Quiz is selected
  if (type === 'voice') {
    const hasMicPermission = await requestMicPermissionBeforeQuiz();
    if (!hasMicPermission) return;
  }

  let pool = [...state.allWords];

  if (type === 'wrong') {
    if (!state.wrongWords || state.wrongWords.length === 0) {
      alert('📌 오답 노트에 저장된 단어가 없습니다. 일반 퀴즈를 진행해 주세요!');
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
    } else if (type === 'voice') {
      questionText = item.word;
      questionSub = '🔊 영어 단어를 보고 한국어 뜻을 마이크로 말씀하세요';
      correctAnswer = item.meaning;
    } else if (type === 'wrong') {
      questionText = item.word;
      correctAnswer = item.meaning;
    }

    if (type !== 'blank' && type !== 'voice') {
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

  // Render Voice STT Mode
  if (q.type === 'voice') {
    optionsContainer.innerHTML = `
      <div class="voice-mic-container" style="grid-column: 1 / -1; display:flex; flex-direction:column; gap:14px; align-items:center;">
        <div id="voice-speech-status" class="voice-speech-box">
          🗣️ 마이크 버튼을 누르고 한국어 뜻을 편하게 말씀하세요
        </div>
        <button id="voice-start-btn" class="voice-mic-btn">
          🎤 음성 정답 말하기 (터치)
        </button>
      </div>
    `;

    const micBtn = document.getElementById('voice-start-btn');
    const statusBox = document.getElementById('voice-speech-status');

    let silenceTimer = null;
    let recognition = null;
    let isEvaluated = false;

    const clearSilenceTimer = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    const startSilenceTimer = (durationSeconds = 5) => {
      clearSilenceTimer();
      silenceTimer = setTimeout(() => {
        if (!isEvaluated && recognition) {
          try { recognition.stop(); } catch(e) {}
          micBtn.classList.remove('listening');
          micBtn.disabled = false;
          micBtn.textContent = '🎤 음성 다시 말하기';
          statusBox.innerHTML = `⏱️ <strong style="color:var(--warning);">5초 동안 음성이 인식되지 않아 취소되었습니다.</strong> 다시 시도해 주세요.`;
          statusBox.classList.remove('active-speech');
        }
      }, durationSeconds * 1000);
    };

    if (micBtn) {
      micBtn.addEventListener('click', async () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          alert('현재 브라우저가 음성 인식을 지원하지 않습니다. Chrome 또는 Safari 최신 버전을 사용해 주세요.');
          return;
        }

        isEvaluated = false;
        recognition = new SpeechRecognition();
        recognition.lang = 'ko-KR';
        recognition.interimResults = true; // Stream real-time spoken text!
        recognition.maxAlternatives = 1;

        micBtn.classList.add('listening');
        micBtn.disabled = true;
        micBtn.textContent = '🎙️ 음성 듣는 중... (말씀하세요)';
        statusBox.innerHTML = `🎙️ 목소리를 듣고 있습니다... <span style="font-size:0.85rem; opacity:0.8;">(5초 무음시 자동 취소)</span>`;
        statusBox.classList.add('active-speech');

        // Start 5-second silence timer
        startSilenceTimer(5);

        recognition.onresult = (event) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptChunk = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptChunk;
            } else {
              interimTranscript += transcriptChunk;
            }
          }

          const currentSpokenText = (finalTranscript || interimTranscript).trim();

          if (currentSpokenText) {
            // Real-time spoken text display ABOVE the button!
            statusBox.innerHTML = `💬 인식 중: <span class="speech-highlight">"${currentSpokenText}"</span>`;
            statusBox.classList.add('active-speech');

            // Reset 5s silence timer while user is actively speaking
            startSilenceTimer(5);
          }

          if (finalTranscript.trim() && !isEvaluated) {
            isEvaluated = true;
            clearSilenceTimer();

            micBtn.classList.remove('listening');
            micBtn.disabled = false;
            micBtn.textContent = '🎤 음성 다시 말하기';
            statusBox.innerHTML = `🗣️ 인식 완료: <span class="speech-highlight">"${finalTranscript.trim()}"</span>`;
            statusBox.classList.remove('active-speech');

            // Evaluate using Korean Fuzzy Matcher
            const verdict = checkKoreanSemanticMatch(finalTranscript.trim(), q.item.meaning);
            handleVoiceQuizVerdict(verdict, finalTranscript.trim());
          }
        };

        recognition.onerror = (e) => {
          clearSilenceTimer();
          micBtn.classList.remove('listening');
          micBtn.disabled = false;
          micBtn.textContent = '🎤 음성 다시 말하기';
          statusBox.classList.remove('active-speech');

          if (e.error === 'no-speech') {
            statusBox.innerHTML = '⏱️ <strong style="color:var(--warning);">5초 동안 음성이 인식되지 않았습니다.</strong> 다시 시도해 주세요.';
          } else {
            statusBox.innerHTML = '⚠️ 음성 인식 실패: 마이크 허용 설정을 확인하거나 주소창 왼쪽 자물쇠/설정을 확인해 주세요.';
          }
        };

        recognition.onend = () => {
          clearSilenceTimer();
          if (!isEvaluated) {
            micBtn.classList.remove('listening');
            micBtn.disabled = false;
            if (!micBtn.textContent.includes('다시 말하기')) {
              micBtn.textContent = '🎤 음성 다시 말하기';
            }
            statusBox.classList.remove('active-speech');
          }
        };

        try {
          recognition.start();
        } catch(err) {
          clearSilenceTimer();
          micBtn.classList.remove('listening');
          micBtn.disabled = false;
        }
      });
    }
  } else {
    // Render Standard Choice Options
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
  }

  document.getElementById('q-explanation-box').classList.add('hidden');
}

function handleVoiceQuizVerdict(verdict, spokenText) {
  const q = state.quizQuestions[state.quizCurrentIdx];
  const isCorrect = verdict.isMatch;

  if (isCorrect) {
    state.quizScore++;
  } else {
    state.wrongAnswers.push(q);
  }

  const expBox = document.getElementById('q-explanation-box');
  const resultBadge = document.getElementById('q-result-badge');

  if (isCorrect) {
    resultBadge.innerHTML = `🎉 정답입니다! <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">(인식: "${spokenText}" ➔ 인정된 뜻: "${verdict.matchedMeaning}")</span>`;
    resultBadge.style.color = 'var(--success)';
  } else {
    resultBadge.innerHTML = `❌ 아쉽네요! <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">(인식: "${spokenText}" / DB 정답: "${q.item.meaning}")</span>`;
    resultBadge.style.color = 'var(--error)';
  }

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
  const score = state.quizScore;
  const percent = Math.round((score / total) * 100);

  document.getElementById('final-score-percent').textContent = `${percent}%`;
  document.getElementById('final-correct-count').textContent = score;
  document.getElementById('final-total-count').textContent = total;

  const wrongSection = document.getElementById('wrong-answers-section');
  const wrongList = document.getElementById('wrong-list');

  if (state.wrongAnswers.length > 0) {
    wrongSection.classList.remove('hidden');
    wrongList.innerHTML = state.wrongAnswers.map(q => `
      <div class="wrong-item">
        <div><strong>${q.item.word}</strong> (${q.item.pos})</div>
        <div>${q.item.meaning}</div>
      </div>
    `).join('');
  } else {
    wrongSection.classList.add('hidden');
  }

  const type = document.getElementById('quiz-type-select').value;
  const wrongWordIds = state.wrongAnswers.map(q => q.item.id);

  if (navigator.onLine) {
    try {
      await fetch(`/api/users/${state.currentUserId}/quiz-results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz_type: type,
          score: score,
          total: total,
          wrong_word_ids: wrongWordIds
        })
      });
    } catch (e) {
      console.warn('Network offline, quiz result not synced to backend.');
    }
  }
}
