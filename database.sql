create extension if not exists "pgcrypto";

create table if not exists profil_masjid (
  id uuid primary key default gen_random_uuid(),
  nama_masjid text not null,
  alamat text,
  logo_url text,
  foto_masjid_url text
);

create table if not exists akun_pengguna (
  id uuid primary key default gen_random_uuid(),
  nama_lengkap text not null,
  username text unique not null,
  password text not null,
  role text not null check (role in ('admin','pengurus')),
  created_at timestamptz default now()
);

create table if not exists jamaah (
  id uuid primary key default gen_random_uuid(),
  nama_lengkap text not null,
  tempat_lahir text,
  tanggal_lahir date,
  jenis_kelamin text,
  status_keluarga text,
  status_pernikahan text check (status_pernikahan in ('Janda','Duda','Kawin','Belum Kawin')),
  umur int,
  kelompok_umur text check (kelompok_umur in ('PAUD','SD','SMP','SMA','Pra Nikah','Dewasa')),
  status_nikah text check (status_nikah in ('Menikah','Belum Menikah')),
  pekerjaan text,
  penghasilan text,
  created_at timestamptz default now()
);

create table if not exists presensi_sesi (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis_pengajian text not null check (jenis_pengajian in ('Pengajian Umum','Pengajian Ibu-Ibu','Pembinaan Generus')),
  kelas_generus text check (kelas_generus in ('SMP','SMA','PN')),
  is_hasda boolean default false,
  created_at timestamptz default now()
);

create table if not exists presensi_detail (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references presensi_sesi(id) on delete cascade,
  jamaah_id uuid not null references jamaah(id) on delete cascade,
  status text not null check (status in ('Hadir','Tidak Hadir','Izin'))
);

create table if not exists materi_pengajian (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis_pengajian text not null,
  kelas_generus text,
  judul_materi text not null,
  pemateri text,
  ringkasan text,
  created_at timestamptz default now()
);

create table if not exists program_masjid (
  id uuid primary key default gen_random_uuid(),
  judul_program text not null,
  tanggal date not null,
  waktu_mulai time,
  waktu_selesai time,
  penanggung_jawab text,
  keterangan text,
  created_at timestamptz default now()
);

alter table profil_masjid enable row level security;
alter table akun_pengguna enable row level security;
alter table jamaah enable row level security;
alter table presensi_sesi enable row level security;
alter table presensi_detail enable row level security;
alter table materi_pengajian enable row level security;
alter table program_masjid enable row level security;

create policy "public_profile_read" on profil_masjid for select using (true);
create policy "public_profile_write" on profil_masjid for all using (true) with check (true);
create policy "accounts_public_read" on akun_pengguna for select using (true);
create policy "accounts_admin_write" on akun_pengguna for all using (true) with check (true);
create policy "jamaah_public_read" on jamaah for select using (true);
create policy "jamaah_app_write" on jamaah for all using (true) with check (true);
create policy "presensi_public_read" on presensi_sesi for select using (true);
create policy "presensi_app_write" on presensi_sesi for all using (true) with check (true);
create policy "presensi_detail_public_read" on presensi_detail for select using (true);
create policy "presensi_detail_app_write" on presensi_detail for all using (true) with check (true);
create policy "materi_public_read" on materi_pengajian for select using (true);
create policy "materi_app_write" on materi_pengajian for all using (true) with check (true);
create policy "program_public_read" on program_masjid for select using (true);
create policy "program_app_write" on program_masjid for all using (true) with check (true);

insert into profil_masjid (nama_masjid, alamat)
select 'Masjid Baitut Taqwa', 'Jl. Raya Masjid Baitut Taqwa, Ciracas, Jakarta Timur'
where not exists (select 1 from profil_masjid);

insert into akun_pengguna (nama_lengkap, username, password, role)
values
  ('Administrator', 'admin', 'admin123', 'admin'),
  ('Pengurus Masjid', 'pengurus', 'pengurus123', 'pengurus')
on conflict (username) do nothing;
