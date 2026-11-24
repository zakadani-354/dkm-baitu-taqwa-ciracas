window.Jamaah = {
  rows: [],
  selected: new Set(),
  async render(root) {
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Data Umat</p><h1 class="text-3xl font-semibold">Database Jamaah</h1></div>
        <div class="flex flex-wrap gap-2">${DKM.isAdmin ? `<button class="btn-primary" data-j-action="new">${DKM.icon('plus')}Tambah Jamaah</button>` : ''}</div>
      </header>
      <nav class="segmented mb-4" aria-label="Menu Database Jamaah">
        <button class="segment active" type="button" data-j-tab="data">Data Jamaah</button>
        <button class="segment" type="button" data-j-tab="census">Sensus Jamaah</button>
      </nav>
      <div id="jamaahDataView">
      <section class="card card-pad mb-4"><div class="flex flex-wrap items-center gap-3">
        <input id="jamaahSearch" class="input max-w-sm" type="search" placeholder="Cari nama jamaah..." aria-label="Cari jamaah">
        ${DKM.isAdmin ? `<button class="btn-secondary" data-j-action="template">Template Excel</button>
          <label class="btn-secondary">Import Excel/CSV<input id="jamaahFile" class="sr-only" type="file" accept=".xlsx,.xls,.csv"></label>
          <button id="bulkDelete" class="btn-danger" data-j-action="bulk-delete" hidden>Hapus Terpilih</button>` : ''}
        <button class="btn-secondary" data-j-action="export">Ekspor Excel</button>
      </div></section>
      <section class="card table-wrap"><table><thead><tr>
        ${DKM.isAdmin ? '<th><label class="flex items-center gap-2"><input id="selectAll" type="checkbox" aria-label="Pilih semua"><span>Pilih</span></label></th>' : ''}
        <th>Nama</th><th>Umur</th><th>Kelompok</th><th>Jenis Kelamin</th><th>Status Nikah</th><th>Pekerjaan</th>${DKM.isAdmin ? '<th>Aksi</th>' : ''}
      </tr></thead><tbody id="jamaahRows"><tr><td class="empty-state" colspan="8">Memuat jamaah...</td></tr></tbody></table></section>
      </div>
      <dialog id="jamaahDialog" class="modal-dialog"></dialog>
      <section id="jamaahCensusView" hidden>
        <div class="card stat-card mb-4 flex items-center justify-between">
          <div><p class="stat-label">Jumlah KK</p><p id="jamaahFamilyCount" class="stat-value">0</p></div>
          <div class="grid h-12 w-12 place-items-center rounded-full bg-[#E4E8DF] text-sage">${DKM.icon('house')}</div>
        </div>
        <section class="card table-wrap"><table>
          <thead><tr><th>Klasifikasi</th><th>Laki-Laki</th><th>Perempuan</th><th>Belum Diisi</th><th>Total</th></tr></thead>
          <tbody id="jamaahCensusRows"></tbody>
        </table></section>
      </section>
    </div>`;
    this.selected.clear();
    document.getElementById('jamaahSearch').addEventListener('input', event => this.draw(event.target.value));
    document.getElementById('jamaahRows').addEventListener('change', event => {
      if (event.target.matches('[data-j-check]')) this.toggleOne(event.target.value, event.target.checked);
    });
    document.getElementById('jamaahRows').addEventListener('click', event => {
      const button = event.target.closest('[data-j-action]');
      if (!button) return;
      const row = this.rows.find(item => item.id === button.dataset.id);
      if (button.dataset.jAction === 'edit') this.openForm(row);
      if (button.dataset.jAction === 'delete') this.remove(row.id);
    });
    document.getElementById('jamaahFile')?.addEventListener('change', event => this.importFile(event.target.files[0]));
    document.getElementById('selectAll')?.addEventListener('change', event => this.selectVisible(event.target.checked));
    root.querySelector('.page-wrap').addEventListener('click', event => {
      const tab = event.target.closest('[data-j-tab]');
      if (tab) { this.showTab(tab.dataset.jTab); return; }
      const button = event.target.closest('[data-j-action]');
      if (!button) return;
      if (button.dataset.jAction === 'new') this.openForm();
      if (button.dataset.jAction === 'template') this.downloadTemplate();
      if (button.dataset.jAction === 'bulk-delete') this.bulkDelete();
      if (button.dataset.jAction === 'export') this.exportExcel();
    });
    await this.load();
  },
  async load() {
    const { data, error } = await DKM.run(() => DKM.ready().from('jamaah')
      .select('*').order('nama_lengkap', { ascending: true }), 'Memuat data jamaah...');
    if (error) throw error;
    this.rows = data || [];
    this.draw(document.getElementById('jamaahSearch').value);
    this.drawCensus();
  },
  draw(search = '') {
    const query = search.trim().toLocaleLowerCase('id');
    const visible = this.rows.filter(row => row.nama_lengkap.toLocaleLowerCase('id').includes(query));
    const body = document.getElementById('jamaahRows');
    body.innerHTML = visible.length ? visible.map(row => `<tr>
      ${DKM.isAdmin ? `<td><input type="checkbox" data-j-check value="${row.id}" ${this.selected.has(row.id) ? 'checked' : ''} aria-label="Pilih ${DKM.escape(row.nama_lengkap)}"></td>` : ''}
      <td class="font-medium">${DKM.escape(row.nama_lengkap)}</td><td>${(row.tanggal_lahir ? this.ageOf(row.tanggal_lahir) : row.umur) ?? '-'}</td><td>${DKM.escape(this.classificationFor(row) || '-')}</td>
      <td>${DKM.escape(row.jenis_kelamin || '-')}</td><td>${DKM.escape(row.status_nikah || row.status_pernikahan || '-')}</td><td>${DKM.escape(row.pekerjaan || '-')}</td>
      ${DKM.isAdmin ? `<td class="whitespace-nowrap"><button class="icon-button inline-grid mr-1" data-j-action="edit" data-id="${row.id}" aria-label="Ubah"><i data-lucide="pencil"></i></button><button class="icon-button inline-grid text-red-700" data-j-action="delete" data-id="${row.id}" aria-label="Hapus"><i data-lucide="trash-2"></i></button></td>` : ''}
    </tr>`).join('') : `<tr><td class="empty-state" colspan="${DKM.isAdmin ? 8 : 6}">Tidak ada data jamaah.</td></tr>`;
    const selectAll = document.getElementById('selectAll');
    if (selectAll) {
      selectAll.checked = visible.length > 0 && visible.every(row => this.selected.has(row.id));
      selectAll.indeterminate = visible.some(row => this.selected.has(row.id)) && !selectAll.checked;
    }
    const bulkButton = document.getElementById('bulkDelete');
    if (bulkButton) bulkButton.hidden = this.selected.size === 0;
    DKM.refreshIcons();
  },
  refreshAgeClassification() {
    const search = document.getElementById('jamaahSearch');
    if (!search) return;
    this.draw(search.value);
    this.drawCensus();
    const birthDate = document.querySelector('#jamaahForm [name="tanggal_lahir"]');
    if (birthDate) birthDate.dispatchEvent(new Event('change'));
  },
  toggleOne(id, checked) {
    if (checked) this.selected.add(id); else this.selected.delete(id);
    this.draw(document.getElementById('jamaahSearch').value);
  },
  selectVisible(checked) {
    const query = document.getElementById('jamaahSearch').value.trim().toLocaleLowerCase('id');
    this.rows.filter(row => row.nama_lengkap.toLocaleLowerCase('id').includes(query)).forEach(row => {
      if (checked) this.selected.add(row.id); else this.selected.delete(row.id);
    });
    this.draw(query);
  },
  ageOf(value) {
    if (!value) return null;
    const birth = new Date(`${value.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(birth.getTime())) return null;
    const now = new Date();
    const age = now.getFullYear() - birth.getFullYear();
    return age < 0 ? null : age;
  },
  groupFor(age, statusNikah = null) {
    if (statusNikah === 'Menikah') return 'Menikah';
    if (age === null || age === undefined || !Number.isFinite(Number(age))) return '';
    age = Number(age);
    if (age <= 6) return 'Usia Dini (0-6 Tahun)';
    if (age <= 12) return 'Caberawit (7-12 Tahun)';
    if (age <= 15) return 'SMP-Pra Remaja (13-15 Tahun)';
    if (age <= 18) return 'SMA-Remaja (16-18 Tahun)';
    if (age <= 30) return 'PN-Pra Nikah (19-30 Tahun belum menikah)';
    return 'PN-Dewasa (Diatas 30 Tahun yang belum menikah)';
  },
  normalizeGroup(value) {
    const groups = [
      'Usia Dini (0-6 Tahun)',
      'Caberawit (7-12 Tahun)',
      'SMP-Pra Remaja (13-15 Tahun)',
      'SMA-Remaja (16-18 Tahun)',
      'PN-Pra Nikah (19-30 Tahun belum menikah)',
      'PN-Dewasa (Diatas 30 Tahun yang belum menikah)',
      'Menikah'
    ];
    const aliases = {
      'paud': groups[0],
      'sd': groups[1],
      'smp': groups[2],
      'sma': groups[3],
      'pra nikah': groups[4],
      'dewasa': groups[5]
    };
    const text = String(value || '').trim();
    return aliases[text.toLocaleLowerCase('id')] || groups.find(group => group.toLocaleLowerCase('id') === text.toLocaleLowerCase('id')) || null;
  },
  maritalStatus(statusNikah, statusPernikahan) {
    if (statusNikah) return statusNikah;
    return {
      Kawin: 'Menikah',
      'Belum Kawin': 'Belum Menikah',
      Janda: 'Janda',
      Duda: 'Duda'
    }[statusPernikahan] || null;
  },
  classificationFor(row) {
    const age = row.tanggal_lahir ? this.ageOf(row.tanggal_lahir) : row.umur;
    return this.groupFor(age, this.maritalStatus(row.status_nikah, row.status_pernikahan)) || row.kelompok_umur || '';
  },
  showTab(tabName) {
    const census = tabName === 'census';
    document.getElementById('jamaahDataView').hidden = census;
    document.getElementById('jamaahCensusView').hidden = !census;
    document.querySelectorAll('[data-j-tab]').forEach(button => button.classList.toggle('active', button.dataset.jTab === tabName));
  },
  drawCensus() {
    const categories = [
      'Usia Dini (0-6 Tahun)',
      'Caberawit (7-12 Tahun)',
      'SMP-Pra Remaja (13-15 Tahun)',
      'SMA-Remaja (16-18 Tahun)',
      'PN-Pra Nikah (19-30 Tahun belum menikah)',
      'PN-Dewasa (Diatas 30 Tahun yang belum menikah)',
      'Menikah'
    ];
    const emptyCount = () => ({ male: 0, female: 0, unspecified: 0, total: 0 });
    const counts = new Map(categories.map(category => [category, emptyCount()]));
    const unclassified = emptyCount();
    for (const row of this.rows) {
      const category = this.classificationFor(row);
      const count = counts.get(category) || unclassified;
      if (row.jenis_kelamin === 'Laki-laki') count.male++;
      else if (row.jenis_kelamin === 'Perempuan') count.female++;
      else count.unspecified++;
      count.total++;
    }
    const tableRows = categories.map(category => {
      const count = counts.get(category);
      return `<tr><td class="font-medium">${DKM.escape(category)}</td><td>${count.male}</td><td>${count.female}</td><td>${count.unspecified}</td><td>${count.total}</td></tr>`;
    });
    if (unclassified.total) tableRows.push(`<tr><td class="font-medium">Belum terklasifikasi</td><td>${unclassified.male}</td><td>${unclassified.female}</td><td>${unclassified.unspecified}</td><td>${unclassified.total}</td></tr>`);
    const allCounts = [...counts.values(), unclassified];
    const maleTotal = allCounts.reduce((total, count) => total + count.male, 0);
    const femaleTotal = allCounts.reduce((total, count) => total + count.female, 0);
    const unspecifiedTotal = allCounts.reduce((total, count) => total + count.unspecified, 0);
    const total = allCounts.reduce((sum, count) => sum + count.total, 0);
    tableRows.push(`<tr class="font-semibold"><td>Total</td><td>${maleTotal}</td><td>${femaleTotal}</td><td>${unspecifiedTotal}</td><td>${total}</td></tr>`);
    document.getElementById('jamaahCensusRows').innerHTML = tableRows.join('');
    const familyCount = this.rows.filter(row =>
      row.status_keluarga === 'Kepala Keluarga' || ['Janda', 'Duda'].includes(row.status_nikah || row.status_pernikahan)
    ).length;
    document.getElementById('jamaahFamilyCount').textContent = familyCount.toLocaleString('id-ID');
  },
  openForm(row = {}) {
    if (!DKM.isAdmin) return;
    const dialog = document.getElementById('jamaahDialog');
    dialog.innerHTML = `<form id="jamaahForm" class="modal-card" method="dialog">
      <button type="button" class="icon-button modal-close" data-j-close aria-label="Tutup"><i data-lucide="x"></i></button>
      <h2 class="mb-5 text-xl font-semibold">${row.id ? 'Ubah Jamaah' : 'Tambah Jamaah'}</h2>
      <div class="form-grid">
        <label class="field-label span-2">Nama Lengkap<input class="input mt-1" name="nama_lengkap" required maxlength="160" value="${DKM.escape(row.nama_lengkap)}"></label>
        <label class="field-label">Tempat Lahir<input class="input mt-1" name="tempat_lahir" value="${DKM.escape(row.tempat_lahir)}"></label>
        <label class="field-label">Tanggal Lahir<input class="input mt-1" name="tanggal_lahir" type="date" value="${DKM.escape(row.tanggal_lahir || '')}"></label>
        <label class="field-label">Umur<input class="input mt-1" name="umur" type="number" readonly value="${row.umur ?? ''}"></label>
        <label class="field-label">Klasifikasi Jamaah<input class="input mt-1" name="kelompok_umur" readonly value="${DKM.escape(this.classificationFor(row))}"></label>
        <label class="field-label">Jenis Kelamin<select class="select mt-1" name="jenis_kelamin">${this.options(['Laki-laki','Perempuan'],row.jenis_kelamin,true)}</select></label>
        <label class="field-label">Hubungan Keluarga<select class="select mt-1" name="status_keluarga">${this.options(['Kepala Keluarga','Istri','Anak','Famili Lain'],row.status_keluarga,true)}</select></label>
        <label class="field-label">Status Pernikahan<select class="select mt-1" name="status_pernikahan">${this.options(['Belum Kawin','Kawin','Janda','Duda'],row.status_pernikahan,true)}</select></label>
        <label class="field-label">Status Nikah<select class="select mt-1" name="status_nikah">${this.options(['Belum Menikah','Menikah','Janda','Duda'],row.status_nikah,true)}</select></label>
        <label class="field-label">Pekerjaan<input class="input mt-1" name="pekerjaan" value="${DKM.escape(row.pekerjaan)}"></label>
        <label class="field-label span-2">Penghasilan per Bulan<input class="input mt-1" name="penghasilan" value="${DKM.escape(row.penghasilan)}"></label>
      </div>
      <div class="mt-6 flex justify-end gap-2"><button type="button" class="btn-secondary" data-j-close>Batal</button><button class="btn-primary">Simpan</button></div>
    </form>`;
    const form = dialog.querySelector('form');
    const updateClassification = () => {
      const age = this.ageOf(form.elements.tanggal_lahir.value);
      const maritalStatus = this.maritalStatus(form.elements.status_nikah.value, form.elements.status_pernikahan.value);
      form.elements.umur.value = age ?? '';
      form.elements.kelompok_umur.value = this.groupFor(age, maritalStatus);
      if (['Janda', 'Duda'].includes(maritalStatus)) {
        form.elements.status_keluarga.value = 'Kepala Keluarga';
      }
    };
    form.elements.tanggal_lahir.addEventListener('change', updateClassification);
    form.elements.status_nikah.addEventListener('change', updateClassification);
    form.elements.status_pernikahan.addEventListener('change', updateClassification);
    dialog.querySelectorAll('[data-j-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    form.addEventListener('submit', event => { event.preventDefault(); this.save(new FormData(form), row.id); });
    dialog.showModal();
    DKM.refreshIcons();
  },
  options(values, selected, allowBlank = false) {
    return `${allowBlank ? '<option value="">Pilih...</option>' : ''}${values.map(value =>
      `<option value="${value}" ${selected === value ? 'selected' : ''}>${value}</option>`).join('')}`;
  },
  async save(formData, id) {
    const date = formData.get('tanggal_lahir') || null;
    const age = this.ageOf(date);
    const statusNikah = this.maritalStatus(formData.get('status_nikah'), formData.get('status_pernikahan'));
    const payload = {
      nama_lengkap: String(formData.get('nama_lengkap')).trim(),
      tempat_lahir: String(formData.get('tempat_lahir')).trim() || null,
      tanggal_lahir: date, umur: age,
      kelompok_umur: this.groupFor(age, statusNikah) || null,
      jenis_kelamin: formData.get('jenis_kelamin') || null,
      status_keluarga: ['Janda', 'Duda'].includes(statusNikah) ? 'Kepala Keluarga' : formData.get('status_keluarga') || null,
      status_pernikahan: formData.get('status_pernikahan') || null,
      status_nikah: statusNikah,
      pekerjaan: String(formData.get('pekerjaan')).trim() || null,
      penghasilan: String(formData.get('penghasilan')).trim() || null
    };
    const request = id
      ? DKM.ready().from('jamaah').update(payload).eq('id', id)
      : DKM.ready().from('jamaah').insert(payload);
    const { error } = await DKM.run(() => request, 'Menyimpan jamaah...');
    if (error) throw error;
    document.getElementById('jamaahDialog').close();
    DKM.toast(id ? 'Data jamaah diperbarui.' : 'Jamaah ditambahkan.');
    await this.load();
  },
  async remove(id) {
    const row = this.rows.find(item => item.id === id);
    if (!row || !confirm(`Hapus data ${row.nama_lengkap}?`)) return;
    const { error } = await DKM.run(() => DKM.ready().from('jamaah').delete().eq('id', id), 'Menghapus jamaah...');
    if (error) throw error;
    this.selected.delete(id);
    DKM.toast('Data jamaah dihapus.');
    await this.load();
  },
  async bulkDelete() {
    const ids = [...this.selected];
    if (!ids.length || !confirm(`Hapus ${ids.length} jamaah terpilih? Riwayat presensinya juga akan terhapus.`)) return;
    const { error } = await DKM.run(() => DKM.ready().from('jamaah').delete().in('id', ids), 'Menghapus jamaah terpilih...');
    if (error) throw error;
    this.selected.clear();
    DKM.toast(`${ids.length} data jamaah dihapus.`);
    await this.load();
  },
  downloadTemplate() {
    const rows = [{
      nama_lengkap: '', tempat_lahir: '', tanggal_lahir: '2000-01-01', jenis_kelamin: 'Laki-laki',
      status_keluarga: 'Anak', status_pernikahan: 'Belum Kawin', status_nikah: 'Belum Menikah',
      pekerjaan: '', penghasilan: ''
    }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Jamaah');
    XLSX.writeFile(workbook, 'template_jamaah.xlsx');
  },
  normalizeHeader(value) {
    return String(value || '')
      .replace(/^\ufeff/, '')
      .trim()
      .toLocaleLowerCase('id')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  },
  rowValue(row, names) {
    const entries = new Map(Object.keys(row).map(key => [this.normalizeHeader(key), row[key]]));
    for (const name of names) {
      const value = entries.get(this.normalizeHeader(name));
      if (value !== undefined && value !== null && String(value).trim() !== '') return value;
    }
    return '';
  },
  parseBirthDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
    const text = String(value || '').trim();
    if (!text) return null;
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
      const [year, month, day] = text.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    const localDate = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (localDate) {
      const [, dayText, monthText, yearText] = localDate;
      const day = Number(dayText), month = Number(monthText), year = Number(yearText);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  },
  normalizeChoice(value, choices, aliases = {}) {
    const text = String(value || '').trim();
    if (!text) return null;
    const key = text.toLocaleLowerCase('id').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (Object.prototype.hasOwnProperty.call(aliases, key)) return aliases[key];
    const match = choices.find(choice => choice.toLocaleLowerCase('id') === key);
    return match || text;
  },
  async importFile(file) {
    if (!file) return;
    if (!DKM.isAdmin) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw new Error('File tidak memiliki sheet yang dapat dibaca.');
      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const rows = rawRows.map((row, index) => {
        const name = String(this.rowValue(row, ['nama_lengkap', 'nama', 'name'])).trim();
        const rawBirthDate = this.rowValue(row, ['tanggal_lahir', 'tgl_lahir', 'tanggal lahir']);
        const birthDate = this.parseBirthDate(rawBirthDate);
        const age = this.ageOf(birthDate);
        const statusPernikahan = this.normalizeChoice(this.rowValue(row, ['status_pernikahan', 'status pernikahan']), ['Janda', 'Duda', 'Kawin', 'Belum Kawin'], { kawin: 'Kawin', menikah: 'Kawin', 'belum menikah': 'Belum Kawin', 'belum kawin': 'Belum Kawin' });
        const statusNikah = this.normalizeChoice(
          this.rowValue(row, ['status_nikah', 'status nikah']) || statusPernikahan,
          ['Menikah', 'Belum Menikah', 'Janda', 'Duda'],
          { kawin: 'Menikah', menikah: 'Menikah', 'belum kawin': 'Belum Menikah', 'belum menikah': 'Belum Menikah' }
        );
        const statusKeluarga = this.normalizeChoice(this.rowValue(row, ['status_keluarga', 'hubungan_keluarga', 'hubungan keluarga']), ['Kepala Keluarga', 'Istri', 'Anak', 'Famili Lain'], { kk: 'Kepala Keluarga', 'kepala keluarga': 'Kepala Keluarga', famili: 'Famili Lain', 'famili lain': 'Famili Lain' });
        return {
          __row: index + 2,
          __invalid_birth: rawBirthDate !== '' && birthDate === null,
          nama_lengkap: name,
          tempat_lahir: String(this.rowValue(row, ['tempat_lahir', 'tempat lahir']) || '').trim() || null,
          tanggal_lahir: birthDate || null, umur: age,
          jenis_kelamin: this.normalizeChoice(this.rowValue(row, ['jenis_kelamin', 'jenis kelamin']), ['Laki-laki', 'Perempuan'], { 'laki laki': 'Laki-laki', laki: 'Laki-laki', l: 'Laki-laki', pria: 'Laki-laki', perempuan: 'Perempuan', p: 'Perempuan', wanita: 'Perempuan' }),
          status_keluarga: ['Janda', 'Duda'].includes(statusNikah) ? 'Kepala Keluarga' : statusKeluarga,
          status_pernikahan: statusPernikahan,
          kelompok_umur: this.groupFor(age, statusNikah) || this.normalizeGroup(this.rowValue(row, ['kelompok_umur', 'kelompok umur'])),
          status_nikah: statusNikah,
          pekerjaan: String(this.rowValue(row, ['pekerjaan']) || '').trim() || null,
          penghasilan: String(this.rowValue(row, ['penghasilan', 'penghasilan_per_bulan', 'penghasilan per bulan']) || '').trim() || null
        };
      }).filter(row => row.nama_lengkap);
      if (!rows.length) { DKM.toast('Tidak ada baris dengan kolom nama_lengkap.', 'error'); return; }
      for (const row of rows) {
        if (row.__invalid_birth) throw new Error(`Tanggal lahir tidak valid pada baris ${row.__row}.`);
      }
      const validations = [
        ['Jenis kelamin', 'jenis_kelamin', ['Laki-laki', 'Perempuan']],
        ['Status keluarga', 'status_keluarga', ['Kepala Keluarga', 'Istri', 'Anak', 'Famili Lain']],
        ['Status pernikahan', 'status_pernikahan', ['Janda', 'Duda', 'Kawin', 'Belum Kawin']],
        ['Kelompok umur', 'kelompok_umur', ['Usia Dini (0-6 Tahun)', 'Caberawit (7-12 Tahun)', 'SMP-Pra Remaja (13-15 Tahun)', 'SMA-Remaja (16-18 Tahun)', 'PN-Pra Nikah (19-30 Tahun belum menikah)', 'PN-Dewasa (Diatas 30 Tahun yang belum menikah)', 'Menikah']],
        ['Status nikah', 'status_nikah', ['Menikah', 'Belum Menikah', 'Janda', 'Duda']]
      ];
      for (const row of rows) {
        for (const [label, field, choices] of validations) {
          if (row[field] && !choices.includes(row[field])) throw new Error(`${label} tidak valid pada baris ${row.__row}: "${row[field]}".`);
        }
      }
      for (let index = 0; index < rows.length; index += 200) {
        const batch = rows.slice(index, index + 200).map(({ __row, __invalid_birth, ...row }) => row);
        const { error } = await DKM.run(
          () => DKM.ready().from('jamaah').insert(batch),
          `Mengimpor ${Math.min(index + 200, rows.length)} dari ${rows.length} jamaah...`
        );
        if (error) throw error;
      }
      DKM.toast(`${rows.length} data jamaah berhasil diimpor.`);
      await this.load();
    } catch (error) {
      DKM.toast(error.message || 'File tidak dapat diimpor.', 'error');
    } finally { document.getElementById('jamaahFile').value = ''; }
  },
  exportExcel() {
    const workbook = XLSX.utils.book_new();
    const rows = this.rows.map(row => ({
      ...row,
      umur: row.tanggal_lahir ? this.ageOf(row.tanggal_lahir) : row.umur,
      kelompok_umur: this.classificationFor(row)
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), 'Jamaah');
    XLSX.writeFile(workbook, 'data_jamaah.xlsx');
  }
};
