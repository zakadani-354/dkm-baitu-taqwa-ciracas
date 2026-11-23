window.App = {
  route:'home',
  menu:[
    {id:'home',label:'Beranda',icon:'house'},
    {id:'presensi',label:'Presensi',icon:'clipboard-check',protected:true},
    {id:'materi',label:'Materi',icon:'book-open',protected:true},
    {id:'jamaah',label:'Database Jamaah',icon:'users',protected:true},
    {id:'program',label:'Program Masjid',icon:'calendar-days',protected:true},
    {id:'akun',label:'Kelola Akun',icon:'contact-round',protected:true,admin:true}
  ],
  showLoading(v){ document.getElementById('loadingOverlay').classList.toggle('hidden',!v); document.getElementById('loadingOverlay').classList.toggle('flex',v); },
  toast(text){
    const el=document.getElementById('toast'); document.getElementById('toastText').textContent=text;
    el.classList.add('show'); clearTimeout(this.toastTimer); this.toastTimer=setTimeout(()=>el.classList.remove('show'),2600);
  },
  renderShell(){
    const session=Auth.getSession();
    const visible=this.menu.filter(m=>!m.protected||session).filter(m=>!m.admin||Auth.isAdmin());
    document.getElementById('sidebarNav').innerHTML=visible.map(m=>`<div class="nav-item ${this.route===m.id?'active':''}" data-route="${m.id}"><i data-lucide="${m.icon}"></i><span>${m.label}</span></div>`).join('');
    document.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>this.navigate(el.dataset.route));
    const bottom=document.getElementById('bottomNav');
    bottom.innerHTML=visible.slice(0,5).map(m=>`<button class="${this.route===m.id?'text-sage':''} flex flex-col items-center gap-1 py-2 text-[10px]" data-route="${m.id}"><i data-lucide="${m.icon}" class="h-[19px]"></i><span>${m.id==='jamaah'?'Jamaah':m.label}</span></button>`).join('');
    bottom.querySelectorAll('[data-route]').forEach(el=>el.onclick=()=>this.navigate(el.dataset.route));
    const badge=document.getElementById('userBadge');
    badge.textContent=session?`${session.nama} · ${session.role}`:'Belum masuk';
    document.getElementById('logoutBtn').classList.toggle('hide-for-role',!session);
    if(window.lucide) lucide.createIcons();
  },
  navigate(route){
    const item=this.menu.find(m=>m.id===route);
    if(!item)return;
    if(item.protected&&!Auth.isLogged()){Auth.openLogin();return;}
    if(item.admin&&!Auth.isAdmin()){this.navigate('home');return;}
    this.route=route; history.replaceState(null,'',`#${route}`);
    this.renderShell();
    if(route==='home') this.renderHome();
    if(route==='presensi') Presensi.render();
    if(route==='materi') Materi.render();
    if(route==='jamaah') Jamaah.render();
    if(route==='program') Program.render();
    if(route==='akun') Akun.render();
  },
  async renderHome(){
    this.showLoading(true);
    const app=document.getElementById('app');
    app.innerHTML=`<div class="mx-auto max-w-[1280px]"><header class="mb-6 flex items-center justify-between"><div class="flex items-center gap-3"><div id="publicLogo" class="grid h-12 w-12 place-items-center rounded-full bg-sage text-white"><i data-lucide="mosque"></i></div><div><p class="text-xs text-muted">DKM</p><h1 id="publicName" class="text-lg font-semibold md:text-xl">Masjid Baitut Taqwa</h1><p id="publicAddress" class="text-xs text-muted"></p></div></div><button class="btn-primary flex items-center gap-2" onclick="Auth.openLogin()"><i data-lucide="log-in" class="h-4"></i><span class="hidden sm:inline">Login Pengurus/Admin</span></button></header><div id="homeContent"></div></div>`;
    if (!supabaseClient) {
      document.getElementById('homeContent').innerHTML=`<section class="card p-6"><p class="font-semibold">Konfigurasi Supabase diperlukan</p><p class="mt-2 text-sm text-muted">Isi SUPABASE_URL dan SUPABASE_ANON_KEY pada <code>js/supabase-client.js</code>, lalu jalankan <code>database.sql</code> di SQL Editor Supabase.</p></section>`;
      this.showLoading(false);
      if(window.lucide)lucide.createIcons();
      return;
    }
    try{
      const [{data:profile},{data:all}]=await Promise.all([
        supabaseClient.from('profil_masjid').select('*').limit(1).maybeSingle(),
        supabaseClient.from('jamaah').select('kelompok_umur,status_pernikahan,status_nikah')
      ]);
      if(profile.data){ } // retained for compatibility
      const p=profile||{};
      document.getElementById('publicName').textContent=p.nama_masjid||'Masjid Baitut Taqwa';
      document.getElementById('publicAddress').textContent=p.alamat||'';
      if(p.logo_url) document.getElementById('publicLogo').innerHTML=`<img src="${p.logo_url}" class="h-full w-full rounded-full object-cover">`;
      const rows=all||[];
      const count=k=>rows.filter(r=>r.kelompok_umur===k).length;
      const statusCount=k=>rows.filter(r=>r.status_pernikahan===k).length;
      const cards=[
        ['PAUD',count('PAUD')],['SD',count('SD')],['SMP',count('SMP')],['SMA',count('SMA')],
        ['Pra Nikah',count('Pra Nikah')],['Menikah',statusCount('Kawin')],['Janda',statusCount('Janda')],['Duda',statusCount('Duda')]
      ];
      document.getElementById('homeContent').innerHTML=`
      <section class="card relative mb-5 min-h-[280px] overflow-hidden p-6 md:p-8">
        ${p.foto_masjid_url?`<img src="${p.foto_masjid_url}" class="absolute inset-0 h-full w-full object-cover"><div class="absolute inset-0 bg-charcoal/35"></div>`:''}
        <div class="${p.foto_masjid_url?'relative text-white':'relative'} max-w-xl">
          <p class="text-xs uppercase tracking-[.22em] ${p.foto_masjid_url?'text-white/80':'text-sage'}">Profil Masjid</p>
          <h2 class="mt-3 text-3xl font-light md:text-5xl">${p.nama_masjid||'Masjid Baitut Taqwa'}</h2>
          <p class="mt-4 max-w-md text-sm ${p.foto_masjid_url?'text-white/85':'text-muted'}">${p.alamat||'Pusat kegiatan ibadah dan pembinaan umat.'}</p>
        </div>
      </section>
      <section class="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">${cards.map(([n,v])=>`<div class="card p-4"><p class="text-xs text-muted">${n}</p><p class="mt-2 text-2xl font-semibold">${v}</p></div>`).join('')}</section>
      <section class="card flex items-center justify-between p-5 md:p-6"><div><p class="text-sm text-muted">Total Jamaah Terdaftar</p><p class="mt-1 text-4xl font-light">${rows.length}</p></div><div class="rounded-full bg-[#E4E8DF] p-4 text-sage"><i data-lucide="users"></i></div></section>`;
    }catch(err){ document.getElementById('homeContent').innerHTML=`<div class="card p-6 text-sm text-red-700">Gagal memuat data. Pastikan Supabase sudah dikonfigurasi.</div>`; }
    finally{this.showLoading(false);if(window.lucide)lucide.createIcons();}
  }
};

document.addEventListener('DOMContentLoaded',()=>{
  const hash=location.hash.replace('#','');
  App.renderShell();
  App.navigate(App.menu.some(m=>m.id===hash)?hash:'home');
  window.addEventListener('hashchange',()=>App.navigate(location.hash.replace('#','')||'home'));
});
