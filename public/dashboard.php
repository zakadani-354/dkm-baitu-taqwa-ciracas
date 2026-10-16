<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
require_once dirname(__DIR__) . '/app/layout.php';
require_login();

$summaryStatement = db()->prepare(
    "SELECT
        COUNT(*) AS total,
        SUM(status = 'Hadir') AS hadir,
        SUM(status = 'Izin') AS izin,
        SUM(status = 'Alpa') AS alpa
     FROM presensi
     WHERE tanggal >= :start_date AND tanggal < :end_date"
);
$summaryStatement->execute([
    'start_date' => date('Y-m-01'),
    'end_date' => date('Y-m-01', strtotime('first day of next month')),
]);
$summary = $summaryStatement->fetch();

$monthlyStatement = db()->prepare(
    "SELECT DATE_FORMAT(tanggal, '%Y-%m') AS bulan, status, COUNT(*) AS jumlah
     FROM presensi
     WHERE tanggal >= :start_date AND tanggal < :end_date
     GROUP BY DATE_FORMAT(tanggal, '%Y-%m'), status
     ORDER BY bulan"
);
$monthlyStatement->execute([
    'start_date' => date('Y-m-01', strtotime('-5 months')),
    'end_date' => date('Y-m-01', strtotime('first day of next month')),
]);
$monthlyRows = $monthlyStatement->fetchAll();
$months = [];
for ($offset = 5; $offset >= 0; $offset--) {
    $key = date('Y-m', strtotime("-{$offset} months"));
    $months[$key] = ['Hadir' => 0, 'Izin' => 0, 'Alpa' => 0];
}
foreach ($monthlyRows as $row) {
    if (isset($months[$row['bulan']])) {
        $months[$row['bulan']][$row['status']] = (int) $row['jumlah'];
    }
}
$categoryStatement = db()->prepare(
    "SELECT jenis_pengajian, status, COUNT(*) AS jumlah
     FROM presensi
     WHERE tanggal >= :start_date AND tanggal < :end_date
     GROUP BY jenis_pengajian, status
     ORDER BY jenis_pengajian"
);
$categoryStatement->execute([
    'start_date' => date('Y-m-01', strtotime('-5 months')),
    'end_date' => date('Y-m-01', strtotime('first day of next month')),
]);
$categoryRows = $categoryStatement->fetchAll();
$categories = [
    'Pengajian Umum' => ['Hadir' => 0, 'Izin' => 0, 'Alpa' => 0],
    'Pengajian Generus' => ['Hadir' => 0, 'Izin' => 0, 'Alpa' => 0],
    'Pengajian Ibu-ibu' => ['Hadir' => 0, 'Izin' => 0, 'Alpa' => 0],
];
foreach ($categoryRows as $row) {
    $categories[$row['jenis_pengajian']][$row['status']] = (int) $row['jumlah'];
}
$data = [
    'monthLabels' => array_map(static fn (string $month): string => date('M Y', strtotime($month . '-01')), array_keys($months)),
    'monthly' => [
        'Hadir' => array_column(array_values($months), 'Hadir'),
        'Izin' => array_column(array_values($months), 'Izin'),
        'Alpa' => array_column(array_values($months), 'Alpa'),
    ],
    'categories' => $categories,
];
$chartJson = json_encode($data, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_THROW_ON_ERROR);

page_start('Dashboard');
?>
<section class="stats-grid">
    <article class="stat-card"><span class="stat-icon green">✓</span><div><p>Presensi bulan ini</p><strong><?= (int) ($summary['total'] ?? 0) ?></strong></div></article>
    <article class="stat-card"><span class="stat-icon blue">●</span><div><p>Hadir</p><strong><?= (int) ($summary['hadir'] ?? 0) ?></strong></div></article>
    <article class="stat-card"><span class="stat-icon amber">◷</span><div><p>Izin</p><strong><?= (int) ($summary['izin'] ?? 0) ?></strong></div></article>
    <article class="stat-card"><span class="stat-icon red">—</span><div><p>Alpa</p><strong><?= (int) ($summary['alpa'] ?? 0) ?></strong></div></article>
</section>
<section class="chart-grid">
    <article class="panel chart-panel"><div class="panel-heading"><div><p class="eyebrow">TREN KEHADIRAN</p><h2>Presensi enam bulan terakhir</h2></div><span class="legend-note">Jumlah catatan</span></div><div class="chart-wrap"><canvas id="monthlyChart" aria-label="Grafik presensi enam bulan terakhir"></canvas></div></article>
    <article class="panel chart-panel"><div class="panel-heading"><div><p class="eyebrow">PER JENIS PENGAJIAN</p><h2>Perbandingan kategori</h2></div></div><div class="chart-wrap"><canvas id="categoryChart" aria-label="Grafik presensi menurut jenis pengajian"></canvas></div></article>
</section>
<section class="quick-actions">
    <a class="button button-primary" href="presensi.php">+ Catat presensi</a>
    <a class="button button-secondary" href="jamaah.php">Kelola data jamaah</a>
    <a class="button button-secondary" href="ceklist.php">Lihat ceklist bulan ini</a>
</section>
<script id="dashboard-data" type="application/json"><?= $chartJson ?></script>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js" defer></script>
<script src="assets/js/dashboard.js" defer></script>
<?php page_end(); ?>
