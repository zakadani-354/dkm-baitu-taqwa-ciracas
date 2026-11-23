<?php
declare(strict_types=1);

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function redirect(string $path): never
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        session_write_close();
    }
    header('Location: ' . $path);
    exit;
}

function require_login(): void
{
    if (!isset($_SESSION['user_id'])) {
        flash('error', 'Silakan login untuk melanjutkan.');
        redirect('login.php');
    }
}

function require_admin(): void
{
    require_login();
    $statement = db()->prepare('SELECT role FROM users WHERE id = :id');
    $statement->execute(['id' => (int) $_SESSION['user_id']]);
    $user = $statement->fetch();
    if (!$user || $user['role'] !== 'admin') {
        flash('error', 'Akses ditolak. Admin saja yang bisa mengelola data.');
        redirect('dashboard.php');
    }
}

function csrf_field(): string
{
    return '<input type="hidden" name="csrf_token" value="' . e($_SESSION['csrf_token'] ?? '') . '">';
}

function verify_csrf(): void
{
    $token = $_POST['csrf_token'] ?? '';
    if (!is_string($token) || !hash_equals($_SESSION['csrf_token'] ?? '', $token)) {
        http_response_code(403);
        exit('Permintaan tidak valid. Muat ulang halaman dan coba kembali.');
    }
}

function flash(string $type, string $message): void
{
    $_SESSION['flash'] = ['type' => $type, 'message' => $message];
}

function take_flash(): ?array
{
    $message = $_SESSION['flash'] ?? null;
    unset($_SESSION['flash']);
    return is_array($message) ? $message : null;
}

function valid_date(string $date): bool
{
    $parsed = DateTime::createFromFormat('!Y-m-d', $date);
    return $parsed !== false && $parsed->format('Y-m-d') === $date;
}

function valid_month(string $month): bool
{
    return preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $month) === 1;
}
