// app.js — Boot, events, loop v1.5.0

(async function boot() {
  const authScreen = document.getElementById('auth-screen');
  const authError  = document.getElementById('auth-error');
  const setErr   = msg => { authError.textContent = msg; };
  const clearErr = ()  => { authError.textContent = ''; };

  // Auth tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('auth-' + btn.dataset.tab).classList.add('active');
      clearErr();
    });
  });

  // Login
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    if (!email || !pass) return setErr('Enter email and password.');
    clearErr();
    try { await Auth.login(email, pass); await startGame(); } catch (e) { setErr(e.message); }
  });

  // Register
  document.getElementById('btn-register').addEventListener('click', async () => {
    const name  = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass  = document.getElementById('reg-password').value;
    if (!name || !email || !pass) return setErr('Fill in all fields.');
    if (pass.length < 6) return setErr('Password must be 6+ characters.');
    clearErr();
    try { await Auth.register(email, pass); await startGame(name); } catch (e) { setErr(e.message); }
  });

  // Guest
  document.getElementById('btn-guest').addEventListener('click', () => startGame());

  // Logout (saves first)
  document.getElementById('btn-logout').addEventListener('click', () => {
    Sync.save();
    Auth.logout();
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    authScreen.classList.add('active');
    clearErr();
  });

  // Modal
  document.getElementById('modal-close').addEventListener('click', UI.closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') UI.closeModal();
  });

  // Inventory + drawer
  document.getElementById('btn-inventory').addEventListener('click', UI.openInventory);
  document.getElementById('btn-dwellers').addEventListener('click', UI.openDrawer);
  document.getElementById('btn-close-drawer').addEventListener('click', UI.closeDrawer);
  document.getElementById('dweller-drawer-backdrop').addEventListener('click', UI.closeDrawer);

  // FAB map button → opens map
  document.getElementById('fab-map').addEventListener('click', () => UI.showScreen('map'));

  // Exit button → back to castle
  document.getElementById('btn-map-back').addEventListener('click', () => UI.showScreen('castle'));

  // Map sub-tabs
  document.querySelectorAll('.map-tab').forEach(t => {
    t.addEventListener('click', () => UI.switchMapTab(t.dataset.mtab));
  });

  // Start
  async function startGame(newName) {
    let saved = await Sync.load();  // local + cloud
    Game.init(saved);
    if (newName && !saved) Game.getState().castleName = `${newName}'s Ironhold`;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('game-screen').classList.add('active');
    UI.renderAll();
    Sync.save(); // ensure a save exists immediately
    beginTicks();
  }

  function beginTicks() {
    // Resource tick + local save every 3s
    setInterval(() => { Game.tick(); UI.renderResources(); Sync.saveLocal(); }, 3000);
    // Cloud backup every 30s
    setInterval(() => { Sync.saveCloud(); }, 30000);
  }

  // Save on tab close / background (critical for not losing progress)
  window.addEventListener('beforeunload', () => { Sync.saveLocal(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { Sync.saveLocal(); Sync.saveCloud(); }
  });
})();
