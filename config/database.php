<?php
declare(strict_types=1);

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $host = getenv('DB_HOST') ?: '127.0.0.1';
    $user = getenv('DB_USER') ?: 'root';
    $driver = db_driver();
    if (!in_array($driver, ['mysql', 'pgsql'], true)) {
        throw new RuntimeException('DB_DRIVER harus bernilai mysql atau pgsql.');
    }

    $port = getenv('DB_PORT') ?: ($driver === 'pgsql' ? '5432' : '3306');
    $name = getenv('DB_NAME') ?: 'masjid_baitu_taqwa';
    $password = getenv('DB_PASSWORD') ?: '';

    $dsn = $driver === 'pgsql'
        ? sprintf('pgsql:host=%s;port=%s;dbname=%s;sslmode=require', $host, $port, $name)
        : sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);
    $pdo = new PDO($dsn, $user, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function db_driver(): string
{
    $user = getenv('DB_USER') ?: 'root';
    $host = getenv('DB_HOST') ?: '127.0.0.1';

    return strtolower(getenv('DB_DRIVER') ?: (
        str_starts_with($user, 'postgres') || str_ends_with($host, '.supabase.co') ? 'pgsql' : 'mysql'
    ));
}
