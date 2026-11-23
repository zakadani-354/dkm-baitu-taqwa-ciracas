window.SUPABASE_URL = 'SUPABASE_URL';
window.SUPABASE_ANON_KEY = 'SUPABASE_ANON_KEY';

window.supabaseClient = null;
if (
  window.supabase &&
  window.SUPABASE_URL !== 'SUPABASE_URL' &&
  window.SUPABASE_ANON_KEY !== 'SUPABASE_ANON_KEY'
) {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
}
