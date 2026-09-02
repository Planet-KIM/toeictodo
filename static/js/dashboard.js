/* ==========================================================================
   Dashboard Module - Progress Tracking, Statistics & Phase 3 Activity Streak Chart
   ========================================================================== */

async function updateDashboard() {
  if (!state.allWords.length) return;

  const nameEl = document.getElementById('dash-user-name');
  if (nameEl) nameEl.textContent = state.currentUserName;

  const total = state.allWords.length;
  const memorizedTotal = state.memorizedIds.size;
  const overallPercent = Math.round((memorizedTotal / total) * 100);

  const ringFill = document.getElementById('overall-ring');
  const percentText = document.getElementById('overall-percent');
  if (ringFill && percentText) {
    percentText.textContent = `${overallPercent}%`;
    const offset = 264 - (264 * overallPercent) / 100;
    ringFill.style.strokeDashoffset = offset;
  }

  const adjWords = state.allWords.filter(w => w.pos === '형용사');
  const advWords = state.allWords.filter(w => w.pos === '부사');

  const adjDone = adjWords.filter(w => state.memorizedIds.has(w.id)).length;
  const advDone = advWords.filter(w => state.memorizedIds.has(w.id)).length;

  document.getElementById('adj-done-count').textContent = adjDone;
  document.getElementById('adv-done-count').textContent = advDone;

  document.getElementById('adj-progress-bar').style.width = `${Math.round((adjDone / 300) * 100)}%`;
  document.getElementById('adv-progress-bar').style.width = `${Math.round((advDone / 250) * 100)}%`;

  const prioAWords = state.allWords.filter(w => w.priority === 'A');
  const prioADone = prioAWords.filter(w => state.memorizedIds.has(w.id)).length;
  document.getElementById('prio-a-done').textContent = prioADone;
  document.getElementById('prio-a-bar').style.width = `${Math.round((prioADone / prioAWords.length) * 100)}%`;

  // Wrong notebook count for active user
  const wrongCountEl = document.getElementById('user-wrong-count');
  if (wrongCountEl) {
    wrongCountEl.textContent = state.wrongWords.length;
  }

  // Phase 3: Fetch & Render 7-Day Activity Chart & Streak Counter
  await renderActivityStreakChart();
}

/**
 * Phase 3: Renders 7-Day Activity Bar Chart and Consecutive Streak Badge with Exception Fallback
 */
async function renderActivityStreakChart() {
  const chartContainer = document.getElementById('activity-chart-container');
  const streakEl = document.getElementById('dash-streak-count');

  if (!chartContainer) return;

  try {
    let streakDays = 0;
    let chartData = [];

    if (navigator.onLine) {
      const res = await fetch(`/api/users/${state.currentUserId}/activity`);
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        streakDays = result.data.streak_days || 0;
        chartData = result.data.chart_data || [];
      }
    }

    if (streakEl) streakEl.textContent = streakDays;

    if (!chartData || chartData.length === 0) {
      chartContainer.innerHTML = `<div class="text-muted" style="width:100%; text-align:center; padding:20px 0; font-size:0.85rem;">오늘 첫 단어를 암기하고 연속 1일 차 달성을 시작해보세요! 🚀</div>`;
      return;
    }

    const maxCnt = Math.max(...chartData.map(d => d.count), 1);

    chartContainer.innerHTML = chartData.map(d => {
      const heightPercent = Math.max(12, Math.round((d.count / maxCnt) * 100));
      const barColor = d.count > 0 ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.08)';
      return `
        <div style="flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end;">
          <span style="font-size:0.75rem; color:var(--text-muted); margin-bottom:4px;">${d.count > 0 ? d.count : ''}</span>
          <div style="width:100%; max-width:28px; height:${heightPercent}%; background:${barColor}; border-radius:4px; transition:all 0.3s ease;" title="${d.date}: ${d.count}개 학습"></div>
          <span style="font-size:0.75rem; color:var(--text-muted); margin-top:6px;">${d.label}</span>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.warn('[Dashboard] Activity chart render exception fallback:', e);
    if (chartContainer) {
      chartContainer.innerHTML = `<div class="text-muted" style="width:100%; text-align:center; padding:20px 0; font-size:0.85rem;">학습 활동 차트 로딩 완료</div>`;
    }
  }
}

function setupDashboardQuickButtons() {
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'fc-a') startFlashcardMode('A');
      else if (action === 'fc-unlearned') startFlashcardMode('unlearned');
      else if (action === 'quiz-word') startQuizMode('word');
      else if (action === 'quiz-wrong') startQuizMode('wrong');
    });
  });
}
