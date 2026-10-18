<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
require_once dirname(__DIR__) . '/app/layout.php';

$month = (string) ($_GET['bulan'] ?? date('Y-m'));
if (!valid_month($month)) {
    $month = date('Y-m');
}
$monthStart = $month . '-01';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $checklistId = filter_var($_POST['ceklist_id'] ?? '', FILTER_VALIDATE_INT);
    $status = (string) ($_POST['status'] ?? '');
    $postedMonth = (string) ($_POST['bulan'] ?? '');
    if ($checklistId === false || $checklistId === null || !valid_month($postedMonth)
        || !in_array($status, ['Belum Selesai', 'Selesai'], true)) {
        flash('error', 'Perubahan ceklist tidak valid.');
    } else {
        require_admin();
        $statement = db()->prepare('UPDATE ceklist SET status = :status, diperbarui_oleh = :user_id WHERE id = :id AND bulan = :bulan');
        $statement->execute(['status' => $status, 'user_id' => $_SESSION['user_id'], 'id' => $checklistId, 'bulan' => $postedMonth . '-01']);
        flash('success', $statement->rowCount() > 0 ? 'Status kegiatan diperbarui.' : 'Status kegiatan tidak berubah atau kegiatan tidak ditemukan.');
    }
    redirect('ceklist.php?bulan=' . rawurlencode(valid_month($postedMonth) ? $postedMonth : date('Y-m')));
}

$activitiesStatement = db()->prepare('SELECT id FROM kegiatan WHERE aktif = TRUE');
$activitiesStatement->execute();
$activeActivities = $activitiesStatement->fetchAll();
$insertSql = db_driver() === 'pgsql'
    ? 'INSERT INTO ceklist (kegiatan_id, bulan) VALUES (:kegiatan_id, :bulan)
       ON CONFLICT (kegiatan_id, bulan) DO NOTHING'
    : 'INSERT INTO ceklist (kegiatan_id, bulan) VALUES (:kegiatan_id, :bulan)
       ON DUPLICATE KEY UPDATE kegiatan_id = VALUES(kegiatan_id)';
$insert = db()->prepare($insertSql);
foreach ($activeActivities as $activity) {
    $insert->execute(['kegiatan_id' => $activity['id'], 'bulan' => $monthStart]);
}
$statement = db()->prepare(
    'SELECT c.id, c.status, k.nama, k.deskripsi
     FROM ceklist c JOIN kegiatan k ON k.id = c.kegiatan_id
     WHERE c.bulan = :bulan
     ORDER BY c.status, k.nama'
);
$statement->execute(['bulan' => $monthStart]);
$items = $statement->fetchAll();
$completed = count(array_filter($items, static fn (array $item): bool => $item['status'] === 'Selesai'));
page_start('Ceklist Kegiatan Bulanan');
?>
<section class="panel checklist-panel">
    <div class="panel-heading checklist-heading">
        <div><p class="eyebrow">PEMANTAUAN KEGIATAN</p><h2><?= e(date('F Y', strtotime($monthStart))) ?></h2></div>
        <form method="get" class="month-picker"><label for="bulan">Bulan</label><input id="bulan" type="month" name="bulan" value="<?= e($month) ?>"><button class="button button-secondary" type="submit">Tampilkan</button></form>
    </div>
    <div class="progress-row"><span><?= $completed ?> dari <?= count($items) ?> kegiatan selesai</span><span class="progress-track"><span style="width: <?= count($items) > 0 ? (int) round($completed / count($items) * 100) : 0 ?>%"></span></span></div>
    <div class="checklist">
        <?php foreach ($items as $item): ?><article class="check-item <?= $item['status'] === 'Selesai' ? 'is-complete' : '' ?>"><div class="check-copy"><span class="check-icon"><?= $item['status'] === 'Selesai' ? '✓' : '○' ?></span><div><strong><?= e($item['nama']) ?></strong><p><?= e($item['deskripsi'] ?: 'Tidak ada deskripsi') ?></p></div></div><form method="post" class="check-form"><?= csrf_field() ?><input type="hidden" name="ceklist_id" value="<?= (int) $item['id'] ?>"><input type="hidden" name="bulan" value="<?= e($month) ?>"><input type="hidden" name="status" value="<?= $item['status'] === 'Selesai' ? 'Belum Selesai' : 'Selesai' ?>"><button class="button <?= $item['status'] === 'Selesai' ? 'button-secondary' : 'button-primary' ?>" type="submit"><?= $item['status'] === 'Selesai' ? 'Tandai belum selesai' : 'Tandai selesai' ?></button></form></article><?php endforeach; ?>
        <?php if ($items === []): ?><div class="empty-state">Belum ada kegiatan aktif untuk bulan ini. Tambahkan kegiatan di <a class="text-link" href="kegiatan.php">Manajemen Kegiatan</a>.</div><?php endif; ?>
    </div>
</section>
<?php page_end(); ?>
