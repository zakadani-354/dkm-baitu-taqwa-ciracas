window.Program = {
  rows: [],
  view: 'month',
  month: new Date(new Date().getFullYear(),new Date().getMonth(),1),
  async render(root) {
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Agenda Masjid</p><h1 class="text-3xl font-semibold">Program Masjid</h1></div>
        ${DKM.isAdmin ? `<button class="btn-primary" data-program-action="new">${DKM.icon('plus')}Tambah Agenda</button>` : ''}
      </header>
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div class="segmented"><button class="segment active" data-view="month">Bulanan</button><button class="segment" data-view="agenda">Per Tanggal</button></div>
        <div id="calendarControls" class="flex items-center gap-2"><button class="icon-button" data-month="-1" aria-label="Bulan sebelumnya"><i data-lucide="chevron-left"></i></button><strong id="monthTitle"></strong><button class="icon-button" data-month="1" aria-label="Bulan berikutnya"><i data-lucide="chevron-right"></i></button></div>
      </div><div id="programView"></div><dialog id="programDialog" class="modal-dialog"></dialog>
    </div>`;
    const page = root.querySelector('.page-wrap');
    page.addEventListener('click',event => {
      const view = event.target.closest('[data-view]')?.dataset.view;
      if (view) this.setView(view);
      const delta = Number(event.target.closest('[data-month]')?.dataset.month);
      if (delta) this.changeMonth(delta);
      const action = event.target.closest('[data-program-action]');
      if (action?.dataset.programAction === 'new') this.openForm();
      const eventButton = event.target.closest('[data-program-id]');
      if (eventButton) {
        const row = this.rows.find(item => item.id === eventButton.dataset.programId);
        if (row && DKM.isAdmin) this.openForm(row);
      }
      const rowAction = event.target.closest('[data-row-action]');
      if (rowAction) {
        const row = this.rows.find(item => item.id === rowAction.dataset.id);
        if (rowAction.dataset.rowAction === 'edit') this.openForm(row);
        if (rowAction.dataset.rowAction === 'delete') this.remove(row.id);
      }
    });
    await this.load();
  },
  async load() {
    const { data,error } = await DKM.run(
      () => DKM.ready().from('program_masjid').select('*').order('tanggal').order('waktu_mulai'),
      'Memuat agenda masjid...'
    );
    if (error) throw error;
    this.rows = data || [];
    this.draw();
  },
  setView(view) {
    this.view = view;
    document.querySelectorAll('[data-view]').forEach(button => button.classList.toggle('active',button.dataset.view === view));
    document.getElementById('calendarControls').hidden = view === 'agenda';
    this.draw();
  },
  changeMonth(delta) {
    this.month = new Date(this.month.getFullYear(),this.month.getMonth() + delta,1);
    this.draw();
  },
  dateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  },
  draw() {
    const host = document.getElementById('programView');
    if (this.view === 'agenda') {
      host.innerHTML = this.rows.length ? `<div class="grid gap-3">${this.rows.map(row => `<article class="card card-pad flex justify-between gap-3">
        <div><p class="text-xs text-sage">${DKM.formatDate(row.tanggal)}${row.waktu_mulai ? ` · ${DKM.escape(row.waktu_mulai.slice(0,5))}${row.waktu_selesai ? `–${DKM.escape(row.waktu_selesai.slice(0,5))}` : ''}` : ''}</p>
          <h2 class="mt-1 font-semibold">${DKM.escape(row.judul_program)}</h2><p class="mt-1 text-sm text-muted">${DKM.escape(row.penanggung_jawab || '')}</p>
          ${row.keterangan ? `<p class="mt-2 whitespace-pre-line text-sm">${DKM.escape(row.keterangan)}</p>` : ''}</div>
        ${DKM.isAdmin ? `<div class="flex gap-1"><button class="icon-button" data-row-action="edit" data-id="${row.id}" aria-label="Ubah agenda"><i data-lucide="pencil"></i></button><button class="icon-button text-red-700" data-row-action="delete" data-id="${row.id}" aria-label="Hapus agenda"><i data-lucide="trash-2"></i></button></div>` : ''}
      </article>`).join('')}</div>` : '<section class="card empty-state">Belum ada agenda.</section>';
    } else {
      const year = this.month.getFullYear(), monthIndex = this.month.getMonth();
      const first = new Date(year,monthIndex,1), start = new Date(year,monthIndex,1-first.getDay());
      document.getElementById('monthTitle').textContent = this.month.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
      const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(day => `<div class="calendar-head">${day}</div>`);
      for (let i=0;i<42;i++) {
        const date = new Date(start); date.setDate(start.getDate()+i);
        const key = this.dateKey(date), dayEvents = this.rows.filter(row => row.tanggal === key);
        days.push(`<div class="calendar-day ${date.getMonth() !== monthIndex ? 'opacity-50' : ''}">
          <span class="text-xs ${key === DKM.today() ? 'grid h-6 w-6 place-items-center rounded-full bg-sage text-white' : ''}">${date.getDate()}</span>
          ${dayEvents.map(row => `<button class="event-chip" data-program-id="${row.id}" title="${DKM.escape(row.judul_program)}">${DKM.escape(row.judul_program)}</button>`).join('')}
        </div>`);
      }
      host.innerHTML = `<section class="card calendar-scroll"><div class="calendar-grid">${days.join('')}</div></section>`;
    }
    DKM.refreshIcons();
  },
  openForm(row = {}) {
    if (!DKM.isAdmin) return;
    const dialog = document.getElementById('programDialog');
    dialog.innerHTML = `<form id="programForm" class="modal-card">
      <button type="button" class="icon-button modal-close" data-close aria-label="Tutup"><i data-lucide="x"></i></button>
      <h2 class="mb-5 text-xl font-semibold">${row.id ? 'Ubah Agenda' : 'Tambah Agenda'}</h2>
      <div class="form-grid">
        <label class="field-label span-2">Judul Program<input class="input mt-1" name="judul_program" required value="${DKM.escape(row.judul_program)}"></label>
        <label class="field-label">Tanggal<input class="input mt-1" name="tanggal" type="date" required value="${DKM.escape(row.tanggal || DKM.today())}"></label>
        <label class="field-label">Penanggung Jawab<input class="input mt-1" name="penanggung_jawab" value="${DKM.escape(row.penanggung_jawab)}"></label>
        <label class="field-label">Jam Mulai<input class="input mt-1" name="waktu_mulai" type="time" value="${DKM.escape(row.waktu_mulai?.slice(0,5))}"></label>
        <label class="field-label">Jam Selesai<input class="input mt-1" name="waktu_selesai" type="time" value="${DKM.escape(row.waktu_selesai?.slice(0,5))}"></label>
        <label class="field-label span-2">Keterangan<textarea class="textarea mt-1" name="keterangan" rows="4">${DKM.escape(row.keterangan)}</textarea></label>
      </div>
      <div class="mt-5 flex justify-end gap-2"><button class="btn-secondary" type="button" data-close>Batal</button><button class="btn-primary">Simpan</button></div>
    </form>`;
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => dialog.close()));
    dialog.querySelector('form').addEventListener('submit',event => { event.preventDefault(); this.save(new FormData(event.currentTarget),row.id); });
    dialog.showModal();
    DKM.refreshIcons();
  },
  async save(data,id) {
    const start = data.get('waktu_mulai') || null, end = data.get('waktu_selesai') || null;
    if (start && end && end < start) { DKM.toast('Jam selesai harus setelah jam mulai.','error'); return; }
    const payload = {
      judul_program:String(data.get('judul_program')).trim(),tanggal:data.get('tanggal'),
      waktu_mulai:start,waktu_selesai:end,
      penanggung_jawab:String(data.get('penanggung_jawab')).trim() || null,
      keterangan:String(data.get('keterangan')).trim() || null
    };
    const query = id ? DKM.ready().from('program_masjid').update(payload).eq('id',id) : DKM.ready().from('program_masjid').insert(payload);
    const { error } = await DKM.run(() => query,'Menyimpan agenda...');
    if (error) throw error;
    document.getElementById('programDialog').close();
    DKM.toast(id ? 'Agenda diperbarui.' : 'Agenda tersimpan.');
    await this.load();
  },
  async remove(id) {
    const row = this.rows.find(item => item.id === id);
    if (!row || !confirm(`Hapus agenda "${row.judul_program}"?`)) return;
    const { error } = await DKM.run(() => DKM.ready().from('program_masjid').delete().eq('id',id),'Menghapus agenda...');
    if (error) throw error;
    DKM.toast('Agenda dihapus.');
    await this.load();
  }
};
