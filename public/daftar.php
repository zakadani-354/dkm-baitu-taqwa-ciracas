<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');
    $confirm = (string) ($_POST['confirm_password'] ?? '');

    if ($password !== $confirm) {
        $error = 'Konfirmasi kata sandi tidak cocok.';
    } elseif (mb_strlen($password) < 12) {
        $error = 'Kata sandi minimal 12 karakter.';
    } elseif (mb_strlen($username) > 50) {
        $error = 'Nama pengguna maksimal 50 karakter.';
    } else {
        try {
            $check = db()->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
            $check->execute(['username' => $username]);
            if ($check->fetch()) {
                $error = 'Nama pengguna sudah digunakan. Pilih yang lain.';
            } else {
                $hash = password_hash($password, PASSWORD_DEFAULT);
                $stmt = db()->prepare('INSERT INTO users (username, password_hash, nama, role, created_at) VALUES (:username, :hash, :nama, :role, :created)');
                $stmt->execute([
                    'username' => $username,
                    'hash' => $hash,
                    'nama' => $username,
                    'role' => 'admin',
                    'created' => date('Y-m-d H:i:s'),
                ]);
                flash('success', 'Akun berhasil dibuat. Silakan login.');
                redirect('login.php');
            }
        } catch (\Throwable $e) {
            $error = 'Gagal terhubung ke database: ' . $e->getMessage();
            error_log('Daftar error: ' . $e->getMessage());
        }
    }
}
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Daftar · Masjid Baitu Taqwa</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body class="login-page">
<main class="login-card">
    <a class="brand login-brand" href="index.php"><span class="brand-mark">BT</span><span>Masjid Baitu Taqwa<small>Portal pengurus DKM</small></span></a>
    <p class="eyebrow">DAFTAR</p>
    <h1>Buat akun baru</h1>
    <p class="muted">Daftar sebagai admin agar bisa mengelola data masjid.</p>
    <?php if ($error !== null): ?><div class="alert alert-error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <?php $flash = take_flash(); if ($flash !== null): ?><div class="alert alert-success" role="status"><?= e($flash['message']) ?></div><?php endif; ?>
    <form method="post" action="daftar.php" class="form-stack">
        <?= csrf_field() ?>
        <label>Nama pengguna<input name="username" autocomplete="username" required maxlength="50" autofocus></label>
        <label>Kata sandi<input type="password" name="password" autocomplete="new-password" required minlength="12"></label>
        <label>Konfirmasi kata sandi<input type="password" name="confirm_password" autocomplete="new-password" required minlength="12"></label>
        <button class="button button-primary button-wide" type="submit">Daftar</button>
    </form>
    <p class="signup-link">Sudah punya akun? <a href="login.php">Login di sini</a></p>
</main>
</body>
</html>