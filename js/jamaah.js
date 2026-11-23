window.Jamaah = {
  rows: [],
  selected: new Set(),
  async render(root) {
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Data Umat</p><h1 class="text-3xl font-semibold">Database Jamaah</h1></div>
        <div class="flex flex-wrap gap-2">${DKM.isAdmin ? `<button class="btn-primary" data-j-action="new">${DKM.icon('plus')}Tambah Jamaah</button>` : ''}</div>
      </header>
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
      <dialog id="jamaahDialog" class="modal-dialog"></dialog>
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
  },
  draw(search = '') {
    const query = search.trim().toLocaleLowerCase('id');
    const visible = this.rows.filter(row => row.nama_lengkap.toLocaleLowerCase('id').includes(query));
    const body = document.getElementById('jamaahRows');
    body.innerHTML = visible.length ? visible.map(row => `<tr>
      ${DKM.isAdmin ? `<td><input type="checkbox" data-j-check value="${row.id}" ${this.selected.has(row.id) ? 'checked' : ''} aria-label="Pilih ${DKM.escape(row.nama_lengkap)}"></td>` : ''}
      <td class="font-medium">${DKM.escape(row.nama_lengkap)}</td><td>${row.umur ?? '-'}</td><td>${DKM.escape(row.kelompok_umur || '-')}</td>
      <td>${DKM.escape(row.jenis_kelamin || '-')}</td><td>${DKM.escape(row.status_pernikahan || '-')}</td><td>${DKM.escape(row.pekerjaan || '-')}</td>
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
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
    return age < 0 ? null : age;
  },
  groupFor(age) {
    if (age === null) return '';
    if (age <= 6) return 'PAUD';
    if (age <= 11) return 'SD';
    if (age <= 15) return 'SMP';
    if (age <= 19) return 'SMA';
    if (age <= 21) return 'Pra Nikah';
    return 'Dewasa';
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
        <label class="field-label">Kelompok Umur<select class="select mt-1" name="kelompok_umur">${this.options(['PAUD','SD','SMP','SMA','Pra Nikah','Dewasa'], row.kelompok_umur)}</select></label>
        <label class="field-label">Jenis Kelamin<select class="select mt-1" name="jenis_kelamin">${this.options(['Laki-laki','Perempuan'],row.jenis_kelamin,true)}</select></label>
        <label class="field-label">Hubungan Keluarga<select class="select mt-1" name="status_keluarga">${this.options(['Kepala Keluarga','Istri','Anak','Famili Lain'],row.status_keluarga,true)}</select></label>
        <label class="field-label">Status Pernikahan<select class="select mt-1" name="status_pernikahan">${this.options(['Belum Kawin','Kawin','Janda','Duda'],row.status_pernikahan,true)}</select></label>
        <label class="field-label">Status Nikah<select class="select mt-1" name="status_nikah">${this.options(['Belum Menikah','Menikah'],row.status_nikah,true)}</select></label>
        <label class="field-label">Pekerjaan<input class="input mt-1" name="pekerjaan" value="${DKM.escape(row.pekerjaan)}"></label>
        <label class="field-label span-2">Penghasilan per Bulan<input class="input mt-1" name="penghasilan" value="${DKM.escape(row.penghasilan)}"></label>
      </div>
      <div class="mt-6 flex justify-end gap-2"><button type="button" class="btn-secondary" data-j-close>Batal</button><button class="btn-primary">Simpan</button></div>
    </form>`;
    const form = dialog.querySelector('form');
    form.elements.tanggal_lahir.addEventListener('change', () => {
      const age = this.ageOf(form.elements.tanggal_lahir.value);
      form.elements.umur.value = age ?? '';
      if (age !== null) form.elements.kelompok_umur.value = this.groupFor(age);
    });
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
    const payload = {
      nama_lengkap: String(formData.get('nama_lengkap')).trim(),
      tempat_lahir: String(formData.get('tempat_lahir')).trim() || null,
      tanggal_lahir: date, umur: age,
      kelompok_umur: String(formData.get('kelompok_umur') || this.groupFor(age)) || null,
      jenis_kelamin: formData.get('jenis_kelamin') || null,
      status_keluarga: formData.get('status_keluarga') || null,
      status_pernikahan: formData.get('status_pernikahan') || null,
      status_nikah: formData.get('status_nikah') || null,
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
  async importFile(file) {
    if (!file) return;
    if (!DKM.isAdmin) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
      const rows = rawRows.map(row => {
        const birthDate = row.tanggal_lahir instanceof Date
          ? row.tanggal_lahir.toISOString().slice(0, 10)
          : String(row.tanggal_lahir || '').slice(0, 10);
        const age = this.ageOf(birthDate);
        return {
          nama_lengkap: String(row.nama_lengkap || row.nama || '').trim(),
          tempat_lahir: String(row.tempat_lahir || '').trim() || null,
          tanggal_lahir: birthDate || null, umur: age,
          jenis_kelamin: row.jenis_kelamin || null,
          status_keluarga: row.status_keluarga || null,
          status_pernikahan: row.status_pernikahan || null,
          kelompok_umur: row.kelompok_umur || this.groupFor(age) || null,
          status_nikah: row.status_nikah || null,
          pekerjaan: row.pekerjaan || null, penghasilan: row.penghasilan || null
        };
      }).filter(row => row.nama_lengkap);
      if (!rows.length) { DKM.toast('Tidak ada baris dengan kolom nama_lengkap.', 'error'); return; }
      const invalid = rows.find(row => row.jenis_kelamin && !['Laki-laki','Perempuan'].includes(row.jenis_kelamin));
      if (invalid) throw new Error(`Jenis kelamin tidak valid pada data ${invalid.nama_lengkap}.`);
      for (let index = 0; index < rows.length; index += 200) {
        const { error } = await DKM.run(
          () => DKM.ready().from('jamaah').insert(rows.slice(index, index + 200)),
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
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(this.rows), 'Jamaah');
    XLSX.writeFile(workbook, 'data_jamaah.xlsx');
  }
};
