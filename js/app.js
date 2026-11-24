window.DKM = {
  route: 'home',
  role: null,
  user: null,
  toastTimer: null,
  dateRefreshTimer: null,
  menu: [
    { id: 'home', title: 'Beranda', icon: 'house' },
    { id: 'presensi', title: 'Presensi', icon: 'clipboard-check', auth: true },
    { id: 'materi', title: 'Materi', icon: 'book-open', auth: true },
    { id: 'jamaah', title: 'Database Jamaah', icon: 'users', auth: true },
    { id: 'program', title: 'Program Masjid', icon: 'calendar-days', auth: true },
    { id: 'akun', title: 'Kelola Akun', icon: 'contact-round', auth: true, admin: true }
  ],
  escape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);
  },
  get isAdmin() { return this.role === 'admin'; },
  get signedIn() { return Boolean(this.user); },
  ready() {
    if (!window.supabaseClient) throw new Error('Supabase belum dikonfigurasi. Isi URL dan anon key di js/supabase-client.js.');
    return window.supabaseClient;
  },
  toast(message, type = 'info') {
    const node = document.getElementById('toast');
    node.textContent = message;
    node.dataset.type = type;
    node.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
  },
  loading(show, text = 'Memuat...') {
    const node = document.getElementById('loading');
    document.getElementById('loadingText').textContent = text;
    node.hidden = !show;
  },
  async run(task, label = 'Memuat...') {
    this.loading(true, label);
    try { return await task(); }
    catch (error) {
      console.error(error);
      this.toast(error.message || 'Terjadi kesalahan saat menghubungi Supabase.', 'error');
      throw error;
    } finally { this.loading(false); }
  },
  formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!value) return '-';
    const date = new Date(`${value.slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', options);
  },
  today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  },
  monthValue(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  },
  monthBounds(value) {
    const [year, month] = value.split('-').map(Number);
    const last = new Date(year, month, 0);
    return { from: `${value}-01`, to: `${year}-${String(month).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}` };
  },
  scheduleDateRefresh() {
    clearTimeout(this.dateRefreshTimer);
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 1, 0, 1);
    this.dateRefreshTimer = setTimeout(() => {
      if (this.route === 'jamaah') Jamaah.refreshAgeClassification();
      else if (this.route === 'home') Home.refresh(document.getElementById('app'));
      else if (this.route === 'presensi') this.renderRoute();
      this.scheduleDateRefresh();
    }, Math.max(1000, nextYear.getTime() - now.getTime()));
  },
  icon(name, classes = '') { return `<i data-lucide="${name}" class="${classes}" aria-hidden="true"></i>`; },
  refreshIcons() { if (window.lucide) window.lucide.createIcons(); },
  setRoute(route) {
    const item = this.menu.find(entry => entry.id === route);
    if (!item) return;
    if (item.auth && !this.signedIn) {
      const needsHome = this.route !== 'home' || !document.getElementById('homeBody');
      this.route = 'home';
      history.replaceState(null, '', '#home');
      if (needsHome) {
        this.renderNavigation();
        this.renderRoute();
      }
      Auth.openLogin();
      return;
    }
    if (item.admin && !this.isAdmin) { this.navigate('home'); return; }
    if (this.route === 'home' && route !== 'home') Home.stopRealtime();
    this.route = route;
    history.replaceState(null, '', `#${route}`);
    this.renderNavigation();
    this.renderRoute();
  },
  navigate(route) {
    this.setRoute(route);
  },
  renderNavigation() {
    const items = this.menu.filter(item => (!item.auth || this.signedIn) && (!item.admin || this.isAdmin));
    const navItems = items.map(item => `<button class="nav-item ${this.route === item.id ? 'active' : ''}" data-route="${item.id}">
      ${this.icon(item.icon)}<span>${item.title}</span></button>`).join('');
    document.getElementById('sidebar').innerHTML = `
      <div class="brand"><img class="brand-mark" src="logo.png" alt="Logo Masjid Baitu Taqwa"><div><div class="text-xs text-muted">DKM</div><div class="font-semibold">Baitu Taqwa</div></div></div>
      <nav class="nav-list" aria-label="Navigasi utama">${navItems}</nav>
      <div class="sidebar-foot">
        <p class="truncate px-3 pb-2 text-xs text-muted">${this.signedIn ? `${this.escape(this.user.nama_lengkap)} · ${this.user.role}` : 'Informasi publik'}</p>
        ${this.signedIn ? '<button class="nav-item w-full" data-action="logout"><i data-lucide="log-out"></i><span>Keluar</span></button>' : '<button class="nav-item w-full" data-action="open-login"><i data-lucide="log-in"></i><span>Login Pengurus</span></button>'}
      </div>`;
    const bottomNav = document.getElementById('bottomNav');
    bottomNav.classList.toggle('has-admin-nav', items.some(item => item.id === 'akun'));
    bottomNav.innerHTML = items.map(item =>
      `<button class="${this.route === item.id ? 'active' : ''}" data-route="${item.id}">${this.icon(item.icon)}<span>${item.id === 'jamaah' ? 'Jamaah' : item.title}</span></button>`
    ).join('');
    this.refreshIcons();
  },
  async renderRoute() {
    const root = document.getElementById('app');
    try {
      if (this.route === 'home') await Home.render(root);
      else if (this.route === 'jamaah') await Jamaah.render(root);
      else if (this.route === 'presensi') await Presensi.render(root);
      else if (this.route === 'materi') await Materi.render(root);
      else if (this.route === 'program') await Program.render(root);
      else if (this.route === 'akun') await Akun.render(root);
    } catch (error) {
      root.innerHTML = `<section class="card card-pad"><h2 class="font-semibold">Halaman gagal dimuat</h2><p class="mt-2 text-sm text-muted">${this.escape(error.message)}</p></section>`;
    }
    this.refreshIcons();
  },
  async start() {
    document.addEventListener('click', event => {
      const routeButton = event.target.closest('[data-route]');
      if (routeButton) { this.navigate(routeButton.dataset.route); return; }
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action === 'open-login') Auth.openLogin();
      if (action === 'close-login') Auth.closeLogin();
      if (action === 'logout') Auth.logout();
    });
    document.getElementById('loginForm').addEventListener('submit', event => Auth.submit(event));
    try { await Auth.init(); }
    catch (error) {
      console.error(error);
      this.toast(`Sesi tidak dapat dimuat: ${error.message}`,'error');
      this.renderNavigation();
    }
    const initial = location.hash.slice(1);
    this.navigate(this.menu.some(item => item.id === initial) ? initial : 'home');
    this.scheduleDateRefresh();
    window.addEventListener('hashchange', () => {
      const hash = location.hash.slice(1);
      if (hash && hash !== this.route) this.navigate(hash);
    });
  }
};

