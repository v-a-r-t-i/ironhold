// sync.js — Save/load with localStorage cache + Supabase cloud sync

const Sync = (() => {

  const LS_KEY = 'ironhold_save';

  // ─── LOCAL CACHE (instant, always works) ─────────────────
  function saveLocal() {
    try {
      const state = Game.getState();
      if (state) localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) { console.warn('Local save failed:', e); }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { console.warn('Local load failed:', e); return null; }
  }

  function clearLocal() {
    try { localStorage.removeItem(LS_KEY); } catch (e) {}
  }

  // ─── CLOUD SAVE (Supabase, best-effort) ──────────────────
  async function saveCloud() {
    const token = Auth.getToken();
    const user  = Auth.getUser();
    if (!token || !user) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/saves`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer':        'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id:     user.id,
          castle_data: Game.getState(),
          updated_at:  new Date().toISOString(),
        }),
      });
      return res.ok;
    } catch (e) { console.warn('Cloud save failed:', e); return false; }
  }

  async function loadCloud() {
    const token = Auth.getToken();
    const user  = Auth.getUser();
    if (!token || !user) return null;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/saves?user_id=eq.${user.id}&select=castle_data,updated_at&limit=1`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      return data?.[0]?.castle_data || null;
    } catch (e) { console.warn('Cloud load failed:', e); return null; }
  }

  // ─── PUBLIC: save both layers ────────────────────────────
  function save() {
    saveLocal();          // always, instant
    saveCloud();          // fire-and-forget cloud backup
  }

  // ─── PUBLIC: load — cloud wins if present, else local ────
  async function load() {
    // Local first for instant boot
    const local = loadLocal();
    // Try cloud (may be null if not logged in or table missing)
    const cloud = await loadCloud();
    // Prefer whichever has more progress (cloud usually authoritative)
    if (cloud) {
      // Cache cloud locally too
      try { localStorage.setItem(LS_KEY, JSON.stringify(cloud)); } catch (e) {}
      return cloud;
    }
    return local;
  }

  return { save, load, saveLocal, loadLocal, clearLocal, saveCloud, loadCloud };
})();
