// sync.js — Supabase save/load (raw fetch, no JS client)

const Sync = (() => {

  async function saveGame() {
    const token = Auth.getToken();
    const user  = Auth.getUser();
    if (!token || !user) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/saves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey':        SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${token}`,
          'Prefer':        'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          user_id:      user.id,
          castle_data:  Game.getState(),
          updated_at:   new Date().toISOString(),
        }),
      });
    } catch (e) {
      console.warn('Sync save failed:', e);
    }
  }

  async function loadGame() {
    const token = Auth.getToken();
    const user  = Auth.getUser();
    if (!token || !user) return null;
    try {
      const res  = await fetch(
        `${SUPABASE_URL}/rest/v1/saves?user_id=eq.${user.id}&select=castle_data&limit=1`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${token}` } }
      );
      const data = await res.json();
      return data?.[0]?.castle_data || null;
    } catch (e) {
      console.warn('Sync load failed:', e);
      return null;
    }
  }

  return { saveGame, loadGame };
})();
