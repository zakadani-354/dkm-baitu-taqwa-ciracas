CREATE TABLE app_sessions (
    session_id VARCHAR(128) PRIMARY KEY,
    session_data TEXT NOT NULL,
    expires_at BIGINT NOT NULL
);
CREATE INDEX idx_app_sessions_expires_at ON app_sessions (expires_at);
