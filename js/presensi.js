window.Presensi = {
  tab: 'input',
  chartBar: null,
  chartDonut: null,
  historyRows: [],
  attendanceRows: [],
  hasdaMessage: '',
  async render(root) {
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Kehadiran Umat</p><h1 class="text-3xl font-semibold">Presensi Pengajian</h1></div></header>
      <div class="segmented mb-5" role="tablist">
        ${[['input','Input Presensi'],['history','Riwayat'],['dashboard','Dashboard'],['hasda','Teks Susulan']].map(([key,title]) =>
          `<button class="segment ${this.tab === key ? 'active' : ''}" role="tab" aria-selected="${this.tab === key}" data-p-tab="${key}">${title}</button>`).join('')}
      </div>
      <div id="presensiView"></div>
    </div>`;
    root.querySelectorAll('[data-p-tab]').forEach(button => button.addEventListener('click', () => this.setTab(button.dataset.pTab)));
    await this.showTab(this.tab);
  },
  async setTab(tab) {
    this.tab = tab;
    document.querySelectorAll('[data-p-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.pTab === tab);
      button.setAttribute('aria-selected', String(button.dataset.pTab === tab));
    });
    await this.showTab(tab);
  },
  async showTab(tab) {
    if (tab === 'input') await this.renderInput();
    else if (tab === 'history') await this.renderHistory();
    else if (tab === 'dashboard') await this.renderDashboard();
    else await this.renderHasda();
  },
  async renderInput() {
    const host = document.getElementById('presensiView');
    host.innerHTML = `<div class="grid gap-4 lg:grid-cols-[270px_1fr]">
      <section class="card card-pad h-fit space-y-4">
        <label class="field-label">Tanggal<input id="attendanceDate" class="input mt-1" type="date" value="${DKM.today()}"></label>
        <label class="field-label">Jenis Pengajian<select id="attendanceType" class="select mt-1">
          ${this.typeOptions()}</select></label>
        <label id="attendanceClassWrap" class="field-label" hidden>Kelas Generus<select id="attendanceClass" class="select mt-1">${this.classOptions()}</select></label>
        <label id="hasdaWrap" class="flex items-center gap-2 text-sm" hidden><input id="attendanceHasda" type="checkbox">HASDA</label>
        ${DKM.isAdmin ? '<button id="loadJamaah" class="btn-primary w-full">Tampilkan Jamaah</button>' : '<p class="text-xs text-muted">Mode lihat saja. Input presensi hanya untuk Admin.</p>'}
      </section>
      <section class="card card-pad">
        <div class="mb-3 flex items-center justify-between"><h2 class="font-semibold">Daftar Kehadiran</h2><span id="candidateCount" class="text-xs text-muted"></span></div>
        <div id="candidateList" class="divide-y divide-[#EFEAE2]"><div class="empty-state">Pilih jenis pengajian untuk memuat daftar.</div></div>
        ${DKM.isAdmin ? '<button id="saveAttendance" class="btn-primary mt-5" hidden>Simpan Presensi</button>' : ''}
      </section>
    </div>`;
    const type = document.getElementById('attendanceType');
    const syncType = () => {
      const generus = type.value === 'Pembinaan Generus';
      document.getElementById('attendanceClassWrap').hidden = !generus;
      document.getElementById('hasdaWrap').hidden = type.value !== 'Pengajian Umum';
    };
    type.addEventListener('change', syncType);
    document.getElementById('attendanceClass')?.addEventListener('change', () => this.loadCandidates());
    syncType();
    document.getElementById('loadJamaah')?.addEventListener('click', () => this.loadCandidates());
    document.getElementById('saveAttendance')?.addEventListener('click', () => this.save());
  },
  typeOptions(selected = '') {
    return ['Pengajian Umum','Pengajian Ibu-Ibu','Pembinaan Generus'].map(value =>
      `<option ${selected === value ? 'selected' : ''}>${value}</option>`).join('');
  },
  classOptions(selected = '') {
    return ['SMP','SMA','PN'].map(value => `<option ${selected === value ? 'selected' : ''}>${value}</option>`).join('');
  },
  async loadCandidates() {
    if (!DKM.isAdmin) return;
    const type = document.getElementById('attendanceType').value;
    let query = DKM.ready().from('jamaah').select('id,nama_lengkap,kelompok_umur,status_pernikahan,jenis_kelamin').order('nama_lengkap');
    if (type === 'Pengajian Ibu-Ibu') query = query.eq('jenis_kelamin','Perempuan');
    if (type === 'Pembinaan Generus') {
      const group = document.getElementById('attendanceClass').value === 'PN' ? 'Pra Nikah' : document.getElementById('attendanceClass').value;
      query = query.eq('kelompok_umur',group);
    }
    const { data, error } = await DKM.run(() => query, 'Memuat daftar jamaah...');
    if (error) throw error;
    const list = document.getElementById('candidateList');
    document.getElementById('candidateCount').textContent = `${data.length} jamaah`;
    list.innerHTML = data.length ? data.map(person => `<div class="flex flex-wrap items-center justify-between gap-3 py-3">
      <div><p class="font-medium">${DKM.escape(person.nama_lengkap)}</p><p class="text-xs text-muted">${DKM.escape(person.kelompok_umur || '-')} · ${DKM.escape(person.status_pernikahan || '-')}</p></div>
      <select class="select status-select" data-status-for="${person.id}" aria-label="Status ${DKM.escape(person.nama_lengkap)}">
        <option>Hadir</option><option>Tidak Hadir</option><option>Izin</option></select>
    </div>`).join('') : '<div class="empty-state">Tidak ada jamaah sesuai kategori ini.</div>';
    const save = document.getElementById('saveAttendance');
    if (save) save.hidden = data.length === 0;
  },
  async save() {
    if (!DKM.isAdmin) return;
    const date = document.getElementById('attendanceDate').value;
    if (!date) { DKM.toast('Tanggal pengajian wajib diisi.', 'error'); return; }
    const type = document.getElementById('attendanceType').value;
    const sessionPayload = {
      tanggal: date, jenis_pengajian: type,
      kelas_generus: type === 'Pembinaan Generus' ? document.getElementById('attendanceClass').value : null,
      is_hasda: type === 'Pengajian Umum' && document.getElementById('attendanceHasda').checked
    };
    let duplicateQuery = DKM.ready().from('presensi_sesi').select('id').eq('tanggal',date).eq('jenis_pengajian',type);
    duplicateQuery = sessionPayload.kelas_generus
      ? duplicateQuery.eq('kelas_generus',sessionPayload.kelas_generus)
      : duplicateQuery.is('kelas_generus',null);
    const { data: duplicates, error: duplicateError } = await DKM.run(() => duplicateQuery, 'Memeriksa sesi presensi...');
    if (duplicateError) throw duplicateError;
    if (duplicates.length && !confirm('Sesi untuk tanggal dan kategori ini sudah ada. Tetap buat sesi baru?')) return;
    const client = DKM.ready();
    const { data: session, error: sessionError } = await DKM.run(
      () => client.from('presensi_sesi').insert(sessionPayload).select('id').single(),
      'Menyimpan sesi presensi...'
    );
    if (sessionError) throw sessionError;
    const details = [...document.querySelectorAll('[data-status-for]')].map(select => ({
      sesi_id: session.id, jamaah_id: select.dataset.statusFor, status: select.value
    }));
    if (details.length) {
      const { error } = await DKM.run(() => client.from('presensi_detail').insert(details), 'Menyimpan detail kehadiran...');
      if (error) {
        const { error: rollbackError } = await client.from('presensi_sesi').delete().eq('id',session.id);
        if (rollbackError) console.error('Gagal membersihkan sesi presensi yang tidak lengkap:',rollbackError);
        throw error;
      }
    }
    DKM.toast('Presensi berhasil disimpan.');
    document.getElementById('saveAttendance').hidden = true;
    document.getElementById('candidateList').innerHTML = '<div class="empty-state">Presensi tersimpan.</div>';
  },
  async renderHistory() {
    const host = document.getElementById('presensiView');
    host.innerHTML = `<section class="card card-pad mb-4"><div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label class="field-label">Bulan<input id="historyMonth" class="input mt-1" type="month" value="${DKM.monthValue()}"></label>
      <label class="field-label">Jenis<select id="historyType" class="select mt-1"><option value="">Semua jenis</option>${this.typeOptions()}</select></label>
      <label class="field-label">Kelas<select id="historyClass" class="select mt-1"><option value="">Semua kelas</option>${this.classOptions()}</select></label>
      <div class="flex items-end"><button class="btn-secondary w-full" id="historyExport">Ekspor Excel</button></div>
    </div></section>
    <section class="card table-wrap"><table><thead><tr><th>Tanggal</th><th>Jenis</th><th>Kelas</th><th>Hadir</th><th>Total</th><th>HASDA</th></tr></thead><tbody id="historyTable"></tbody></table></section>`;
    ['historyMonth','historyType','historyClass'].forEach(id => document.getElementById(id).addEventListener('change',() => this.loadHistory()));
    document.getElementById('historyExport').addEventListener('click',() => this.exportHistory());
    await this.loadHistory();
  },
  async loadHistory() {
    let query = DKM.ready().from('presensi_sesi')
      .select('id,tanggal,jenis_pengajian,kelas_generus,is_hasda,presensi_detail(status)')
      .order('tanggal',{ascending:false});
    const month = document.getElementById('historyMonth').value;
    const type = document.getElementById('historyType').value;
    const klass = document.getElementById('historyClass').value;
    if (month) { const range = DKM.monthBounds(month); query = query.gte('tanggal',range.from).lte('tanggal',range.to); }
    if (type) query = query.eq('jenis_pengajian',type);
    if (klass) query = query.eq('kelas_generus',klass);
    const { data, error } = await DKM.run(() => query,'Memuat riwayat presensi...');
    if (error) throw error;
    this.historyRows = data || [];
    document.getElementById('historyTable').innerHTML = this.historyRows.length ? this.historyRows.map(row => {
      const details = row.presensi_detail || [];
      return `<tr><td>${DKM.formatDate(row.tanggal)}</td><td>${DKM.escape(row.jenis_pengajian)}</td><td>${DKM.escape(row.kelas_generus || '-')}</td>
        <td>${details.filter(item => item.status === 'Hadir').length}</td><td>${details.length}</td><td>${row.is_hasda ? 'Ya' : '-'}</td></tr>`;
    }).join('') : `<tr><td colspan="6" class="empty-state">Belum ada sesi presensi.</td></tr>`;
  },
  exportHistory() {
    const rows = this.historyRows.map(row => ({
      Tanggal: row.tanggal, Jenis: row.jenis_pengajian, Kelas: row.kelas_generus || '',
      Hadir: (row.presensi_detail || []).filter(item => item.status === 'Hadir').length,
      Total: (row.presensi_detail || []).length, HASDA: row.is_hasda ? 'Ya' : 'Tidak'
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book,XLSX.utils.json_to_sheet(rows),'Presensi');
    XLSX.writeFile(book,'riwayat_presensi.xlsx');
  },
  async renderDashboard() {
    document.getElementById('presensiView').innerHTML = `<section id="dashboardArea">
      <section class="card card-pad mb-4"><div class="grid gap-3 sm:grid-cols-3">
        <label class="field-label">Jenis<select id="dashType" class="select mt-1"><option value="">Semua jenis</option>${this.typeOptions()}</select></label>
        <label class="field-label">Bulan<input id="dashMonth" class="input mt-1" type="month" value="${DKM.monthValue()}"></label>
        <button id="dashApply" class="btn-secondary self-end">Terapkan Filter</button>
      </div></section>
      <section class="mb-4 grid gap-3 sm:grid-cols-3">
        <article class="card stat-card"><p class="stat-label">Berkewajiban Hadir</p><p id="kpiRequired" class="stat-value">0</p></article>
        <article class="card stat-card"><p class="stat-label">Jumlah Hadir</p><p id="kpiPresent" class="stat-value">0</p></article>
        <article class="card stat-card"><p class="stat-label">Persentase Kehadiran</p><p id="kpiPercent" class="stat-value">0%</p></article>
      </section>
      <section class="mb-4 grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
        <article class="card card-pad"><h2 class="mb-3 font-semibold">Tren Kehadiran</h2><canvas id="attendanceBars" aria-label="Grafik tren kehadiran"></canvas></article>
        <article class="card card-pad"><h2 class="mb-3 font-semibold">Rasio Kehadiran</h2><canvas id="attendanceDonut" aria-label="Grafik rasio kehadiran"></canvas></article>
      </section>
      <section class="card card-pad"><div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-semibold">Rekap Per Nama Jamaah</h2>
        <label class="field-label">Tingkat<select id="attendanceLevel" class="select mt-1"><option value="all">Semua</option><option value="high">&gt;80%</option><option value="mid">50–80%</option><option value="low">&lt;50%</option></select></label>
      </div><div class="table-wrap"><table><thead><tr><th>Nama</th><th>Hadir</th><th>Total Sesi</th><th>Persentase</th></tr></thead><tbody id="attendanceTable"></tbody></table></div></section>
    </section>
    <div class="mt-4 flex flex-wrap gap-2"><button class="btn-secondary" id="shareDashboard">${DKM.icon('image')}Simpan PNG</button><button class="btn-primary" id="pdfDashboard">${DKM.icon('file-down')}Ekspor PDF</button></div>`;
    document.getElementById('dashApply').addEventListener('click',() => this.loadDashboard());
    document.getElementById('attendanceLevel').addEventListener('change',() => this.drawAttendanceTable());
    document.getElementById('shareDashboard').addEventListener('click',() => this.exportCanvas('png'));
    document.getElementById('pdfDashboard').addEventListener('click',() => this.exportCanvas('pdf'));
    await this.loadDashboard();
  },
  async loadDashboard() {
    let query = DKM.ready().from('presensi_sesi')
      .select('id,tanggal,jenis_pengajian,presensi_detail(status,jamaah_id,jamaah(nama_lengkap))')
      .order('tanggal',{ascending:true});
    const month = document.getElementById('dashMonth').value;
    const type = document.getElementById('dashType').value;
    if (month) { const range = DKM.monthBounds(month); query = query.gte('tanggal',range.from).lte('tanggal',range.to); }
    if (type) query = query.eq('jenis_pengajian',type);
    const { data, error } = await DKM.run(() => query,'Menghitung dashboard...');
    if (error) throw error;
    const sessions = data || [], details = sessions.flatMap(session => session.presensi_detail || []);
    const required = details.length, present = details.filter(detail => detail.status === 'Hadir').length;
    document.getElementById('kpiRequired').textContent = required.toLocaleString('id-ID');
    document.getElementById('kpiPresent').textContent = present.toLocaleString('id-ID');
    document.getElementById('kpiPercent').textContent = `${required ? Math.round(present / required * 100) : 0}%`;
    const people = new Map();
    details.forEach(detail => {
      const person = detail.jamaah;
      if (!person) return;
      const row = people.get(detail.jamaah_id) || { name: person.nama_lengkap, total: 0, present: 0 };
      row.total++; if (detail.status === 'Hadir') row.present++;
      people.set(detail.jamaah_id,row);
    });
    this.attendanceRows = [...people.values()].map(row => ({ ...row, percent: Math.round(row.present / row.total * 100) }))
      .sort((a,b) => a.name.localeCompare(b.name,'id'));
    this.drawAttendanceTable();
    const perDate = new Map();
    sessions.forEach(session => {
      const group = perDate.get(session.tanggal) || { present: 0, total: 0 };
      (session.presensi_detail || []).forEach(detail => { group.total++; if (detail.status === 'Hadir') group.present++; });
      perDate.set(session.tanggal,group);
    });
    if (this.chartBar) this.chartBar.destroy();
    if (this.chartDonut) this.chartDonut.destroy();
    const labels = [...perDate.keys()].map(date => DKM.formatDate(date,{day:'numeric',month:'short'}));
    this.chartBar = new Chart(document.getElementById('attendanceBars'),{
      type:'bar',data:{labels,datasets:[
        {label:'Hadir',data:[...perDate.values()].map(item => item.present),backgroundColor:'#667F6E'},
        {label:'Total',data:[...perDate.values()].map(item => item.total),backgroundColor:'#D9DFD9'}
      ]},options:{responsive:true,plugins:{legend:{position:'bottom'}}}
    });
    this.chartDonut = new Chart(document.getElementById('attendanceDonut'),{
      type:'doughnut',data:{labels:['Hadir','Tidak hadir / Izin'],datasets:[{data:[present,Math.max(0,required-present)],backgroundColor:['#667F6E','#C9BDAF']}]},
      options:{responsive:true,plugins:{legend:{position:'bottom'}}}
    });
  },
  drawAttendanceTable() {
    const filter = document.getElementById('attendanceLevel').value;
    const rows = this.attendanceRows.filter(row => filter === 'high' ? row.percent > 80
      : filter === 'mid' ? row.percent >= 50 && row.percent <= 80
        : filter === 'low' ? row.percent < 50 : true);
    document.getElementById('attendanceTable').innerHTML = rows.length ? rows.map(row =>
      `<tr><td>${DKM.escape(row.name)}</td><td>${row.present}</td><td>${row.total}</td><td>${row.percent}%</td></tr>`
    ).join('') : '<tr><td colspan="4" class="empty-state">Belum ada data untuk filter ini.</td></tr>';
  },
  async exportCanvas(format) {
    try {
      const canvas = await html2canvas(document.getElementById('dashboardArea'),{scale:2,backgroundColor:'#F4EFE8'});
      if (format === 'png') {
        const link = document.createElement('a'); link.download = 'dashboard-presensi.png'; link.href = canvas.toDataURL('image/png'); link.click();
      } else {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p','mm','a4');
        const image = canvas.toDataURL('image/png');
        const width = 190, height = canvas.height * width / canvas.width, pageHeight = 277;
        for (let offset = 0, page = 0; offset < height; offset += pageHeight, page++) {
          if (page) pdf.addPage();
          pdf.addImage(image,'PNG',10,10-offset,width,height);
        }
        pdf.save('dashboard-presensi.pdf');
      }
    } catch (error) { DKM.toast(`Ekspor gagal: ${error.message}`,'error'); }
  },
  async renderHasda() {
    document.getElementById('presensiView').innerHTML = `<section class="card card-pad mb-4"><div class="flex max-w-lg flex-wrap items-end gap-3">
      <label class="field-label flex-1">Bulan<input id="hasdaMonth" class="input mt-1" type="month" value="${DKM.monthValue()}"></label>
      <button id="hasdaRefresh" class="btn-secondary">Tampilkan</button></div></section>
      <section class="card card-pad"><div class="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 class="font-semibold">Jamaah tidak hadir pada Pengajian Umum HASDA</h2><button id="copyHasda" class="btn-primary">${DKM.icon('copy')}Salin Teks</button></div>
      <pre id="hasdaMessage" class="whitespace-pre-wrap rounded-xl border border-[#E6E0D6] bg-[#F7F4EF] p-4 text-sm leading-6"></pre>
      <div id="hasdaPeople" class="mt-4"></div></section>`;
    document.getElementById('hasdaRefresh').addEventListener('click',() => this.loadHasda());
    document.getElementById('hasdaMonth').addEventListener('change',() => this.loadHasda());
    document.getElementById('copyHasda').addEventListener('click',() => this.copyHasda());
    await this.loadHasda();
  },
  async loadHasda() {
    const month = document.getElementById('hasdaMonth').value;
    let query = DKM.ready().from('presensi_sesi').select('tanggal,presensi_detail(status,jamaah(nama_lengkap))')
      .eq('jenis_pengajian','Pengajian Umum').eq('is_hasda',true).order('tanggal');
    if (month) { const range = DKM.monthBounds(month); query = query.gte('tanggal',range.from).lte('tanggal',range.to); }
    const { data, error } = await DKM.run(() => query,'Memuat data HASDA...');
    if (error) throw error;
    const missed = new Map();
    (data || []).forEach(session => (session.presensi_detail || []).forEach(detail => {
      if (detail.status === 'Tidak Hadir' && detail.jamaah?.nama_lengkap) {
        const name = detail.jamaah.nama_lengkap;
        missed.set(name,(missed.get(name) || 0) + 1);
      }
    }));
    const names = [...missed.keys()].sort((a,b) => a.localeCompare(b,'id'));
    this.hasdaMessage = `Assalamu'alaikum.\n\nDaftar susulan Pengajian Umum HASDA bulan ${month || '-'}:\n${names.length ? names.map((name,index) => `${index + 1}. ${name}${missed.get(name) > 1 ? ` (${missed.get(name)} kali)` : ''}`).join('\n') : 'Tidak ada jamaah dengan status Tidak Hadir.'}\n\nMohon ditindaklanjuti. Terima kasih.`;
    document.getElementById('hasdaMessage').textContent = this.hasdaMessage;
    document.getElementById('hasdaPeople').innerHTML = names.length
      ? `<p class="text-sm text-muted">${names.length} jamaah tercatat tidak hadir.</p>`
      : '<p class="text-sm text-muted">Tidak ada jamaah yang tercatat tidak hadir pada bulan ini.</p>';
  },
  async copyHasda() {
    try { await navigator.clipboard.writeText(this.hasdaMessage); DKM.toast('Teks HASDA disalin.'); }
    catch (error) { DKM.toast(`Tidak dapat menyalin teks: ${error.message}`,'error'); }
  }
};
