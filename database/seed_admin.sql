-- ========================================================
-- Script Pembuatan Akun Admin Awal (MySQL)
-- ========================================================
-- Kredensial default:
--   Username : admin
--   Password : Admin12345678!
-- ========================================================

USE masjid_baitu_taqwa;

INSERT INTO users (username, password_hash, nama, role)
VALUES (
    'admin',
    '$2y$10$axouE13.jkrD8gKCX3UazuEYHomnabF/Qglai1rzXWqkGzmcHYJWG',
    'Administrator Masjid',
    'admin'
)
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    nama = VALUES(nama),
    role = VALUES(role);

