<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
require_once dirname(__DIR__) . '/app/layout.php';
require_login();

$categories = ['Umum', 'Generus', 'Ibu-ibu'];
$editing = null;
if (isset($_GET['edit']) && ctype_digit((string) $_GET['edit'])) {
    $statement = db()->prepare('SELECT id, nama, kategori, alamat, no_telepon FROM jamaah WHERE id = :id');
    $statement->execute(['id' => (int) $_GET['edit']]);
    $editing = $statement->fetch();
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'save') {
        $id = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);
        $nama = trim((string) ($_POST['nama'] ?? ''));
        $kategori = (string) ($_POST['kategori'] ?? '');
        $alamat = trim((string) ($_POST['alamat'] ?? ''));
        $phone = trim((string) ($_POST['no_telepon'] ?? ''));
        if ($nama === '' || mb_strlen($nama) > 120 || !in_array($kategori, $categories, true)
            || mb_strlen($alamat) > 500 || mb_strlen($phone) > 30) {
            flash('error', 'Periksa kembali nama, kategori, alamat, dan nomor telepon.');
        } elseif ($id === false || $id === null) {
            $statement = db()->prepare('INSERT INTO jamaah (nama, kategori, alamat, no_telepon) VALUES (:nama, :kategori, :alamat, :phone)');
            $statement->execute(['nama' => $nama, 'kategori' => $kategori, 'alamat' => $alamat ?: null, 'phone' => $phone ?: null]);
            flash('success', 'Data jamaah berhasil ditambahkan.');
        } else {
            $statement = db()->prepare('UPDATE jamaah SET nama = :nama, kategori = :kategori, alamat = :alamat, no_telepon = :phone WHERE id = :id');
            $statement->execute(['nama' => $nama, 'kategori' => $kategori, 'alamat' => $alamat ?: null, 'phone' => $phone ?: null, 'id' => $id]);
            flash('success', 'Data jamaah berhasil diperbarui.');
        }
        redirect('jamaah.php');
    }
    if ($action === 'set-active') {
        $id = filter_var($_POST['id'] ?? '', FILTER_VALIDATE_INT);
        $active = filter_var($_POST['aktif'] ?? '', FILTER_VALIDATE_INT);
        if ($id === false || $id === null || !in_array($active, [0, 1], true)) {
            flash('error', 'Data perubahan jamaah tidak valid.');
        } else {
            $statement = db()->prepare('UPDATE jamaah SET aktif = (CASE WHEN :aktif = 1 THEN TRUE ELSE FALSE END) WHERE id = :id');
            $statement->execute(['aktif' => $active, 'id' => $id]);
            flash('success', $active === 1 ? 'Jamaah berhasil diaktifkan kembali.' : 'Jamaah berhasil diarsipkan.');
        }
        redirect('jamaah.php');
    }
}

$listStatement = db()->prepare('SELECT id, nama, kategori, alamat, no_telepon, CASE WHEN aktif THEN 1 ELSE 0 END AS aktif FROM jamaah ORDER BY aktif DESC, nama');
$listStatement->execute();
$jamaah = $listStatement->fetchAll();
page_start('Data Jamaah');
?>
<div class="content-grid">
    <section class="panel form-panel">
        <div class="panel-heading"><div><p class="eyebrow">DATA ANGGOTA</p><h2><?= $editing !== false && $editing !== null ? 'Ubah jamaah' : 'Tambah jamaah' ?></h2></div></div>
        <form method="post" class="form-stack">
            <?= csrf_field() ?><input type="hidden" name="action" value="save">
            <input type="hidden" name="id" value="<?= e((string) ($editing['id'] ?? '')) ?>">
            <label>Nama lengkap<input name="nama" maxlength="120" required value="<?= e($editing['nama'] ?? '') ?>"></label>
            <label>Kategori<select name="kategori" required><?php foreach ($categories as $category): ?><option value="<?= e($category) ?>" <?= ($editing['kategori'] ?? '') === $category ? 'selected' : '' ?>><?= e($category) ?></option><?php endforeach; ?></select></label>
            <label>Alamat<textarea name="alamat" rows="3" maxlength="500"><?= e($editing['alamat'] ?? '') ?></textarea></label>
            <label>No. telepon<input name="no_telepon" type="tel" maxlength="30" value="<?= e($editing['no_telepon'] ?? '') ?>"></label>
            <div class="button-row"><button class="button button-primary" type="submit">Simpan</button><?php if ($editing): ?><a class="button button-quiet" href="jamaah.php">Batal</a><?php endif; ?></div>
        </form>
    </section>
    <section class="panel table-panel">
        <div class="panel-heading"><div><p class="eyebrow">DAFTAR TERDAFTAR</p><h2><?= count($jamaah) ?> jamaah</h2></div></div>
        <div class="table-scroll"><table><thead><tr><th>Nama</th><th>Kategori</th><th>Alamat</th><th>No. telepon</th><th>Status</th><th>Aksi</th></tr></thead><tbody>
        <?php foreach ($jamaah as $person): ?><tr>
            <td><strong><?= e($person['nama']) ?></strong><small class="subline">ID <?= (int) $person['id'] ?></small></td><td><span class="badge"><?= e($person['kategori']) ?></span></td><td><?= e($person['alamat'] ?: '—') ?></td><td><?= e($person['no_telepon'] ?: '—') ?></td><td><span class="badge <?= $person['aktif'] ? 'badge-hadir' : '' ?>"><?= $person['aktif'] ? 'Aktif' : 'Diarsipkan' ?></span></td>
            <td class="actions"><?php if ($person['aktif']): ?><a class="text-link" href="jamaah.php?edit=<?= (int) $person['id'] ?>">Ubah</a><?php endif; ?><form method="post" onsubmit="return confirm('<?= $person['aktif'] ? 'Arsipkan' : 'Aktifkan kembali' ?> jamaah ini?')"><?= csrf_field() ?><input type="hidden" name="action" value="set-active"><input type="hidden" name="id" value="<?= (int) $person['id'] ?>"><input type="hidden" name="aktif" value="<?= $person['aktif'] ? '0' : '1' ?>"><button class="text-button <?= $person['aktif'] ? 'danger-text' : '' ?>" type="submit"><?= $person['aktif'] ? 'Arsipkan' : 'Aktifkan' ?></button></form></td>
        </tr><?php endforeach; ?>
        <?php if ($jamaah === []): ?><tr><td colspan="6" class="empty-state">Belum ada data jamaah.</td></tr><?php endif; ?>
        </tbody></table></div>
    </section>
</div>
<?php page_end(); ?>
