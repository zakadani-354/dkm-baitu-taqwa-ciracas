window.Auth = {
  emailFor(username) { return `${String(username).trim().toLowerCase()}@dkm-baitu-taqwa.invalid`; },
  async init() {
    if (!window.supabaseClient) { DKM.renderNavigation(); return; }
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) console.error(error);
    if (session) await this.loadProfile();
    supabaseClient.auth.onAuthStateChange((_event, sessionNow) => {
      setTimeout(async () => {
        if (sessionNow) await this.loadProfile();
        else { DKM.user = null; DKM.role = null; DKM.renderNavigation(); }
      }, 0);
    });
    DKM.renderNavigation();
  },
  async loadProfile() {
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) { DKM.user = null; DKM.role = null; return; }
    const { data, error } = await supabaseClient.from('akun_pengguna')
      .select('id,nama_lengkap,username,role,created_at').eq('id', user.id).maybeSingle();
    if (error) throw error;
    if (!data) {
      await supabaseClient.auth.signOut();
      DKM.user = null; DKM.role = null;
      return;
    }
    DKM.user = data;
    DKM.role = data.role;
    DKM.renderNavigation();
  },
  openLogin() {
    const modal = document.getElementById('loginModal');
    modal.hidden = false;
    document.getElementById('loginError').textContent = '';
    document.getElementById('loginUsername').focus();
  },
  closeLogin() { document.getElementById('loginModal').hidden = true; },
  async submit(event) {
    event.preventDefault();
    if (!window.supabaseClient) {
      document.getElementById('loginError').textContent = 'Isi konfigurasi Supabase terlebih dahulu.';
      return;
    }
    const username = document.getElementById('loginUsername').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const errorNode = document.getElementById('loginError');
    errorNode.textContent = '';
    DKM.loading(true, 'Memverifikasi akun...');
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({ email: this.emailFor(username), password });
      if (error) throw error;
      await this.loadProfile();
      if (!DKM.user) throw new Error('Akun tidak ditemukan atau belum memiliki akses.');
      this.closeLogin();
      DKM.navigate('presensi');
      DKM.toast(`Selamat datang, ${DKM.user.nama_lengkap}`);
    } catch (error) {
      errorNode.textContent = error.message || 'Username atau password tidak sesuai.';
    } finally { DKM.loading(false); }
  },
  async logout() {
    if (window.supabaseClient) {
      const { error } = await supabaseClient.auth.signOut();
      if (error) { DKM.toast(error.message, 'error'); return; }
    }
    DKM.user = null; DKM.role = null;
    DKM.navigate('home');
    DKM.toast('Anda telah keluar');
  }
};
