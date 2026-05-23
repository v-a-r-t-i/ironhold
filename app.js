// app.js — Boot, event binding, game loop v1.1.0

(async function boot() {

  const authScreen = document.getElementById('auth-screen');
  const gameScreen = document.getElementById('game-screen');
  const authError  = document.getElementById('auth-error');

  const setErr   = msg => { authError.textContent = msg; };
  const clearErr = ()  => { authError.textContent = ''; };

  // ── Auth tab switching ───────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('auth-' + btn.dataset.tab).classList.add('active');
      clearErr();
    });
  });

  // ── Login ────────────────────────────────────────────────
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    if (!email || !pass) return setErr('Enter email and password.');
    clearErr();
    try {
      await Auth.login(email, pass);
      await startGame();
    } catch (e) { setErr(e.message); }
  });

  // ── Register ─────────────────────────────────────────────
  document.getElementById('btn-register').addEventListener('click', async () => {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-password').value;
    if (!name || !email || !pass) return setErr('Fill in all fields.');
    if (pass.length < 6) return setErr('Password must be 6+ characters.');
    clearErr();
    try {
      await Auth.register(email, pass);
      await startGame(name);
    } catch (e) { setErr(e.message); }
  });

  // ── Guest ─────────────────────────────────────────────────
  document.getElementById('btn-guest').addEventListener('click', () => startGame());

  // ── Logout ────────────────────────────────────────────────
  document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.logout();
    gameScreen.classList.remove('active');
    authScreen.classList.add('active');
    clearErr();
  });

  // ── Modal close ───────────────────────────────────────────
  document.getElementById('modal-close').addEventListener('click', UI.closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') UI.closeModal();
  });

  // ── Inventory button ──────────────────────────────────────
  document.getElementById('btn-inventory').addEventListener('click', UI.openInventory);

  // ── Bottom nav ────────────────────────────────────────────
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      UI.switchView(btn.dataset.view);
    });
  });

  // ── START GAME ───────────────────────────────────────────
  async function startGame(newName) {
    let saved = null;
    if (Auth.isLoggedIn()) saved = await Sync.loadGame();
    Game.init(saved);
    if (newName && !saved) {
      Game.getState().castleName = `${newName}'s Ironhold`;
    }
    authScreen.classList.remove('active');
    gameScreen.classList.add('active');
    UI.renderAll();
    beginTicks();
  }

  // ── TICKS ─────────────────────────────────────────────────
  function beginTicks() {
    setInterval(() => { Game.tick(); UI.renderResources(); }, 2000);
    setInterval(() => { if (Auth.isLoggedIn()) Sync.saveGame(); }, 30000);
  }

})();
