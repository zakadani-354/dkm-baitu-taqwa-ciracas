<?php
declare(strict_types=1);

function page_start(string $title): void
{
    $flash = take_flash();
    ?>
    <!doctype html>
    <html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><?= e($title) ?> · Masjid Baitu Taqwa</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg">
        <link rel="stylesheet" href="assets/css/app.css">
    </head>
    <body>
    <header class="topbar">
        <a class="brand" href="dashboard.php"><span class="brand-mark">BT</span><span>Masjid Baitu Taqwa<small>Portal pengurus DKM</small></span></a>
        <nav aria-label="Navigasi utama">
            <a href="dashboard.php">Dashboard</a>
            <a href="jamaah.php">Jamaah</a>
            <a href="presensi.php">Presensi</a>
            <a href="kegiatan.php">Kegiatan</a>
            <a href="ceklist.php">Ceklist bulanan</a>
        </nav>
        <div class="account">
            <span><?= e((string) ($_SESSION['nama'] ?? 'Pengurus')) ?></span>
            <form method="post" action="logout.php">
                <?= csrf_field() ?>
                <button class="button button-quiet" type="submit">Keluar</button>
            </form>
        </div>
    </header>
    <main class="container">
        <?php if ($flash !== null): ?>
            <div class="alert alert-<?= e($flash['type']) ?>" role="status"><?= e($flash['message']) ?></div>
        <?php endif; ?>
        <div class="page-heading"><div><p class="eyebrow">MANAJEMEN MASJID</p><h1><?= e($title) ?></h1></div></div>
    <?php
}

function page_end(): void
{
    ?>
    </main>
    <footer class="footer">Masjid Baitu Taqwa <span>·</span> Portal internal DKM</footer>
    </body>
    </html>
    <?php
}
