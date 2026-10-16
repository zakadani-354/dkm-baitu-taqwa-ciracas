<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/config/database.php';

$username = trim((string) ($argv[1] ?? ''));
if ($username === '' || strlen($username) > 50) {
    fwrite(STDERR, "Penggunaan: php scripts/create_admin.php <username>\n");
    exit(1);
}
fwrite(STDOUT, 'Nama admin: ');
$name = trim((string) fgets(STDIN));
fwrite(STDOUT, 'Kata sandi (minimal 12 karakter): ');
$password = rtrim((string) fgets(STDIN), "\r\n");
if (mb_strlen($name) < 1 || mb_strlen($name) > 120 || strlen($password) < 12) {
    fwrite(STDERR, "Nama tidak valid atau kata sandi kurang dari 12 karakter.\n");
    exit(1);
}

$statement = db()->prepare(
    "INSERT INTO users (username, password_hash, nama, role)
     VALUES (:username, :password_hash, :nama, 'admin')"
);
$statement->execute([
    'username' => $username,
    'password_hash' => password_hash($password, PASSWORD_DEFAULT),
    'nama' => $name,
]);
fwrite(STDOUT, "Akun admin berhasil dibuat.\n");
