<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';
if (isset($_SESSION['user_id'])) {
    redirect('dashboard.php');
}

$error = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf();
    $username = trim((string) ($_POST['username'] ?? ''));
    $password = (string) ($_POST['password'] ?? '');

    try {
        $statement = db()->prepare('SELECT id, username, password_hash, nama FROM users WHERE username = :username LIMIT 1');
        $statement->execute(['username' => $username]);
        $user = $statement->fetch();

        if ($user !== false && password_verify($password, $user['password_hash'])) {
            if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
                $update = db()->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
                $update->execute([
                    'hash' => password_hash($password, PASSWORD_DEFAULT),
                    'id' => $user['id'],
                ]);
            }
            session_regenerate_id(true);
            $_SESSION['user_id'] = (int) $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['nama'] = $user['nama'];
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            redirect('dashboard.php');
        }

        $error = 'Nama pengguna atau kata sandi tidak sesuai.';
    } catch (\Throwable $e) {
        $error = 'Gagal terhubung ke database. Periksa konfigurasi koneksi atau skema database.';
        error_log('Login error: ' . $e->getMessage());
    }
}
?>
<!doctype html>
<html lang="id">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Login · Masjid Baitu Taqwa</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body class="login-page">
<main class="login-card">
    <a class="brand login-brand" href="index.php"><span class="brand-mark">BT</span><span>Masjid Baitu Taqwa<small>Portal pengurus DKM</small></span></a>
    <p class="eyebrow">SELAMAT DATANG</p>
    <h1>Masuk ke dashboard</h1>
    <p class="muted">Gunakan akun pengurus yang telah terdaftar.</p>
    <?php if ($error !== null): ?><div class="alert alert-error" role="alert"><?= e($error) ?></div><?php endif; ?>
    <?php $flash = take_flash(); if ($flash !== null): ?><div class="alert alert-<?= e($flash['type']) ?>" role="status"><?= e($flash['message']) ?></div><?php endif; ?>
    <form method="post" action="login.php" class="form-stack">
        <?= csrf_field() ?>
        <label>Nama pengguna<input name="username" autocomplete="username" required maxlength="50" autofocus></label>
        <label>Kata sandi<input type="password" name="password" autocomplete="current-password" required></label>
        <button class="button button-primary button-wide" type="submit">Masuk</button>
    </form>
</main>
</body>
</html>
