# Portal Pengurus Masjid Baitu Taqwa

Aplikasi PHP native untuk autentikasi pengurus, data jamaah, presensi, grafik dashboard, serta manajemen kegiatan dan ceklist bulanan. Contoh ini menggunakan PHP 8.1+, MySQL 8+, PDO MySQL, dan ekstensi `mbstring`.

## Struktur proyek

```text
app/
  bootstrap.php        Inisialisasi session dan helper aplikasi
  helpers.php          Escape output, CSRF, autentikasi, dan validasi tanggal
  layout.php           Layout bersama halaman yang memerlukan login
config/
  database.php         Koneksi PDO dari environment
database/
  schema.sql           DDL, relasi, indeks, dan batasan unik
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

1. Impor `database/schema.sql` ke MySQL 8+.
2. Atur environment koneksi database `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, dan `DB_PASSWORD`. Nilai default untuk database lokal: `127.0.0.1:3306`, database `masjid_baitu_taqwa`, user `root`, password kosong.
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

Proyek menggunakan runtime PHP komunitas `vercel-php` karena PHP bukan runtime resmi Vercel. Entrypoint fungsi berada di `api/`, lalu meneruskan permintaan ke halaman yang sudah ada di `public/`. Koneksi MySQL harus dapat diakses dari jaringan Vercel.

1. Impor repository GitHub `zakadani-354/dkm-baitu-taqwa-ciracas` sebagai proyek baru di Vercel.
2. Jalankan `database/schema.sql` pada database MySQL online jika tabel aplikasi belum dibuat.
3. Jalankan `database/vercel_sessions.sql` satu kali pada database yang sama. Tabel ini menyimpan sesi lintas fungsi dan instance serverless.
4. Tambahkan environment variables berikut pada pengaturan proyek Vercel untuk Production dan Preview:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_NAME`
   - `DB_USER`
   - `DB_PASSWORD`
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

Kategori jamaah dan jenis pengajian menggunakan ENUM yang ditentukan pada skema. Sesuaikan keduanya melalui migrasi SQL bila kategori resmi masjid berubah.
