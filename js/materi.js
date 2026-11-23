window.Materi = {
  rows: [],
  tab: 'input',
  async render(root) {
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Jurnal Dakwah</p><h1 class="text-3xl font-semibold">Materi Pengajian</h1></div></header>
      <div class="segmented mb-5"><button class="segment ${this.tab === 'input' ? 'active' : ''}" data-m-tab="input">Input Materi</button><button class="segment ${this.tab === 'history' ? 'active' : ''}" data-m-tab="history">Riwayat Materi</button></div>
      <div id="materiView"></div>
    </div>`;
    root.querySelectorAll('[data-m-tab]').forEach(button => button.addEventListener('click',() => this.setTab(button.dataset.mTab)));
    await this.showTab();
  },
  async setTab(tab) {
    this.tab = tab;
    document.querySelectorAll('[data-m-tab]').forEach(button => button.classList.toggle('active',button.dataset.mTab === tab));
    await this.showTab();
  },
  async showTab() {
    if (this.tab === 'input') this.renderForm();
    else await this.renderHistory();
  },
  typeOptions(selected = '') {
    return ['Pengajian Umum','Pengajian Ibu-Ibu','Pembinaan Generus'].map(value => `<option ${selected === value ? 'selected' : ''}>${value}</option>`).join('');
  },
  renderForm(row = {}) {
    const host = document.getElementById('materiView');
    host.innerHTML = `<section class="card card-pad max-w-3xl"><form id="materiForm">
      <h2 class="mb-5 text-lg font-semibold">${row.id ? 'Ubah Materi' : 'Catat Materi Baru'}</h2>
      <div class="form-grid">
        <label class="field-label">Tanggal<input class="input mt-1" name="tanggal" type="date" required value="${DKM.escape(row.tanggal || DKM.today())}"></label>
        <label class="field-label">Jenis Pengajian<select class="select mt-1" name="jenis_pengajian">${this.typeOptions(row.jenis_pengajian)}</select></label>
        <label id="materiClassWrap" class="field-label" ${row.jenis_pengajian === 'Pembinaan Generus' ? '' : 'hidden'}>Kelas Generus<select class="select mt-1" name="kelas_generus">${['SMP','SMA','PN'].map(value => `<option ${row.kelas_generus === value ? 'selected' : ''}>${value}</option>`).join('')}</select></label>
        <label class="field-label">Judul/Kitab Materi<input class="input mt-1" name="judul_materi" required maxlength="200" value="${DKM.escape(row.judul_materi)}"></label>
        <label class="field-label">Pemateri/Ustadz<input class="input mt-1" name="pemateri" value="${DKM.escape(row.pemateri)}"></label>
        <label class="field-label span-2">Ringkasan Isi Materi<textarea class="textarea mt-1" name="ringkasan" rows="5">${DKM.escape(row.ringkasan)}</textarea></label>
      </div>
      <div class="mt-5 flex justify-end gap-2">${row.id ? '<button class="btn-secondary" type="button" id="cancelEdit">Batal</button>' : ''}
        ${DKM.isAdmin ? '<button class="btn-primary">Simpan Materi</button>' : '<p class="text-sm text-muted">Mode lihat saja.</p>'}</div>
    </form></section>`;
    const form = document.getElementById('materiForm');
    form.elements.jenis_pengajian.addEventListener('change',() => {
      document.getElementById('materiClassWrap').hidden = form.elements.jenis_pengajian.value !== 'Pembinaan Generus';
    });
    document.getElementById('cancelEdit')?.addEventListener('click',() => this.renderForm());
    if (DKM.isAdmin) form.addEventListener('submit',event => { event.preventDefault(); this.save(new FormData(form),row.id); });
  },
  async save(data,id) {
    const type = data.get('jenis_pengajian');
    const payload = {
      tanggal:data.get('tanggal'), jenis_pengajian:type,
      kelas_generus:type === 'Pembinaan Generus' ? data.get('kelas_generus') : null,
      judul_materi:String(data.get('judul_materi')).trim(),
      pemateri:String(data.get('pemateri')).trim() || null,
      ringkasan:String(data.get('ringkasan')).trim() || null
    };
    const query = id
      ? DKM.ready().from('materi_pengajian').update(payload).eq('id',id)
      : DKM.ready().from('materi_pengajian').insert(payload);
    const { error } = await DKM.run(() => query,'Menyimpan materi...');
    if (error) throw error;
    DKM.toast(id ? 'Materi diperbarui.' : 'Materi tersimpan.');
    await this.setTab('history');
  },
  async renderHistory() {
    document.getElementById('materiView').innerHTML = `<section class="card card-pad mb-4"><div class="grid gap-3 sm:grid-cols-3">
      <label class="field-label">Jenis<select id="materiType" class="select mt-1"><option value="">Semua jenis</option>${this.typeOptions()}</select></label>
      <label class="field-label">Kelas<select id="materiClass" class="select mt-1"><option value="">Semua kelas</option>${['SMP','SMA','PN'].map(value => `<option>${value}</option>`).join('')}</select></label>
      <label class="field-label">Tanggal<input id="materiDate" class="input mt-1" type="date"></label>
    </div></section><div id="materiCards" class="grid gap-4 md:grid-cols-2"></div>`;
    ['materiType','materiClass','materiDate'].forEach(id => document.getElementById(id).addEventListener('change',() => this.loadHistory()));
    await this.loadHistory();
  },
  async loadHistory() {
    let query = DKM.ready().from('materi_pengajian').select('*').order('tanggal',{ascending:false});
    const type = document.getElementById('materiType').value;
    const klass = document.getElementById('materiClass').value;
    const date = document.getElementById('materiDate').value;
    if (type) query = query.eq('jenis_pengajian',type);
    if (klass) query = query.eq('kelas_generus',klass);
    if (date) query = query.eq('tanggal',date);
    const { data,error } = await DKM.run(() => query,'Memuat jurnal materi...');
    if (error) throw error;
    this.rows = data || [];
    document.getElementById('materiCards').innerHTML = this.rows.length ? this.rows.map(row => `<article class="card card-pad">
      <header class="mb-3 flex items-start justify-between gap-3"><div><p class="text-xs text-sage">${DKM.formatDate(row.tanggal)} · ${DKM.escape(row.jenis_pengajian)}${row.kelas_generus ? ` · ${DKM.escape(row.kelas_generus)}` : ''}</p>
        <h2 class="mt-1 text-lg font-semibold">${DKM.escape(row.judul_materi)}</h2></div>
        ${DKM.isAdmin ? `<div class="flex gap-1"><button class="icon-button" data-m-action="edit" data-id="${row.id}" aria-label="Ubah"><i data-lucide="pencil"></i></button><button class="icon-button text-red-700" data-m-action="delete" data-id="${row.id}" aria-label="Hapus"><i data-lucide="trash-2"></i></button></div>` : ''}
      </header><p class="text-sm text-muted">${row.pemateri ? `Pemateri: ${DKM.escape(row.pemateri)}` : 'Pemateri belum dicatat'}</p>
      <p class="mt-3 whitespace-pre-line text-sm leading-6">${DKM.escape(row.ringkasan || 'Belum ada ringkasan.')}</p></article>`).join('') : '<section class="card empty-state md:col-span-2">Belum ada materi sesuai filter.</section>';
    const page = document.querySelector('#app .page-wrap');
    page.onclick = event => {
      const button = event.target.closest('[data-m-action]');
      if (!button) return;
      const row = this.rows.find(item => item.id === button.dataset.id);
      if (button.dataset.mAction === 'edit') { this.tab = 'input'; document.querySelectorAll('[data-m-tab]').forEach(item => item.classList.toggle('active',item.dataset.mTab === 'input')); this.renderForm(row); }
      if (button.dataset.mAction === 'delete') this.remove(row.id);
    };
    DKM.refreshIcons();
  },
  async remove(id) {
    const row = this.rows.find(item => item.id === id);
    if (!row || !confirm(`Hapus materi "${row.judul_materi}"?`)) return;
    const { error } = await DKM.run(() => DKM.ready().from('materi_pengajian').delete().eq('id',id),'Menghapus materi...');
    if (error) throw error;
    DKM.toast('Materi dihapus.');
    await this.loadHistory();
  }
};
