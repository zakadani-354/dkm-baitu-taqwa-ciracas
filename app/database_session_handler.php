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
        if (!$this->acquireLock($id)) {
            return false;
        }

        $statement = db()->prepare(
            'SELECT session_data FROM app_sessions WHERE session_id = :session_id AND expires_at > :now'
        );
        $statement->execute(['session_id' => $id, 'now' => time()]);
        $data = $statement->fetchColumn();

        return is_string($data) ? $data : '';
    }

    public function write(string $id, string $data): bool
    {
        if (!$this->acquireLock($id)) {
            return false;
        }

        $expiresAt = time() + max(1, (int) ini_get('session.gc_maxlifetime'));
        $statement = db()->prepare(
            'INSERT INTO app_sessions (session_id, session_data, expires_at)
             VALUES (:session_id, :session_data, :expires_at)
             ON DUPLICATE KEY UPDATE session_data = :updated_data, expires_at = :updated_expires_at'
        );
        $statement->execute([
            'session_id' => $id,
            'session_data' => $data,
            'expires_at' => $expiresAt,
            'updated_data' => $data,
            'updated_expires_at' => $expiresAt,
        ]);

        return true;
    }

    public function destroy(string $id): bool
    {
        $statement = db()->prepare('DELETE FROM app_sessions WHERE session_id = :session_id');
        $statement->execute(['session_id' => $id]);

        if ($this->lockedSessionId === $id) {
            $this->releaseLock();
        }

        return true;
    }

    public function gc(int $maxLifetime): int|false
    {
        $statement = db()->prepare('DELETE FROM app_sessions WHERE expires_at <= :now');
        $statement->execute(['now' => time()]);

        return $statement->rowCount();
    }

    public function validateId(string $id): bool
    {
        if (!$this->acquireLock($id)) {
            return false;
        }

        $statement = db()->prepare(
            'SELECT 1 FROM app_sessions WHERE session_id = :session_id AND expires_at > :now'
        );
        $statement->execute(['session_id' => $id, 'now' => time()]);
        $valid = $statement->fetchColumn() !== false;

        if (!$valid) {
            $this->releaseLock();
        }

        return $valid;
    }

    public function updateTimestamp(string $id, string $data): bool
    {
        if (!$this->acquireLock($id)) {
            return false;
        }

        $expiresAt = time() + max(1, (int) ini_get('session.gc_maxlifetime'));
        $statement = db()->prepare(
            'UPDATE app_sessions SET expires_at = :expires_at WHERE session_id = :session_id'
        );
        $statement->execute(['expires_at' => $expiresAt, 'session_id' => $id]);

        return true;
    }

    private function acquireLock(string $id): bool
    {
        if ($this->lockedSessionId === $id) {
            return true;
        }
        if ($this->lockedSessionId !== null) {
            $this->releaseLock();
        }

        $lockName = 'dkm_session_' . substr(hash('sha256', $id), 0, 48);
        $statement = db()->prepare('SELECT GET_LOCK(:lock_name, 5)');
        $statement->execute(['lock_name' => $lockName]);
        $locked = $statement->fetchColumn();

        if ($locked !== 1 && $locked !== '1') {
            return false;
        }

        $this->lockedSessionId = $id;
        return true;
    }

    private function releaseLock(): void
    {
        if ($this->lockedSessionId === null) {
            return;
        }

        $lockName = 'dkm_session_' . substr(hash('sha256', $this->lockedSessionId), 0, 48);
        $statement = db()->prepare('SELECT RELEASE_LOCK(:lock_name)');
        $statement->execute(['lock_name' => $lockName]);
        $this->lockedSessionId = null;
    }
}
