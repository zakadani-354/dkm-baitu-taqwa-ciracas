window.Auth = {
  sessionKey:'dkm_session',
  getSession(){ try{return JSON.parse(sessionStorage.getItem(this.sessionKey))}catch(e){return null} },
  isLogged(){ return !!this.getSession() },
  isAdmin(){ return this.getSession()?.role === 'admin' },
  openLogin(){ document.getElementById('loginModal').classList.remove('hidden');document.getElementById('loginModal').classList.add('flex'); },
  closeLogin(){ document.getElementById('loginModal').classList.add('hidden');document.getElementById('loginModal').classList.remove('flex'); },
  async login(username,password){
    if (!supabaseClient) throw new Error('Supabase belum dikonfigurasi');
    const {data,error}=await supabaseClient.from('akun_pengguna').select('*').eq('username',username).eq('password',password).maybeSingle();
    if(error) throw error;
    if(!data) throw new Error('Username atau password salah');
    sessionStorage.setItem(this.sessionKey,JSON.stringify({id:data.id,nama:data.nama_lengkap,username:data.username,role:data.role}));
    this.closeLogin(); App.renderShell(); App.navigate('presensi');
  },
  logout(){ sessionStorage.removeItem(this.sessionKey); App.renderShell(); App.navigate('home'); }
};

document.addEventListener('DOMContentLoaded',()=>{
  document.getElementById('loginForm').addEventListener('submit',async e=>{
    e.preventDefault();
    try{ await Auth.login(document.getElementById('loginUsername').value.trim(),document.getElementById('loginPassword').value); }
    catch(err){ document.getElementById('loginError').textContent=err.message||'Gagal masuk'; }
  });
  document.getElementById('logoutBtn').addEventListener('click',()=>Auth.logout());
});
