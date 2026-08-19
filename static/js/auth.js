/* ==========================================================================
   Auth Module - Login, User Registration & Session Management
   ========================================================================== */

function setupAuthUI() {
  const tabLoginBtn = document.getElementById('tab-login-mode');
  const tabRegBtn = document.getElementById('tab-reg-mode');
  const formLogin = document.getElementById('form-login-mode');
  const formReg = document.getElementById('form-reg-mode');

  if (tabLoginBtn && tabRegBtn) {
    tabLoginBtn.addEventListener('click', () => {
      tabLoginBtn.classList.add('active');
      tabRegBtn.classList.remove('active');
      formLogin.classList.remove('hidden');
      formReg.classList.add('hidden');
    });

    tabRegBtn.addEventListener('click', () => {
      tabRegBtn.classList.add('active');
      tabLoginBtn.classList.remove('active');
      formReg.classList.remove('hidden');
      formLogin.classList.add('hidden');
    });
  }

  const submitLoginBtn = document.getElementById('btn-submit-login');
  if (submitLoginBtn) {
    submitLoginBtn.addEventListener('click', () => {
      const select = document.getElementById('auth-user-select');
      if (select && select.value) {
        loginUser(parseInt(select.value));
      }
    });
  }

  const submitRegBtn = document.getElementById('btn-submit-reg');
  if (submitRegBtn) {
    submitRegBtn.addEventListener('click', async () => {
      const nameInput = document.getElementById('auth-reg-name');
      const name = nameInput ? nameInput.value.trim() : '';
      if (!name) {
        alert('이름을 입력해 주세요.');
        return;
      }

      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          alert(`'${data.user.name}' 님 환영합니다! 회원가입이 완료되었습니다.`);
          if (nameInput) nameInput.value = '';
          await renderAuthUserOptions();
          loginUser(data.user.id);
        } else {
          alert(data.error || '회원가입 실패');
        }
      } catch (e) {
        console.error('Registration failed:', e);
      }
    });
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => logoutUser());
  }
}

async function renderAuthUserOptions() {
  try {
    const res = await fetch('/api/users');
    state.usersList = await res.json();

    const select = document.getElementById('auth-user-select');
    if (select) {
      if (state.usersList.length === 0) {
        select.innerHTML = `<option value="">등록된 계정이 없습니다. 회원가입해 주세요.</option>`;
      } else {
        select.innerHTML = state.usersList.map(u => `
          <option value="${u.id}">${u.name}</option>
        `).join('');
      }
    }
  } catch (e) {
    console.error('Failed to load auth users:', e);
  }
}

async function checkAuthStatus() {
  await renderAuthUserOptions();

  const savedUserId = localStorage.getItem('toeic_logged_in_user_id');
  if (savedUserId && state.usersList.some(u => u.id === parseInt(savedUserId))) {
    loginUser(parseInt(savedUserId));
  } else {
    showLoginScreen();
  }
}

function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.querySelector('main');
  const header = document.querySelector('.app-header');

  if (loginScreen) loginScreen.classList.remove('hidden');
  if (mainApp) mainApp.classList.add('hidden');
  if (header) header.classList.add('hidden');
}

async function loginUser(userId) {
  const user = state.usersList.find(u => u.id === userId);
  if (!user) return;

  state.currentUserId = userId;
  state.currentUserName = user.name;
  localStorage.setItem('toeic_logged_in_user_id', userId.toString());

  const loginScreen = document.getElementById('login-screen');
  const mainApp = document.querySelector('main');
  const header = document.querySelector('.app-header');

  if (loginScreen) loginScreen.classList.add('hidden');
  if (mainApp) mainApp.classList.remove('hidden');
  if (header) header.classList.remove('hidden');

  const headerUserName = document.getElementById('header-user-name');
  if (headerUserName) headerUserName.textContent = user.name;

  await switchUserProfile(userId);
}

function logoutUser() {
  if (state.isAutoPlaying) stopAutoPlayback();
  
  localStorage.removeItem('toeic_logged_in_user_id');
  state.currentUserId = null;
  state.currentUserName = '';

  showLoginScreen();
}
