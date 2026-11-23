window.SUPABASE_URL = 'https://supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_Tia2al7otnpgx-f03XciUw_6YSivOJL';

window.supabaseClient = null;
window.supabaseConfigured = Boolean(
  window.supabase &&
  window.SUPABASE_URL !== 'https://supabase.co' &&
  window.SUPABASE_ANON_KEY !== 'sb_publishable_Tia2al7otnpgx-f03XciUw_6YSivOJL'
);

if (window.supabaseConfigured) {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY,
    { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
  );
}
