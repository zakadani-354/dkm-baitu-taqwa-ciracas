window.Program = {
  rows: [],
  view: 'month',
  sharing: false,
  month: new Date(new Date().getFullYear(),new Date().getMonth(),1),
  async render(root) {
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Agenda Masjid</p><h1 class="text-3xl font-semibold">Program Masjid</h1></div>
        <div class="flex flex-wrap gap-2"><button class="btn-secondary" data-program-action="share">${DKM.icon('share-2')}Share</button>
        ${DKM.isAdmin ? `<button class="btn-primary" data-program-action="new">${DKM.icon('plus')}Tambah Agenda</button>` : ''}</div>
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
      if (action?.dataset.programAction === 'share') this.openShareDialog();
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
  openShareDialog() {
    const today = new Date();
    const weekStart = new Date(today.getFullYear(),today.getMonth(),today.getDate());
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const dialog = document.getElementById('programDialog');
    dialog.innerHTML = `<form id="programShareForm" class="modal-card">
      <button type="button" class="icon-button modal-close" data-close aria-label="Tutup"><i data-lucide="x"></i></button>
      <h2 class="mb-2 text-xl font-semibold">Bagikan Agenda</h2>
      <p class="mb-5 text-sm text-muted">Pilih periode agenda yang akan dibagikan melalui WhatsApp.</p>
      <div class="form-grid">
        <label class="field-label">Dari tanggal<input class="input mt-1" name="tanggal_mulai" type="date" required value="${this.dateKey(weekStart)}"></label>
        <label class="field-label">Sampai tanggal<input class="input mt-1" name="tanggal_selesai" type="date" required value="${this.dateKey(weekEnd)}"></label>
      </div>
      <div class="mt-5 flex justify-end gap-2"><button class="btn-secondary" type="button" data-close>Batal</button><button id="programShareSubmit" class="btn-primary" type="submit">${DKM.icon('share-2')}Buat &amp; Bagikan Flyer</button></div>
    </form>`;
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => dialog.close()));
    dialog.querySelector('#programShareForm').addEventListener('submit',event => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      this.sharePeriod(String(formData.get('tanggal_mulai')),String(formData.get('tanggal_selesai')));
    });
    dialog.showModal();
    DKM.refreshIcons();
  },
  parseFlyerDetails(value) {
    const details = { waktu: '', tempat: '', materi: '', peserta: '', badge: '', catatan: [] };
    let activeField = '';
    String(value || '').split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim().replace(/^\*+\s*/,'').replace(/\*+$/,'').trim();
      if (!line) return;
      const match = line.match(/^(waktu|tempat|lokasi|materi|peserta|badge)\s*:\s*(.*)$/i);
      if (!match) {
        if (/online/i.test(line) && /\bSDC\b/i.test(line)) {
          details.badge = line.replace(/\*/g,'').trim();
          activeField = '';
          return;
        }
        if (activeField && ['materi','peserta'].includes(activeField)) {
          details[activeField] += `\n${line.replace(/\*/g,'').trim()}`;
          return;
        }
        details.catatan.push(line.replace(/\*/g,'').trim());
        activeField = '';
        return;
      }
      const field = match[1].toLowerCase();
      const key = field === 'lokasi' ? 'tempat' : field;
      details[key] = match[2].replace(/\*/g,'').trim();
      activeField = key;
    });
    return details;
  },
  flyerIcon(name) {
    const paths = {
      clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"></path><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8"></path>',
      pin: '<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="10" cy="7" r="4"></circle><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>',
      person: '<circle cx="12" cy="8" r="4"></circle><path d="M5 21a7 7 0 0 1 14 0"></path>',
      info: '<circle cx="12" cy="12" r="9"></circle><path d="M12 11v5M12 8h.01"></path>'
    };
    return `<svg class="flyer-detail-icon" viewBox="0 0 24 24" fill="none" stroke="#2E3B25" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
  },
  flyerEvents(rows) {
    return rows.map(row => {
      const date = new Date(`${row.tanggal}T00:00:00`);
      const details = this.parseFlyerDetails(row.keterangan);
      const time = row.waktu_mulai
        ? `${row.waktu_mulai.slice(0,5).replace(':','.')} ${row.waktu_selesai ? `– ${row.waktu_selesai.slice(0,5).replace(':','.')} ` : ''}WIB`
        : details.waktu;
      const lines = [];
      if (time) lines.push([this.flyerIcon('clock'),`Waktu: ${time}`]);
      if (details.materi) lines.push([this.flyerIcon('book'),`Materi: ${details.materi}`]);
      if (details.tempat) lines.push([this.flyerIcon('pin'),`Tempat: ${details.tempat}`]);
      if (details.peserta) lines.push([this.flyerIcon('users'),`Peserta: ${details.peserta}`]);
      if (row.penanggung_jawab) lines.push([this.flyerIcon('person'),`Penanggung jawab: ${row.penanggung_jawab}`]);
      if (details.catatan.length) lines.push([this.flyerIcon('info'),details.catatan.join(' ')]);
      return `<article class="flyer-event">
        <div class="flyer-date">
          <strong>${date.getDate()}</strong>
          <span>${date.toLocaleDateString('id-ID',{weekday:'long'}).toUpperCase()}</span>
          <span class="flyer-month">${date.toLocaleDateString('id-ID',{month:'long',year:'numeric'}).toUpperCase()}</span>
        </div>
        <div class="flyer-event-divider"><i></i></div>
        <div class="flyer-event-content">
          <h2>${DKM.escape(row.judul_program)}</h2>
          ${details.badge ? `<span class="flyer-badge">${DKM.escape(details.badge)}</span>` : ''}
          ${lines.length ? `<div class="flyer-details">${lines.map(([icon,text]) => `<div class="flyer-detail">${icon}<span>${DKM.escape(text)}</span></div>`).join('')}</div>` : ''}
        </div>
      </article>`;
    }).join('');
  },
  flyerMarkup({ title,period,events }) {
    return `<article id="programFlyer" class="program-flyer">
      <svg class="flyer-corner" viewBox="0 0 360 340" aria-hidden="true"><path d="M0 0h360C296 49 292 130 229 183 167 236 77 259 0 340z" fill="#1F2A1C"/><path d="M0 0h248C194 59 176 122 121 166 81 198 38 214 0 230z" fill="#2E3B25"/></svg>
      <svg class="flyer-mosque" viewBox="0 0 1080 330" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><g fill="#C5B99F"><path d="M0 240h1080v90H0zM95 165h110v165H95zM875 165h110v165H875z"/><path d="M72 165h156l-78-90zM852 165h156l-78-90z"/><path d="M320 242c0-128 99-210 220-210s220 82 220 210z"/><path d="M505 35h70V0h-70zM532 0l8-25 8 25zM252 245c0-64 53-112 118-112s118 48 118 112zM592 245c0-64 53-112 118-112s118 48 118 112z"/><path d="M340 132h60v-50h-60zM680 132h60v-50h-60z"/></g></svg>
      <svg class="flyer-waves" viewBox="0 0 1080 220" preserveAspectRatio="none" aria-hidden="true"><path d="M0 83c190 94 353 56 535 29 194-29 362-9 545 55v53H0z" fill="#8B1E1E"/><path d="M0 137c184-68 373-44 541-6 202 47 363 39 539-21v110H0z" fill="#2E3B25"/></svg>
      <div class="flyer-content">
        <header class="flyer-header">
          <svg class="flyer-lantern flyer-lantern-left" viewBox="0 0 80 160" aria-hidden="true"><path d="M40 0v23" stroke="#B5945B" stroke-width="3"/><path d="M29 22h22v11H29zM23 39l17-8 17 8-5 8v44l-12 17-12-17V47z" fill="none" stroke="#B5945B" stroke-width="3"/><path d="M29 52h22v28H29zM40 104v19m-10 0h20M40 123l-7 12h14z" fill="#B5945B" opacity=".8"/><circle cx="40" cy="65" r="8" fill="#B5945B" opacity=".5"/></svg>
          <svg class="flyer-lantern flyer-lantern-right" viewBox="0 0 80 160" aria-hidden="true"><path d="M40 0v23" stroke="#B5945B" stroke-width="3"/><path d="M29 22h22v11H29zM23 39l17-8 17 8-5 8v44l-12 17-12-17V47z" fill="none" stroke="#B5945B" stroke-width="3"/><path d="M29 52h22v28H29zM40 104v19m-10 0h20M40 123l-7 12h14z" fill="#B5945B" opacity=".8"/><circle cx="40" cy="65" r="8" fill="#B5945B" opacity=".5"/></svg>
          <p class="flyer-kicker">DKM MASJID BAITU TAQWA</p>
          <h1>${DKM.escape(title)}</h1>
          <p class="flyer-period">${DKM.escape(period)}</p>
          <span class="flyer-header-rule"></span>
        </header>
        <section class="flyer-events">${this.flyerEvents(events)}</section>
        <footer class="flyer-footer">Semoga Alloh paring lancar barokah <span dir="rtl">الحمد لله</span></footer>
      </div>
    </article>`;
  },
  downloadFlyer(blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jadwal-kegiatan.png';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  },
  async sharePeriod(start,end) {
    if (this.sharing) return;
    if (!start || !end || start > end) {
      DKM.toast('Rentang tanggal tidak valid.','error');
      return;
    }
    const events = this.rows.filter(row => row.tanggal >= start && row.tanggal <= end)
      .sort((a,b) => a.tanggal.localeCompare(b.tanggal) || (a.waktu_mulai || '').localeCompare(b.waktu_mulai || ''));
    if (!events.length) {
      DKM.toast('Tidak ada agenda pada periode tanggal tersebut.','info');
      return;
    }
    const button = document.getElementById('programShareSubmit');
    const originalButtonHTML = button.innerHTML;
    let flyerRoot;
    this.sharing = true;
    button.disabled = true;
    button.textContent = 'Membuat gambar...';
    try {
      const flyerTitle = 'JADWAL KEGIATAN MASJID BAITU TAQWA';
      const period = `${DKM.formatDate(start,{day:'numeric',month:'long',year:'numeric'})} – ${DKM.formatDate(end,{day:'numeric',month:'long',year:'numeric'})}`;
      flyerRoot = document.createElement('div');
      flyerRoot.className = 'program-flyer-offscreen';
      flyerRoot.setAttribute('aria-hidden','true');
      flyerRoot.innerHTML = this.flyerMarkup({ title: flyerTitle,period,events });
      document.body.appendChild(flyerRoot);
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = await html2canvas(flyerRoot.querySelector('#programFlyer'),{scale:2,backgroundColor:'#F3EFE6'});
      const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
      if (!blob) throw new Error('Browser gagal menyiapkan file PNG.');
      const file = typeof File === 'undefined' ? null : new File([blob],'jadwal-kegiatan.png',{type:'image/png'});
      let shared = false;
      if (file && navigator.share) {
        try {
          if (!navigator.canShare || navigator.canShare({files:[file]})) {
            await navigator.share({files:[file],title:flyerTitle,text:`${flyerTitle} · ${period}`});
            shared = true;
          }
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.error('Web Share gagal, mengunduh gambar sebagai gantinya:',error);
        }
      }
      if (!shared) {
        this.downloadFlyer(blob);
        DKM.toast('Flyer diunduh sebagai jadwal-kegiatan.png.');
      } else {
        DKM.toast('Flyer kegiatan berhasil dibagikan.');
      }
      document.getElementById('programDialog').close();
    } catch (error) {
      console.error('Gagal membuat flyer agenda:',error);
      DKM.toast(`Gagal membuat gambar agenda: ${error.message}`,'error');
    } finally {
      flyerRoot?.remove();
      this.sharing = false;
      if (button.isConnected) {
        button.disabled = false;
        button.innerHTML = originalButtonHTML;
        DKM.refreshIcons();
      }
    }
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
