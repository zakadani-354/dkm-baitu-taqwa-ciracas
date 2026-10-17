<?php
declare(strict_types=1);

function get_db_config(): array
{
    $url = getenv('DATABASE_URL') ?: (getenv('POSTGRES_URL') ?: getenv('SUPABASE_DB_URL'));
    $urlConfig = [];
    if (!empty($url)) {
        $parsed = parse_url($url);
        if ($parsed !== false) {
            $scheme = strtolower($parsed['scheme'] ?? '');
            if (in_array($scheme, ['postgres', 'postgresql', 'pgsql'], true)) {
                $urlConfig['driver'] = 'pgsql';
            } elseif (in_array($scheme, ['mysql'], true)) {
                $urlConfig['driver'] = 'mysql';
            }
            if (isset($parsed['host'])) {
                $urlConfig['host'] = $parsed['host'];
            }
            if (isset($parsed['port'])) {
                $urlConfig['port'] = (string) $parsed['port'];
            }
            if (isset($parsed['user'])) {
                $urlConfig['user'] = urldecode($parsed['user']);
            }
            if (isset($parsed['pass'])) {
                $urlConfig['password'] = urldecode($parsed['pass']);
            }
            if (isset($parsed['path'])) {
                $urlConfig['name'] = ltrim($parsed['path'], '/');
            }
            if (isset($parsed['query'])) {
                parse_str($parsed['query'], $query);
                if (isset($query['sslmode'])) {
                    $urlConfig['sslmode'] = $query['sslmode'];
                }
            }
        }
    }

    $driver = getenv('DB_DRIVER') ?: ($urlConfig['driver'] ?? null);
    $host = getenv('DB_HOST') ?: (getenv('POSTGRES_HOST') ?: ($urlConfig['host'] ?? '127.0.0.1'));
    $user = getenv('DB_USER') ?: (getenv('POSTGRES_USER') ?: ($urlConfig['user'] ?? 'root'));
    $password = getenv('DB_PASSWORD') !== false && getenv('DB_PASSWORD') !== null
        ? getenv('DB_PASSWORD')
        : (getenv('POSTGRES_PASSWORD') !== false && getenv('POSTGRES_PASSWORD') !== null
            ? getenv('POSTGRES_PASSWORD')
            : ($urlConfig['password'] ?? ''));
    $name = getenv('DB_NAME') ?: (getenv('POSTGRES_DATABASE') ?: ($urlConfig['name'] ?? 'masjid_baitu_taqwa'));

    if ($driver === null) {
        $driver = (str_starts_with($user, 'postgres') || str_contains($host, 'supabase') || str_contains($host, 'postgres'))
            ? 'pgsql'
            : 'mysql';
    }
    $driver = strtolower($driver);
    if (!in_array($driver, ['mysql', 'pgsql'], true)) {
        throw new RuntimeException('DB_DRIVER harus bernilai mysql atau pgsql.');
    }

    $port = getenv('DB_PORT') ?: (getenv('POSTGRES_PORT') ?: ($urlConfig['port'] ?? ($driver === 'pgsql' ? '5432' : '3306')));
    $sslmode = getenv('DB_SSLMODE') ?: ($urlConfig['sslmode'] ?? ($driver === 'pgsql' && !in_array($host, ['127.0.0.1', 'localhost'], true) ? 'require' : 'prefer'));

    return [
        'driver' => $driver,
        'host' => $host,
        'port' => (string) $port,
        'name' => $name,
        'user' => $user,
        'password' => $password,
        'sslmode' => $sslmode,
    ];
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $cfg = get_db_config();
    $dsn = $cfg['driver'] === 'pgsql'
        ? sprintf('pgsql:host=%s;port=%s;dbname=%s;sslmode=%s', $cfg['host'], $cfg['port'], $cfg['name'], $cfg['sslmode'])
        : sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'], $cfg['name']);
    $pdo = new PDO($dsn, $cfg['user'], $cfg['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    return $pdo;
}

function db_driver(): string
{
    return get_db_config()['driver'];
}
