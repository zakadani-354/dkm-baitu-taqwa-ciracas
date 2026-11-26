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
  groupFlyerEventsByTwoDays(rows,start,end) {
    const pages = [];
    const endDate = new Date(`${end}T00:00:00`);
    for (let cursor = new Date(`${start}T00:00:00`); cursor <= endDate; cursor.setDate(cursor.getDate() + 2)) {
      const periodStart = this.dateKey(cursor);
      const periodEndDate = new Date(cursor);
      periodEndDate.setDate(periodEndDate.getDate() + 1);
      if (periodEndDate > endDate) periodEndDate.setTime(endDate.getTime());
      const periodEnd = this.dateKey(periodEndDate);
      const periodEvents = rows.filter(row => row.tanggal >= periodStart && row.tanggal <= periodEnd);
      if (periodEvents.length) pages.push({ start: periodStart, end: periodEnd, events: periodEvents });
    }
    return pages;
  },
  flyerMarkup({ title,period,events }) {
    return `<article id="programFlyer" class="program-flyer">
      <svg class="flyer-top-dome" viewBox="0 0 1080 480" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="flyerGoldBorder" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D4AF37"/><stop offset=".5" stop-color="#F3E5AB"/><stop offset="1" stop-color="#B8860B"/></linearGradient>
          <pattern id="flyerEmeraldPattern" width="120" height="120" patternUnits="userSpaceOnUse">
            <rect width="120" height="120" fill="#163020"/>
            <path d="m60 5 12 33 34-14-15 33 34 3-29 19 24 25-35-7-8 35-17-31-27 21 5-35-35-5 27-22-20-28 34 11zM0 0l60 60L120 0M0 120l60-60 60 60M60 0v120M0 60h120" fill="none" stroke="#C9A656" stroke-opacity=".25" stroke-width="1.5"/>
          </pattern>
          <filter id="flyerDomeShadow" x="-12%" y="-15%" width="124%" height="135%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#09170E" flood-opacity=".45"/></filter>
        </defs>
        <path d="M64 458V300c0-68 29-112 91-145 60-32 126-22 199-50 67-26 102-77 186-100 84 23 119 74 186 100 73 28 139 18 199 50 62 33 91 77 91 145v158z" fill="url(#flyerEmeraldPattern)" stroke="url(#flyerGoldBorder)" stroke-width="12" filter="url(#flyerDomeShadow)"/>
        <path d="M64 458V300c0-68 29-112 91-145 60-32 126-22 199-50 67-26 102-77 186-100 84 23 119 74 186 100 73 28 139 18 199 50 62 33 91 77 91 145v158z" fill="none" stroke="#F3E5AB" stroke-width="3"/>
      </svg>
      <div class="flyer-content">
        <header class="flyer-header">
          <svg class="flyer-lantern flyer-lantern-left" viewBox="0 0 80 160" aria-hidden="true"><path d="M40 0v23" stroke="#B5945B" stroke-width="3"/><path d="M29 22h22v11H29zM23 39l17-8 17 8-5 8v44l-12 17-12-17V47z" fill="none" stroke="#B5945B" stroke-width="3"/><path d="M29 52h22v28H29zM40 104v19m-10 0h20M40 123l-7 12h14z" fill="#B5945B" opacity=".8"/><circle cx="40" cy="65" r="8" fill="#B5945B" opacity=".5"/></svg>
          <svg class="flyer-lantern flyer-lantern-right" viewBox="0 0 80 160" aria-hidden="true"><path d="M40 0v23" stroke="#B5945B" stroke-width="3"/><path d="M29 22h22v11H29zM23 39l17-8 17 8-5 8v44l-12 17-12-17V47z" fill="none" stroke="#B5945B" stroke-width="3"/><path d="M29 52h22v28H29zM40 104v19m-10 0h20M40 123l-7 12h14z" fill="#B5945B" opacity=".8"/><circle cx="40" cy="65" r="8" fill="#B5945B" opacity=".5"/></svg>
          <img class="flyer-logo" src="logo.png" alt="Logo Masjid Baitu Taqwa">
          <p class="flyer-kicker">DKM MASJID BAITU TAQWA</p>
          <h1>${DKM.escape(title)}</h1>
          <p class="flyer-period">${DKM.escape(period)}</p>
          <span class="flyer-header-rule"></span>
        </header>
        <section class="flyer-events">${this.flyerEvents(events)}</section>
        <footer class="flyer-footer" aria-hidden="true">
          <svg class="flyer-footer-ornament" viewBox="0 0 480 150" fill="none" stroke="#B5945B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M240 8v22m0 90v22M68 75h42m260 0h42"/>
            <path d="m240 30 14 29 31-11-11 31 29 14-29 14 11 31-31-11-14 29-14-29-31 11 11-31-29-14 29-14-11-31 31 11z"/>
            <path d="m240 51 9 15 17-3-3 17 15 9-15 9 3 17-17-3-9 15-9-15-17 3 3-17-15-9 15-9-3-17 17 3z"/>
            <circle cx="240" cy="80" r="13"/><circle cx="86" cy="75" r="7"/><circle cx="394" cy="75" r="7"/>
            <path d="M110 75c31 0 36-22 60-22m-60 22c31 0 36 22 60 22m200-22c-31 0-36-22-60-22m60 22c-31 0-36 22-60 22"/>
            <path d="M145 53c-7-17-24-20-35-11 7 17 24 20 35 11Zm0 44c-7 17-24 20-35 11 7-17 24-20 35-11Zm190-44c7-17 24-20 35-11-7 17-24 20-35 11Zm0 44c7 17 24 20 35 11-7-17-24-20-35-11Z"/>
            <path d="m173 53 10 10m124-10-10 10m-124 24 10-10m124 10-10-10"/>
            <circle cx="183" cy="63" r="3" fill="#B5945B"/><circle cx="297" cy="63" r="3" fill="#B5945B"/><circle cx="183" cy="87" r="3" fill="#B5945B"/><circle cx="297" cy="87" r="3" fill="#B5945B"/>
          </svg>
        </footer>
      </div>
    </article>`;
  },
  downloadFlyer(blob,filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
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
    const eventPages = this.groupFlyerEventsByTwoDays(events,start,end);
    const button = document.getElementById('programShareSubmit');
    const originalButtonHTML = button.innerHTML;
    let flyerRoot;
    this.sharing = true;
    button.disabled = true;
    button.textContent = 'Menyiapkan flyer...';
    try {
      const flyerTitle = 'JADWAL KEGIATAN MASJID BAITU TAQWA';
      const period = `${DKM.formatDate(start,{day:'numeric',month:'long',year:'numeric'})} – ${DKM.formatDate(end,{day:'numeric',month:'long',year:'numeric'})}`;
      const images = [];
      for (let index = 0; index < eventPages.length; index++) {
        button.textContent = `Membuat flyer ${index + 1}/${eventPages.length}...`;
        const pagePeriod = `${DKM.formatDate(eventPages[index].start,{day:'numeric',month:'long',year:'numeric'})} – ${DKM.formatDate(eventPages[index].end,{day:'numeric',month:'long',year:'numeric'})}`;
        flyerRoot = document.createElement('div');
        flyerRoot.className = 'program-flyer-offscreen';
        flyerRoot.setAttribute('aria-hidden','true');
        flyerRoot.innerHTML = this.flyerMarkup({ title: flyerTitle,period:pagePeriod,events:eventPages[index].events });
        document.body.appendChild(flyerRoot);
        if (document.fonts?.ready) await document.fonts.ready;
        await flyerRoot.querySelector('.flyer-logo').decode();
        const canvas = await html2canvas(flyerRoot.querySelector('#programFlyer'),{scale:3,backgroundColor:'#F3EFE6'});
        const blob = await new Promise(resolve => canvas.toBlob(resolve,'image/png'));
        if (!blob) throw new Error(`Browser gagal membuat flyer ${index + 1}.`);
        const filename = eventPages.length > 1 ? `jadwal-kegiatan-${index + 1}.png` : 'jadwal-kegiatan.png';
        const file = typeof File === 'undefined' ? null : new File([blob],filename,{type:'image/png'});
        images.push({ blob,file,filename });
        flyerRoot.remove();
        flyerRoot = null;
      }
      const files = images.map(image => image.file).filter(Boolean);
      let shared = false;
      if (files.length === images.length && navigator.share) {
        try {
          if (!navigator.canShare || navigator.canShare({files})) {
            await navigator.share({files,title:flyerTitle,text:`${flyerTitle} · ${period}`});
            shared = true;
          }
        } catch (error) {
          if (error.name === 'AbortError') return;
          console.error('Web Share gagal, mengunduh gambar sebagai gantinya:',error);
        }
      }
      if (!shared) {
        for (let index = 0; index < images.length; index++) {
          this.downloadFlyer(images[index].blob,images[index].filename);
          if (index < images.length - 1) await new Promise(resolve => setTimeout(resolve,250));
        }
        DKM.toast(`${images.length} flyer berhasil diunduh.`);
      } else {
        DKM.toast(`${files.length} flyer siap dibagikan.`);
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
