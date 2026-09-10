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
  const prioElem = document.getElementById('quiz-prio-select');
  const prio = prioElem ? prioElem.value : 'all';

  const timerElem = document.getElementById('quiz-timer-select');
  const timerSec = timerElem ? parseInt(timerElem.value) : 5;
  state.quizTimerSec = timerSec;

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

  // Render Voice STT Mode (Unified Input Box + 5s Auto-Countdown + Auto-Advance)
  if (q.type === 'voice') {
    const timerSec = state.quizTimerSec || 5;
    optionsContainer.innerHTML = `
      <div class="voice-quiz-unified-card" style="grid-column: 1 / -1; display:flex; flex-direction:column; gap:16px; align-items:center; width:100%; max-width:560px; margin:0 auto;">
        
        <!-- Configurable Countdown Timer Badge (3초 ~ 15초) -->
        <div id="voice-timer-badge" class="voice-timer-badge" style="font-size:1.1rem; font-weight:800; color:#fbbf24; background:rgba(251,191,36,0.15); border:1.5px solid rgba(251,191,36,0.4); padding:8px 22px; border-radius:30px; display:flex; align-items:center; gap:8px;">
          ⏱️ <span id="timer-sec-count">${timerSec}</span>초 남음 (실시간 음성 수신 중)
        </div>

        <!-- Unified Single Input Box (Combines Live Voice STT + Keyboard Input + Submit) -->
        <div class="unified-input-group" style="display:flex; gap:10px; width:100%; align-items:center;">
          <div style="position:relative; flex:1;">
            <input type="text" id="unified-voice-text-input" class="search-box" style="width:100%; padding:14px 18px; font-size:1.1rem; font-weight:700; background:rgba(0,0,0,0.4); border:2px solid var(--accent-primary); color:var(--text-primary); border-radius:var(--radius-md); box-shadow:0 0 20px rgba(99, 102, 241, 0.3);" placeholder="🎙️ 말씀하세요... (음성이 실시간으로 기록됩니다)">
            <span id="mic-vol-bar" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); font-size:0.85rem; color:#34d399; font-weight:800;">🎙️ [▰▰▰▰▱▱]</span>
          </div>
          <button id="btn-unified-submit" class="primary-btn lg" style="padding:14px 24px; white-space:nowrap; border-radius:var(--radius-md); font-weight:800;">제출</button>
        </div>

        <div style="font-size:0.85rem; color:var(--text-secondary); text-align:center;">
          🔊 영어 단어를 보고 마이크로 한국어 뜻을 말씀해 주세요. (인식된 단어가 입력창에 실시간으로 채워집니다)
        </div>

      </div>
    `;

    const unifiedInput = document.getElementById('unified-voice-text-input');
    const unifiedSubmitBtn = document.getElementById('btn-unified-submit');
    const timerBadgeCount = document.getElementById('timer-sec-count');
    const volBar = document.getElementById('mic-vol-bar');

    let mediaRecorder = null;
    let audioChunks = [];
    let audioStream = null;
    let countdownInterval = null;
    let isEvaluated = false;
    let secondsLeft = timerSec;
    let speechRec = null;
    let liveTextCaptured = '';

    const stopRecordingTracks = () => {
      if (speechRec) {
        try { speechRec.stop(); } catch(e){}
        speechRec = null;
      }
      if (audioStream) {
        audioStream.getTracks().forEach(t => t.stop());
        audioStream = null;
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
      }
    };

    const submitVoiceVerdict = (transcriptText) => {
      if (isEvaluated) return;
      isEvaluated = true;
      stopRecordingTracks();

      if (unifiedInput) unifiedInput.value = transcriptText;

      const verdict = checkKoreanSemanticMatch(transcriptText, q.item.meaning);
      handleVoiceQuizVerdict(verdict, transcriptText);
    };

    // Manual Submit Button / Enter Key Handler
    const handleManualSubmit = () => {
      if (isEvaluated) return;
      const val = unifiedInput ? unifiedInput.value.trim() : '';
      if (!val) {
        alert('한국어 뜻 정답을 입력해 주세요.');
        return;
      }
      submitVoiceVerdict(val);
    };

    if (unifiedSubmitBtn) unifiedSubmitBtn.addEventListener('click', handleManualSubmit);
    if (unifiedInput) {
      unifiedInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleManualSubmit();
      });
    }

    // Automatically Start Voice Recording & Countdown Timer + Real-time Syllable Stream
    const startVoiceRecordingPipeline = async () => {
      // 1. Client Web Speech Recognition for Instant Real-Time Syllable Streaming
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          speechRec = new SpeechRecognition();
          speechRec.lang = 'ko-KR';
          speechRec.interimResults = true;
          speechRec.continuous = true;
          speechRec.maxAlternatives = 1;

          speechRec.onresult = (event) => {
            let fullText = '';
            for (let i = 0; i < event.results.length; ++i) {
              fullText += event.results[i][0].transcript;
            }
            const currentLiveSpoken = fullText.trim();
            if (currentLiveSpoken && !isEvaluated) {
              liveTextCaptured = currentLiveSpoken;
              if (unifiedInput) {
                unifiedInput.value = currentLiveSpoken; // STREAM LIVE SYLLABLES IMMEDIATELY!
                unifiedInput.style.borderColor = '#fbbf24';
                unifiedInput.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.5)';
              }
            }
          };

          speechRec.onerror = (err) => {
            console.warn('SpeechRecognition error:', err.error);
          };

          speechRec.start();
        } catch (e) {
          console.warn('SpeechRecognition start failed:', e);
        }
      }

      // 2. MediaRecorder Audio Capture for Server-Side Backup & Audio Meter
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn('Microphone permission missing:', err);
        if (unifiedInput) unifiedInput.placeholder = '⌨️ 마이크 미승인 - 직접 정답 입력';
        return;
      }

      audioChunks = [];
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';

      mediaRecorder = new MediaRecorder(audioStream, { mimeType });

      // Real-time Web Audio Volume Equalizer Meter
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        analyser.fftSize = 32;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateVol = () => {
          if (isEvaluated || !audioStream) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
          const avg = sum / dataArray.length;
          const pct = Math.min(100, Math.round((avg / 128) * 100));
          const barCount = Math.max(1, Math.ceil(pct / 16));
          const bars = '▰'.repeat(barCount) + '▱'.repeat(6 - barCount);
          if (volBar) volBar.textContent = `🎙️ [${bars}]`;
          requestAnimationFrame(updateVol);
        };
        updateVol();
      } catch (e) {}

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (isEvaluated) return;

        // IF REAL-TIME STT OR USER TYPING ALREADY HAS TEXT, SUBMIT INSTANTLY WITHOUT DELAY!
        const currentInputVal = unifiedInput ? unifiedInput.value.trim() : '';
        const textToSubmit = currentInputVal || liveTextCaptured.trim();

        if (textToSubmit) {
          submitVoiceVerdict(textToSubmit);
          return;
        }

        // ONLY IF TEXT IS EMPTY, FALL BACK TO SERVER-SIDE GOOGLE STT UPLOAD
        const timerBadge = document.getElementById('voice-timer-badge');
        if (timerBadge) {
          timerBadge.style.color = '#818cf8';
          timerBadge.style.background = 'rgba(99, 102, 241, 0.2)';
          timerBadge.style.borderColor = 'var(--accent-primary)';
          timerBadge.innerHTML = `⏳ 구글 STT 변환 중... (잠시만 기다려주세요)`;
        }

        if (unifiedInput) unifiedInput.placeholder = '⏳ 구글 STT 변환 중...';

        const audioBlob = new Blob(audioChunks, { type: mimeType });
        const formData = new FormData();
        formData.append('audio', audioBlob, 'speech.webm');

        try {
          const res = await fetch('/api/stt', { method: 'POST', body: formData });
          const data = await res.json();

          if (data.success && data.text) {
            submitVoiceVerdict(data.text);
          } else {
            submitVoiceVerdict(''); // Empty speech -> counted as wrong & auto advance
          }
        } catch (err) {
          submitVoiceVerdict('');
        }
      };

      mediaRecorder.start();

      // Start Countdown Timer with selected duration (3s ~ 15s)
      secondsLeft = timerSec;
      if (timerBadgeCount) timerBadgeCount.textContent = secondsLeft;

      countdownInterval = setInterval(() => {
        secondsLeft--;
        if (timerBadgeCount) timerBadgeCount.textContent = Math.max(0, secondsLeft);

        if (secondsLeft <= 0) {
          clearInterval(countdownInterval);
          countdownInterval = null;

          // If text already exists when timer hits 0, submit immediately!
          const curVal = unifiedInput ? unifiedInput.value.trim() : '';
          const txt = curVal || liveTextCaptured.trim();
          if (txt) {
            submitVoiceVerdict(txt);
          } else if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        }
      }, 1000);
    };

    // Auto-start recording pipeline immediately on question load!
    setTimeout(startVoiceRecordingPipeline, 300);

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

  const displaySpoken = spokenText ? `"${spokenText}"` : '무음/미입력';

  if (isCorrect) {
    resultBadge.innerHTML = `🎉 정답입니다! <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">(입력: ${displaySpoken} ➔ 인정된 뜻: "${verdict.matchedMeaning}")</span>`;
    resultBadge.style.color = 'var(--success)';
  } else {
    resultBadge.innerHTML = `❌ 오답입니다! <span style="font-size:0.9rem; font-weight:600; color:var(--text-secondary);">(입력: ${displaySpoken} / 정답: "${q.item.meaning}")</span>`;
    resultBadge.style.color = 'var(--error)';
  }

  document.getElementById('exp-word').textContent = q.item.word;
  document.getElementById('exp-meaning').textContent = q.item.meaning;
  document.getElementById('exp-collocation').textContent = q.item.collocation || '기본 용례';
  document.getElementById('exp-trap').textContent = q.item.trap_point || '품사 판단 유의';
  document.getElementById('exp-example').textContent = q.item.example_en ? `${q.item.example_en} (${q.item.example_ko})` : '예문 없음';

  expBox.classList.remove('hidden');

  // Auto-advance to the next question after 1.2 seconds delay!
  setTimeout(() => {
    state.quizCurrentIdx++;
    if (state.quizCurrentIdx < state.quizQuestions.length) {
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  }, 1200);
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
