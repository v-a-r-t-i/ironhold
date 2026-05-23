// auth.js — Supabase authentication

const Auth = (() => {
  let _token = null;
  let _user  = null;

  async function login(email, password) {
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    _token = data.access_token;
    _user  = data.user;
    return data;
  }

  async function register(email, password) {
    const res  = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error_description || data.error);
    if (data.access_token) { _token = data.access_token; _user = data.user; }
    return data;
  }

  function logout() { _token = null; _user = null; }

  function getToken()  { return _token; }
  function getUser()   { return _user; }
  function isLoggedIn(){ return !!_token; }

  return { login, register, logout, getToken, getUser, isLoggedIn };
})();
