<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
require_once dirname(__DIR__) . '/app/layout.php';
require_login();

$eventTypes = ['Pengajian Umum', 'Pengajian Generus', 'Pengajian Ibu-ibu'];
$statuses = ['Hadir', 'Izin', 'Alpa'];
$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $jamaahId = filter_var($_POST['jamaah_id'] ?? '', FILTER_VALIDATE_INT);
    $tanggal = (string) ($_POST['tanggal'] ?? '');
    $status = (string) ($_POST['status'] ?? '');
    $jenis = (string) ($_POST['jenis_pengajian'] ?? '');
    if ($jamaahId === false || $jamaahId === null || !valid_date($tanggal)
        || !in_array($status, $statuses, true) || !in_array($jenis, $eventTypes, true)) {
        $error = 'Periksa kembali jamaah, tanggal, status, dan jenis pengajian.';
    } else {
        $statement = db()->prepare(
            'INSERT INTO presensi (jamaah_id, tanggal, status, jenis_pengajian, dicatat_oleh)
             VALUES (:jamaah_id, :tanggal, :status, :jenis, :user_id)'
        );
        $statement->execute([
            'jamaah_id' => $jamaahId,
            'tanggal' => $tanggal,
            'status' => $status,
            'jenis' => $jenis,
            'user_id' => $_SESSION['user_id'],
        ]);
        flash('success', 'Presensi berhasil dicatat.');
        redirect('presensi.php');
    }
}
$peopleStatement = db()->prepare('SELECT id, nama, kategori FROM jamaah WHERE aktif = 1 ORDER BY nama');
$peopleStatement->execute();
$people = $peopleStatement->fetchAll();
$recentStatement = db()->prepare(
    'SELECT p.id, p.tanggal, p.status, p.jenis_pengajian, j.nama AS nama_jamaah
     FROM presensi p JOIN jamaah j ON j.id = p.jamaah_id
     ORDER BY p.tanggal DESC, p.id DESC LIMIT 12'
);
$recentStatement->execute();
$recent = $recentStatement->fetchAll();
page_start('Pencatatan Presensi');
?>
<?php if ($error !== null): ?><div class="alert alert-error" role="alert"><?= e($error) ?></div><?php endif; ?>
<div class="content-grid">
    <section class="panel form-panel">
        <div class="panel-heading"><div><p class="eyebrow">CATAT KEHADIRAN</p><h2>Presensi pengajian</h2></div></div>
        <?php if ($people === []): ?><div class="empty-state">Tambahkan data jamaah terlebih dahulu sebelum mencatat presensi.</div><?php else: ?>
        <form method="post" class="form-stack">
            <?= csrf_field() ?>
            <label>Jamaah<select name="jamaah_id" required><option value="">Pilih jamaah</option><?php foreach ($people as $person): ?><option value="<?= (int) $person['id'] ?>" <?= (string) ($_POST['jamaah_id'] ?? '') === (string) $person['id'] ? 'selected' : '' ?>><?= e($person['nama']) ?> · <?= e($person['kategori']) ?></option><?php endforeach; ?></select></label>
            <label>Tanggal<input type="date" name="tanggal" required value="<?= e((string) ($_POST['tanggal'] ?? date('Y-m-d'))) ?>"></label>
            <label>Jenis pengajian<select name="jenis_pengajian" required><option value="">Pilih jenis pengajian</option><?php foreach ($eventTypes as $eventType): ?><option value="<?= e($eventType) ?>" <?= ($_POST['jenis_pengajian'] ?? '') === $eventType ? 'selected' : '' ?>><?= e($eventType) ?></option><?php endforeach; ?></select></label>
            <label>Status kehadiran<select name="status" required><?php foreach ($statuses as $status): ?><option value="<?= e($status) ?>" <?= ($_POST['status'] ?? 'Hadir') === $status ? 'selected' : '' ?>><?= e($status) ?></option><?php endforeach; ?></select></label>
            <button class="button button-primary" type="submit">Simpan presensi</button>
        </form><?php endif; ?>
    </section>
    <section class="panel table-panel">
        <div class="panel-heading"><div><p class="eyebrow">AKTIVITAS TERBARU</p><h2>Catatan presensi</h2></div></div>
        <div class="table-scroll"><table><thead><tr><th>Jamaah</th><th>Tanggal</th><th>Pengajian</th><th>Status</th></tr></thead><tbody>
        <?php foreach ($recent as $record): ?><tr><td><strong><?= e($record['nama_jamaah']) ?></strong></td><td><?= e($record['tanggal']) ?></td><td><?= e($record['jenis_pengajian']) ?></td><td><span class="badge badge-<?= strtolower(e($record['status'])) ?>"><?= e($record['status']) ?></span></td></tr><?php endforeach; ?>
        <?php if ($recent === []): ?><tr><td colspan="4" class="empty-state">Belum ada catatan presensi.</td></tr><?php endif; ?>
        </tbody></table></div>
    </section>
</div>
<?php page_end(); ?>
