<?php
declare(strict_types=1);

final class DatabaseSessionHandler implements SessionHandlerInterface, SessionUpdateTimestampHandlerInterface
{
    private ?string $lockedSessionId = null;

    public function open(string $path, string $name): bool
    {
        return true;
    }

    public function close(): bool
    {
        $this->releaseLock();
        return true;
    }

    public function read(string $id): string|false
    {
        $this->acquireLock($id);

        try {
            $statement = db()->prepare(
                'SELECT session_data FROM app_sessions WHERE session_id = :session_id AND expires_at > :now'
            );
            $statement->execute(['session_id' => $id, 'now' => time()]);
            $data = $statement->fetchColumn();

            if (!is_string($data)) {
                return '';
            }

            $decoded = base64_decode($data, true);
            return ($decoded !== false && base64_encode($decoded) === $data) ? $decoded : $data;
        } catch (\Throwable $e) {
            error_log('Session read error: ' . $e->getMessage());
            return '';
        }
    }

    public function write(string $id, string $data): bool
    {
        $this->acquireLock($id);

        try {
            $expiresAt = time() + max(1, (int) ini_get('session.gc_maxlifetime'));
            $sql = db_driver() === 'pgsql'
                ? 'INSERT INTO app_sessions (session_id, session_data, expires_at)
                   VALUES (:session_id, :session_data, :expires_at)
                   ON CONFLICT (session_id) DO UPDATE
                   SET session_data = EXCLUDED.session_data, expires_at = EXCLUDED.expires_at'
                : 'INSERT INTO app_sessions (session_id, session_data, expires_at)
                   VALUES (:session_id, :session_data, :expires_at)
                   ON DUPLICATE KEY UPDATE session_data = :updated_data, expires_at = :updated_expires_at';
            $statement = db()->prepare($sql);
            $encoded = base64_encode($data);
            $parameters = [
                'session_id' => $id,
                'session_data' => $encoded,
                'expires_at' => $expiresAt,
            ];
            if (db_driver() === 'mysql') {
                $parameters['updated_data'] = $encoded;
                $parameters['updated_expires_at'] = $expiresAt;
            }
            $statement->execute($parameters);

            return true;
        } catch (\Throwable $e) {
            error_log('Session write error: ' . $e->getMessage());
            return false;
        }
    }

    public function destroy(string $id): bool
    {
        try {
            $statement = db()->prepare('DELETE FROM app_sessions WHERE session_id = :session_id');
            $statement->execute(['session_id' => $id]);
        } catch (\Throwable $e) {
            error_log('Session destroy error: ' . $e->getMessage());
        }

        if ($this->lockedSessionId === $id) {
            $this->releaseLock();
        }

        return true;
    }

    public function gc(int $maxLifetime): int|false
    {
        try {
            $statement = db()->prepare('DELETE FROM app_sessions WHERE expires_at <= :now');
            $statement->execute(['now' => time()]);

            return $statement->rowCount();
        } catch (\Throwable $e) {
            error_log('Session gc error: ' . $e->getMessage());
            return false;
        }
    }

    public function validateId(string $id): bool
    {
        try {
            $statement = db()->prepare(
                'SELECT 1 FROM app_sessions WHERE session_id = :session_id AND expires_at > :now'
            );
            $statement->execute(['session_id' => $id, 'now' => time()]);
            return $statement->fetchColumn() !== false;
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function updateTimestamp(string $id, string $data): bool
    {
        try {
            $expiresAt = time() + max(1, (int) ini_get('session.gc_maxlifetime'));
            $statement = db()->prepare(
                'UPDATE app_sessions SET expires_at = :expires_at WHERE session_id = :session_id'
            );
            $statement->execute(['expires_at' => $expiresAt, 'session_id' => $id]);

            return true;
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function acquireLock(string $id): bool
    {
        if ($this->lockedSessionId === $id) {
            return true;
        }
        if ($this->lockedSessionId !== null) {
            $this->releaseLock();
        }

        try {
            if (db_driver() === 'pgsql') {
                $lockKey = (int) (hexdec(substr(hash('sha256', $id), 0, 15)) & 0x7FFFFFFFFFFFFFFF);
                $statement = db()->prepare('SELECT pg_try_advisory_lock(:lock_key)');
                $statement->execute(['lock_key' => $lockKey]);
            } else {
                $lockName = 'dkm_session_' . substr(hash('sha256', $id), 0, 48);
                $statement = db()->prepare('SELECT GET_LOCK(:lock_name, 5)');
                $statement->execute(['lock_name' => $lockName]);
            }
            $locked = $statement->fetchColumn();

            if (!in_array($locked, [true, 1, '1', 't'], true)) {
                return false;
            }

            $this->lockedSessionId = $id;
            return true;
        } catch (\Throwable $e) {
            // Advisory lock failure (e.g. unsupported pooler mode) should not block session
            error_log('Session lock warning: ' . $e->getMessage());
            return false;
        }
    }

    private function releaseLock(): void
    {
        if ($this->lockedSessionId === null) {
            return;
        }

        try {
            if (db_driver() === 'pgsql') {
                $lockKey = (int) (hexdec(substr(hash('sha256', $this->lockedSessionId), 0, 15)) & 0x7FFFFFFFFFFFFFFF);
                $statement = db()->prepare('SELECT pg_advisory_unlock(:lock_key)');
                $statement->execute(['lock_key' => $lockKey]);
            } else {
                $lockName = 'dkm_session_' . substr(hash('sha256', $this->lockedSessionId), 0, 48);
                $statement = db()->prepare('SELECT RELEASE_LOCK(:lock_name)');
                $statement->execute(['lock_name' => $lockName]);
            }
        } catch (\Throwable $e) {
            error_log('Session unlock warning: ' . $e->getMessage());
        } finally {
            $this->lockedSessionId = null;
        }
    }
}
