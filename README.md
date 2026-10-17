# Portal Pengurus Masjid Baitu Taqwa

Aplikasi PHP native untuk autentikasi pengurus, data jamaah, presensi, grafik dashboard, serta manajemen kegiatan dan ceklist bulanan. Contoh ini menggunakan PHP 8.1+, PDO, dan ekstensi `mbstring`; MySQL 8+ serta PostgreSQL (termasuk Supabase) didukung.

## Struktur proyek

```text
app/
  bootstrap.php        Inisialisasi session dan helper aplikasi
  helpers.php          Escape output, CSRF, autentikasi, dan validasi tanggal
  layout.php           Layout bersama halaman yang memerlukan login
config/
  database.php         Koneksi PDO dari environment
database/
  schema.sql           Skema MySQL
  schema.postgres.sql  Skema PostgreSQL / Supabase
  vercel_sessions.sql  Tabel sesi MySQL
  vercel_sessions.postgres.sql  Tabel sesi PostgreSQL / Supabase
public/
  assets/css/app.css   Gaya antarmuka responsif
  assets/js/dashboard.js  Grafik Chart.js
  index.php            Pengarah halaman awal
  login.php            Form login
  logout.php           Logout POST dengan perlindungan CSRF
  dashboard.php        Statistik dan grafik presensi
  jamaah.php           CRUD data jamaah
  presensi.php         Form dan daftar presensi
  kegiatan.php         Tambah dan aktif/nonaktif kegiatan
  ceklist.php          Ceklist status per bulan
scripts/
  create_admin.php     Pembuatan akun admin melalui CLI
api/
  *.php                Entrypoint fungsi Vercel yang meneruskan ke public/
```

## Menjalankan aplikasi

1. Impor `database/schema.sql` ke MySQL 8+ atau `database/schema.postgres.sql` ke PostgreSQL.
2. Atur environment koneksi `DB_DRIVER`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD`. Gunakan `DB_DRIVER=mysql` untuk MySQL atau `DB_DRIVER=pgsql` untuk PostgreSQL. Nilai default lokal MySQL: `127.0.0.1:3306`, database `masjid_baitu_taqwa`, user `root`, password kosong.
3. Dari root proyek, buat akun pengurus:

   ```text
   php scripts/create_admin.php admin
   ```

   Masukkan nama tampilan dan kata sandi minimal 12 karakter saat diminta. Kata sandi disimpan menggunakan `password_hash()`.
4. Jalankan server lokal dengan document root pada folder `public/`:

   ```text
   php -S localhost:8000 -t public
   ```

5. Buka `http://localhost:8000` dan masuk dengan akun yang dibuat.

Gunakan HTTPS di deployment. Cookie session ditandai `Secure` otomatis ketika HTTPS terdeteksi, serta selalu `HttpOnly` dan `SameSite=Lax`. Pastikan `display_errors=Off` dan logging PHP aktif di production. Chart.js dan font antarmuka dimuat dari CDN, sehingga browser memerlukan akses internet untuk aset tersebut.

## Deployment ke Vercel

Proyek menggunakan runtime PHP komunitas `vercel-php` karena PHP bukan runtime resmi Vercel. Entrypoint fungsi berada di `api/`, lalu meneruskan permintaan ke halaman yang sudah ada di `public/`. Database harus dapat diakses dari jaringan Vercel.

1. Impor repository GitHub `zakadani-354/dkm-baitu-taqwa-ciracas` sebagai proyek baru di Vercel.
2. Jalankan skema yang cocok pada database online jika tabel aplikasi belum dibuat:
   - MySQL: `database/schema.sql`, lalu `database/vercel_sessions.sql`.
   - PostgreSQL / Supabase: `database/schema.postgres.sql`, lalu `database/vercel_sessions.postgres.sql`.
3. Tambahkan environment variables berikut pada pengaturan proyek Vercel untuk Production dan Preview:
   - `DB_DRIVER` (`mysql` atau `pgsql`)
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
4. Untuk Supabase, gunakan **Session Pooler** pada halaman Connect proyek, bukan alamat `db.<project-ref>.supabase.co` jika koneksi langsung menghasilkan `Cannot assign requested address`. Masukkan host dan port pooler yang ditampilkan Supabase, set `DB_DRIVER=pgsql`, `DB_NAME=postgres`, dan `DB_USER=postgres.<project-ref>`. Koneksi PostgreSQL memakai SSL `require`. Jangan gunakan Transaction Pooler karena penyimpanan sesi aplikasi memakai advisory lock PostgreSQL.
5. Deploy ulang setelah environment variables tersimpan.
6. Buat akun admin menggunakan `scripts/create_admin.php` dari lingkungan CLI yang terhubung ke database yang sama, lalu buka domain deployment Vercel.

Jangan masukkan kredensial database ke GitHub atau ke dalam chat. Simpan hanya pada Vercel Project Settings → Environment Variables. Runtime PHP untuk deployment ini dikelola komunitas, bukan runtime resmi yang dikembangkan Vercel.

## Keamanan dan skema

- Semua query aplikasi menggunakan PDO prepared statements dengan emulasi prepare dinonaktifkan.
- Login memakai `password_verify()` (hash dibuat oleh `password_hash()`), regenerasi ID session setelah autentikasi, dan pesan kegagalan yang tidak mengungkap apakah username ada.
- Operasi perubahan data memakai token CSRF; output pengguna di-escape saat dirender.
- Presensi memiliki batasan unik jamaah/tanggal/jenis pengajian untuk mencegah catatan ganda.
- Jamaah yang dihapus dari daftar aktif diarsipkan, bukan dihapus permanen, sehingga histori presensi tetap utuh; jamaah yang diarsipkan dapat diaktifkan kembali. Jamaah nonaktif tidak muncul pada pilihan input presensi. Kegiatan juga dapat dinonaktifkan agar tidak masuk ke ceklist bulan berikutnya.
- Pengguna baru hanya dapat dibuat melalui script CLI, bukan form web publik.

Kategori jamaah, status, dan jenis pengajian dibatasi oleh skema database: menggunakan ENUM di MySQL serta CHECK constraint di PostgreSQL. Sesuaikan batasan skema melalui migrasi SQL bila kategori resmi masjid berubah.
