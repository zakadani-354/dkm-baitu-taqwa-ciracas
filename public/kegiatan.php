<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
require_once dirname(__DIR__) . '/app/layout.php';
require_login();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'add') {
        $nama = trim((string) ($_POST['nama'] ?? ''));
        $deskripsi = trim((string) ($_POST['deskripsi'] ?? ''));
        if ($nama === '' || mb_strlen($nama) > 160 || mb_strlen($deskripsi) > 500) {
            flash('error', 'Nama kegiatan wajib diisi (maksimal 160 karakter); deskripsi maksimal 500 karakter.');
        } else {
            $statement = db()->prepare('INSERT INTO kegiatan (nama, deskripsi, dibuat_oleh) VALUES (:nama, :deskripsi, :user_id)');
            $statement->execute(['nama' => $nama, 'deskripsi' => $deskripsi ?: null, 'user_id' => $_SESSION['user_id']]);
            flash('success', 'Kegiatan baru berhasil ditambahkan.');
        }
        redirect('kegiatan.php');
    }
    if ($action === 'toggle') {
        $id = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);
        $active = filter_var($_POST['aktif'] ?? '', FILTER_VALIDATE_INT);
        if ($id === false || $id === null || !in_array($active, [0, 1], true)) {
            flash('error', 'Data perubahan kegiatan tidak valid.');
        } else {
            $statement = db()->prepare('UPDATE kegiatan SET aktif = :aktif WHERE id = :id');
            $statement->execute(['aktif' => $active, 'id' => $id]);
            flash('success', 'Status kegiatan berhasil diperbarui.');
        }
        redirect('kegiatan.php');
    }
}
$statement = db()->prepare('SELECT id, nama, deskripsi, aktif FROM kegiatan ORDER BY aktif DESC, nama');
$statement->execute();
$activities = $statement->fetchAll();
page_start('Manajemen Kegiatan');
?>
<div class="content-grid">
    <section class="panel form-panel">
        <div class="panel-heading"><div><p class="eyebrow">DAFTAR KEGIATAN</p><h2>Tambah kegiatan</h2></div></div>
        <form method="post" class="form-stack">
            <?= csrf_field() ?><input type="hidden" name="action" value="add">
            <label>Nama kegiatan<input name="nama" maxlength="160" required placeholder="Contoh: Kerja Bakti"></label>
            <label>Deskripsi (opsional)<textarea name="deskripsi" rows="4" maxlength="500"></textarea></label>
            <button class="button button-primary" type="submit">Tambah kegiatan</button>
        </form>
        <p class="form-hint">Kegiatan aktif akan otomatis muncul pada ceklist setiap bulan.</p>
    </section>
    <section class="panel table-panel">
        <div class="panel-heading"><div><p class="eyebrow">KATALOG KEGIATAN</p><h2><?= count($activities) ?> kegiatan</h2></div></div>
        <div class="activity-list">
            <?php foreach ($activities as $activity): ?><article class="activity-item"><div><strong><?= e($activity['nama']) ?></strong><p><?= e($activity['deskripsi'] ?: 'Tanpa deskripsi') ?></p></div><div class="activity-control"><span class="badge <?= $activity['aktif'] ? 'badge-hadir' : '' ?>"><?= $activity['aktif'] ? 'Aktif' : 'Nonaktif' ?></span><form method="post"><?= csrf_field() ?><input type="hidden" name="action" value="toggle"><input type="hidden" name="id" value="<?= (int) $activity['id'] ?>"><input type="hidden" name="aktif" value="<?= $activity['aktif'] ? '0' : '1' ?>"><button class="text-button" type="submit"><?= $activity['aktif'] ? 'Nonaktifkan' : 'Aktifkan' ?></button></form></div></article><?php endforeach; ?>
            <?php if ($activities === []): ?><div class="empty-state">Belum ada kegiatan. Tambahkan kegiatan pertama.</div><?php endif; ?>
        </div>
    </section>
</div>
<?php page_end(); ?>