window.Home = {
  channel: null,
  refreshRequest: 0,
  heroMarkup(mosque = {}) {
    const name = mosque.nama_masjid || 'Masjid Baitu Taqwa';
    const address = mosque.alamat || 'Ciracas, Jakarta Timur';
    return `<section class="card hero">
      <img class="hero-photo" src="masjid_home.jpeg" alt="Tampak depan Masjid Baitu Taqwa">
      <div class="hero-overlay"></div>
      <div class="hero-copy"><p class="eyebrow">Ruang ibadah dan kebersamaan</p>
        <h2 id="heroName" class="text-3xl font-light sm:text-5xl">${DKM.escape(name)}</h2>
        <p id="heroAddress" class="mt-3 max-w-lg text-sm leading-6 text-white/90">${DKM.escape(address)}</p>
      </div>
    </section>`;
  },
  async render(root) {
    this.stopRealtime();
    const publicHome = !DKM.signedIn;
    root.innerHTML = `<div class="page-wrap">
      <header class="mb-6 flex items-center justify-between gap-4">
        <div class="flex items-center gap-3"><img id="homeLogo" class="brand-mark" src="logo.png" alt="Logo Masjid Baitu Taqwa">
          <div><p class="text-xs text-muted">DKM MASJID</p><h1 id="homeName" class="text-lg font-semibold">Baitu Taqwa</h1><p id="homeAddress" class="text-xs text-muted"></p></div>
        </div>
        ${publicHome
          ? '<button class="btn-primary" data-action="open-login">Login Pengurus/Admin</button>'
          : `<button class="btn-secondary" data-action="logout">${DKM.icon('log-out')}Keluar</button>`}
      </header>
      <div id="homeBody">${this.heroMarkup()}<div id="homeStats"></div></div>
      <p id="homeStatsError" class="card card-pad mt-5 text-sm text-muted" role="alert" hidden></p>
    </div>`;
    const statsHost = document.getElementById('homeStats');
    if (!window.supabaseClient) {
      statsHost.innerHTML = `<section class="card card-pad mt-5"><h2 class="font-semibold">Hubungkan Supabase</h2>
        <p class="mt-2 text-sm text-muted">Isi <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> pada <code>js/supabase-client.js</code>, lalu jalankan <code>database.sql</code> di SQL Editor.</p></section>`;
      return;
    }
    await this.refresh(root);
    if (publicHome && window.supabaseClient.channel && DKM.route === 'home') {
      this.channel = window.supabaseClient.channel('public-home')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'statistik_jamaah_public' }, () => this.refresh(root))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profil_masjid' }, () => this.refresh(root))
        .subscribe();
    }
  },
  async refresh(root) {
    const requestId = ++this.refreshRequest;
    try {
      const client = DKM.ready();
      const [{ data: profile, error: profileError }, { data: stats, error: statsError }] = await Promise.all([
        client.from('profil_masjid').select('nama_masjid,alamat').limit(1).maybeSingle(),
        client.rpc('public_home_stats')
      ]);
      if (profileError) throw profileError;
      if (statsError) throw statsError;
      if (requestId !== this.refreshRequest || DKM.route !== 'home') return;
      const mosque = profile || { nama_masjid: 'Masjid Baitu Taqwa', alamat: 'Ciracas, Jakarta Timur' };
      root.querySelector('#homeName').textContent = mosque.nama_masjid;
      root.querySelector('#homeAddress').textContent = mosque.alamat || '';
      root.querySelector('#heroName').textContent = mosque.nama_masjid || 'Masjid Baitu Taqwa';
      root.querySelector('#heroAddress').textContent = mosque.alamat || 'Ciracas, Jakarta Timur';
      const age = stats?.usia || {}, status = stats?.status || {};
      const mappings = [
        ['usia-dini', 'USIA DINI (0-6)', age['Usia Dini (0-6 Tahun)'] || 0],
        ['caberawit', 'CABERAWIT (7-12)', age['Caberawit (7-12 Tahun)'] || 0],
        ['smp', 'SMP (13-15)', age['SMP-Pra Remaja (13-15 Tahun)'] || 0],
        ['sma', 'SMA (16-18)', age['SMA-Remaja (16-18 Tahun)'] || 0],
        ['pra-nikah', 'PRA NIKAH (19-30)', age['PN-Pra Nikah (19-30 Tahun belum menikah)'] || 0],
        ['pn-dewasa', 'PN-DEWASA (>30)', age['PN-Dewasa (Diatas 30 Tahun yang belum menikah)'] || 0],
        ['menikah', 'MENIKAH', (status.Kawin || 0) + (status.Menikah || 0)],
        ['janda', 'JANDA', status.Janda || 0],
        ['duda', 'DUDA', status.Duda || 0]
      ];
      const statsHost = root.querySelector('#homeStats');
      if (!statsHost.querySelector('[data-home-stat]')) {
        statsHost.innerHTML = `
          <section class="my-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">${mappings.map(([key, name]) => `
            <article class="card stat-card"><p class="stat-label">${DKM.escape(name)}</p><p class="stat-value" data-home-stat="${key}"></p></article>`).join('')}</section>
          <section class="card stat-card flex items-center justify-between"><div><p class="stat-label">Total Jamaah Terdaftar</p><p class="stat-value" data-home-stat="total"></p></div><div class="grid h-12 w-12 place-items-center rounded-full bg-[#E4E8DF] text-sage">${DKM.icon('users')}</div></section>`;
      }
      for (const [key, , count] of mappings) {
        statsHost.querySelector(`[data-home-stat="${key}"]`).textContent = Number(count).toLocaleString('id-ID');
      }
      statsHost.querySelector('[data-home-stat="total"]').textContent = Number(stats?.total || 0).toLocaleString('id-ID');
      const errorNode = root.querySelector('#homeStatsError');
      errorNode.hidden = true;
    } catch (error) {
      if (requestId !== this.refreshRequest || DKM.route !== 'home') return;
      console.error(error);
      const errorNode = root.querySelector('#homeStatsError');
      errorNode.textContent = `Data belum tersedia. ${error.message || 'Periksa konfigurasi Supabase dan jalankan database.sql.'}`;
      errorNode.hidden = false;
    }
  },
  stopRealtime() {
    this.refreshRequest++;
    if (this.channel && window.supabaseClient) {
      window.supabaseClient.removeChannel(this.channel);
      this.channel = null;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => DKM.start());
