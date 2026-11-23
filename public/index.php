<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
if (isset($_SESSION['user_id'])) {
    redirect('dashboard.php');
}
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Home · Masjid Baitu Taqwa</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body class="home-page">
<header class="topbar">
    <a class="brand" href="index.php"><span class="brand-mark">BT</span><span>Masjid Baitu Taqwa<small>Portal pengurus DKM</small></span></a>
    <nav aria-label="Navigasi utama">
        <a href="dashboard.php">Dashboard</a>
        <a href="jamaah.php">Jamaah</a>
        <a href="presensi.php">Presensi</a>
        <a href="kegiatan.php">Kegiatan</a>
        <a href="ceklist.php">Ceklist bulanan</a>
    </nav>
    <div class="account">
        <?php if (isset($_SESSION['user_id'])): ?>
            <span><?= e((string) ($_SESSION['nama'] ?? 'Pengurus')) ?></span>
            <form method="post" action="logout.php">
                <?= csrf_field() ?>
                <button class="button button-quiet" type="submit">Keluar</button>
            </form>
        <?php else: ?>
            <a class="button button-primary" href="login.php">Masuk</a>
        <?php endif; ?>
    </div>
</header>
<main class="container">
    <div class="page-heading"><div><p class="eyebrow">MANAJEMEN MASJID</p><h1>Portal Masjid Baitu Taqwa</h1></div></div>
    <section class="stats-grid">
        <article class="stat-card"><span class="stat-icon green">✓</span><div><p>Selamat datang di portal pengurus masjid.</p></div></article>
    </section>
    <div class="quick-actions" style="margin-top:24px;">
        <?php if (!isset($_SESSION['user_id'])): ?>
            <a class="button button-primary" href="login.php">Masuk untuk mengelola data</a>
        <?php else: ?>
            <a class="button button-secondary" href="dashboard.php">Ke Dashboard</a>
        <?php endif; ?>
    </div>
</main>
<footer class="footer">Masjid Baitu Taqwa <span>·</span> Portal internal DKM</footer>
</body>
</html>

