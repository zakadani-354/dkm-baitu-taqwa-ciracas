-- ========================================================
-- Script Pembuatan Akun Admin Awal (PostgreSQL / Supabase)
-- ========================================================
-- Kredensial default:
--   Username : admin
--   Password : Admin12345678!
-- ========================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (username, password_hash, nama, role)
VALUES (
    'admin',
    crypt('Admin12345678!', gen_salt('bf', 10)),
    'Administrator Masjid',
    'admin'
)
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    nama = EXCLUDED.nama,
    role = EXCLUDED.role;

