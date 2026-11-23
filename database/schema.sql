CREATE DATABASE IF NOT EXISTS masjid_baitu_taqwa
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE masjid_baitu_taqwa;

CREATE TABLE users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nama VARCHAR(120) NOT NULL,
    role ENUM('admin', 'pengurus') NOT NULL DEFAULT 'pengurus',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

CREATE TABLE jamaah (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nama VARCHAR(120) NOT NULL,
    kategori ENUM('Umum', 'Generus', 'Ibu-ibu') NOT NULL,
    alamat VARCHAR(500) NULL,
    no_telepon VARCHAR(30) NULL,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_jamaah_nama (nama),
    KEY idx_jamaah_kategori (kategori),
    KEY idx_jamaah_aktif (aktif)
) ENGINE=InnoDB;

CREATE TABLE presensi (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    jamaah_id BIGINT UNSIGNED NOT NULL,
    tanggal DATE NOT NULL,
    status ENUM('Hadir', 'Izin', 'Alpa') NOT NULL,
    jenis_pengajian ENUM('Pengajian Umum', 'Pengajian Generus', 'Pengajian Ibu-ibu') NOT NULL,
    dicatat_oleh BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_presensi_jamaah_acara (jamaah_id, tanggal, jenis_pengajian),
    KEY idx_presensi_tanggal_jenis (tanggal, jenis_pengajian),
    CONSTRAINT fk_presensi_jamaah FOREIGN KEY (jamaah_id)
        REFERENCES jamaah (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_presensi_user FOREIGN KEY (dicatat_oleh)
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE kegiatan (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nama VARCHAR(160) NOT NULL,
    deskripsi VARCHAR(500) NULL,
    aktif TINYINT(1) NOT NULL DEFAULT 1,
    dibuat_oleh BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_kegiatan_nama (nama),
    KEY idx_kegiatan_aktif (aktif),
    CONSTRAINT fk_kegiatan_user FOREIGN KEY (dibuat_oleh)
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE ceklist (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    kegiatan_id BIGINT UNSIGNED NOT NULL,
    bulan DATE NOT NULL COMMENT 'Selalu tanggal pertama pada bulan yang dipilih',
    status ENUM('Belum Selesai', 'Selesai') NOT NULL DEFAULT 'Belum Selesai',
    diperbarui_oleh BIGINT UNSIGNED NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_ceklist_kegiatan_bulan (kegiatan_id, bulan),
    KEY idx_ceklist_bulan (bulan),
    CONSTRAINT fk_ceklist_kegiatan FOREIGN KEY (kegiatan_id)
        REFERENCES kegiatan (id) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ceklist_user FOREIGN KEY (diperbarui_oleh)
        REFERENCES users (id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;
