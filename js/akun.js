window.Akun = {
  rows: [],
  async render(root) {
    if (!DKM.isAdmin) { DKM.navigate('home'); return; }
    root.innerHTML = `<div class="page-wrap">
      <header class="page-heading"><div><p class="eyebrow">Administrasi Sistem</p><h1 class="text-3xl font-semibold">Kelola Akun</h1></div>
        <button class="btn-primary" data-account-action="new">${DKM.icon('plus')}Tambah Akun</button>
      </header>
      <section class="card table-wrap"><table><thead><tr><th>Nama Lengkap</th><th>Username</th><th>Role</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody id="accountRows"></tbody></table></section>
      <dialog id="accountDialog" class="modal-dialog"></dialog>
    </div>`;
    const page = root.querySelector('.page-wrap');
    page.addEventListener('click',event => {
      const action = event.target.closest('[data-account-action]')?.dataset.accountAction;
      if (action === 'new') this.openForm();
      const button = event.target.closest('[data-account-row-action]');
      if (button) {
        const row = this.rows.find(item => item.id === button.dataset.id);
        if (button.dataset.accountRowAction === 'edit') this.openForm(row);
        if (button.dataset.accountRowAction === 'delete') this.remove(row);
      }
    });
    await this.load();
  },
  async load() {
    const { data,error } = await DKM.run(() => DKM.ready().from('akun_pengguna')
      .select('id,nama_lengkap,username,role,created_at').order('created_at',{ascending:false}),
    'Memuat akun...');
    if (error) throw error;
    this.rows = data || [];
    document.getElementById('accountRows').innerHTML = this.rows.length ? this.rows.map(row => `<tr>
      <td class="font-medium">${DKM.escape(row.nama_lengkap)}</td><td>${DKM.escape(row.username)}</td><td><span class="role-chip">${DKM.escape(row.role)}</span></td>
      <td>${row.created_at ? DKM.formatDate(row.created_at.slice(0,10)) : '-'}</td>
      <td class="whitespace-nowrap"><button class="icon-button inline-grid mr-1" data-account-row-action="edit" data-id="${row.id}" aria-label="Ubah akun"><i data-lucide="key-round"></i></button>
      <button class="icon-button inline-grid text-red-700" data-account-row-action="delete" data-id="${row.id}" aria-label="Hapus akun"><i data-lucide="trash-2"></i></button></td>
    </tr>`).join('') : '<tr><td class="empty-state" colspan="5">Belum ada akun.</td></tr>';
    DKM.refreshIcons();
  },
  openForm(row = {}) {
    const dialog = document.getElementById('accountDialog');
    dialog.innerHTML = `<form id="accountForm" class="modal-card">
      <button type="button" class="icon-button modal-close" data-close aria-label="Tutup"><i data-lucide="x"></i></button>
      <h2 class="mb-5 text-xl font-semibold">${row.id ? 'Ubah Akun' : 'Tambah Akun'}</h2>
      <div class="space-y-4">
        <label class="field-label">Nama Lengkap<input class="input mt-1" name="nama_lengkap" required value="${DKM.escape(row.nama_lengkap)}"></label>
        <label class="field-label">Username<input class="input mt-1" name="username" ${row.id ? 'readonly' : 'required'} minlength="3" maxlength="30" pattern="[A-Za-z0-9._-]+" value="${DKM.escape(row.username)}"></label>
        <label class="field-label">${row.id ? 'Password baru (opsional)' : 'Password'}
          <input class="input mt-1" name="password" type="password" minlength="8" autocomplete="new-password" ${row.id ? '' : 'required'}>
          <span class="mt-1 block text-xs text-muted">${row.id ? 'Kosongkan jika tidak ingin mereset password.' : 'Minimal 8 karakter.'}</span></label>
        <label class="field-label">Role<select class="select mt-1" name="role"><option value="admin" ${row.role === 'admin' ? 'selected' : ''}>Admin</option><option value="pengurus" ${row.role === 'pengurus' ? 'selected' : ''}>Pengurus</option></select></label>
      </div>
      <div class="mt-6 flex justify-end gap-2"><button type="button" class="btn-secondary" data-close>Batal</button><button class="btn-primary">Simpan</button></div>
    </form>`;
    dialog.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click',() => dialog.close()));
    dialog.querySelector('form').addEventListener('submit',event => { event.preventDefault(); this.save(new FormData(event.currentTarget),row); });
    dialog.showModal(); DKM.refreshIcons();
  },
  async save(data,row) {
    const client = DKM.ready();
    const result = row.id
      ? await DKM.run(() => client.rpc('admin_update_account',{
        p_id:row.id,p_nama:String(data.get('nama_lengkap')).trim(),p_role:data.get('role'),
        p_password:String(data.get('password') || '') || null
      }),'Memperbarui akun...')
      : await DKM.run(() => client.rpc('admin_create_account',{
        p_nama:String(data.get('nama_lengkap')).trim(),p_username:String(data.get('username')).trim(),
        p_password:String(data.get('password')),p_role:data.get('role')
      }),'Membuat akun...');
    if (result.error) throw result.error;
    document.getElementById('accountDialog').close();
    DKM.toast(row.id ? 'Akun diperbarui.' : 'Akun dibuat.');
    await this.load();
  },
  async remove(row) {
    if (!row || !confirm(`Hapus akun ${row.username}? Akun yang sedang digunakan tidak dapat dihapus.`)) return;
    const { error } = await DKM.run(() => DKM.ready().rpc('admin_delete_account',{p_id:row.id}),'Menghapus akun...');
    if (error) throw error;
    DKM.toast('Akun dihapus.');
    await this.load();
  }
};
