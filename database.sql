-- DKM Masjid Baitu Taqwa - run in the Supabase SQL Editor.
-- Initial passwords are admin123 and pengurus123. Change them immediately.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profil_masjid (
  id uuid primary key default gen_random_uuid(),
  nama_masjid text not null default 'Masjid Baitu Taqwa',
  alamat text not null default '',
  logo_url text,
  foto_masjid_url text
);

-- Authentication is handled by Supabase Auth. `password` is a private bcrypt
-- hash for the requested account schema; it is never selectable by clients.
create table if not exists public.akun_pengguna (
  id uuid primary key references auth.users(id) on delete cascade,
  nama_lengkap text not null,
  username text not null unique,
  password text not null,
  role text not null check (role in ('admin','pengurus')),
  created_at timestamptz not null default now()
);

create table if not exists public.jamaah (
  id uuid primary key default gen_random_uuid(),
  nama_lengkap text not null,
  tempat_lahir text,
  tanggal_lahir date,
  jenis_kelamin text check (jenis_kelamin in ('Laki-laki','Perempuan')),
  status_keluarga text check (status_keluarga in ('Kepala Keluarga','Istri','Anak','Famili Lain')),
  status_pernikahan text check (status_pernikahan in ('Janda','Duda','Kawin','Belum Kawin')),
  umur int check (umur is null or umur >= 0),
  kelompok_umur text check (kelompok_umur in (
    'Usia Dini (0-6 Tahun)','Caberawit (7-12 Tahun)','SMP-Pra Remaja (13-15 Tahun)',
    'SMA-Remaja (16-18 Tahun)','PN-Pra Nikah (19-30 Tahun belum menikah)',
    'PN-Dewasa (Diatas 30 Tahun yang belum menikah)','Menikah'
  )),
  status_nikah text check (status_nikah in ('Menikah','Belum Menikah','Janda','Duda')),
  pekerjaan text,
  penghasilan text,
  created_at timestamptz not null default now()
);

alter table public.jamaah drop constraint if exists jamaah_status_nikah_check;
alter table public.jamaah add constraint jamaah_status_nikah_check
  check (status_nikah in ('Menikah','Belum Menikah','Janda','Duda'));
alter table public.jamaah drop constraint if exists jamaah_kelompok_umur_check;

with classification as (
  select id,
    coalesce(nullif(status_nikah, ''), case status_pernikahan
      when 'Kawin' then 'Menikah'
      when 'Belum Kawin' then 'Belum Menikah'
      else status_pernikahan
    end) as canonical_status,
    case when tanggal_lahir is not null
      then extract(year from age(current_date, tanggal_lahir))::int
      else umur
    end as current_age,
    kelompok_umur as previous_group
  from public.jamaah
)
update public.jamaah as jamaah
set status_nikah = classification.canonical_status,
    status_keluarga = case
      when classification.canonical_status in ('Janda','Duda') then 'Kepala Keluarga'
      else jamaah.status_keluarga
    end,
    kelompok_umur = case
      when classification.canonical_status = 'Menikah' then 'Menikah'
      when classification.current_age between 0 and 6 then 'Usia Dini (0-6 Tahun)'
      when classification.current_age between 7 and 12 then 'Caberawit (7-12 Tahun)'
      when classification.current_age between 13 and 15 then 'SMP-Pra Remaja (13-15 Tahun)'
      when classification.current_age between 16 and 18 then 'SMA-Remaja (16-18 Tahun)'
      when classification.current_age between 19 and 30 then 'PN-Pra Nikah (19-30 Tahun belum menikah)'
      when classification.current_age > 30 then 'PN-Dewasa (Diatas 30 Tahun yang belum menikah)'
      when classification.previous_group = 'PAUD' then 'Usia Dini (0-6 Tahun)'
      when classification.previous_group = 'SD' then 'Caberawit (7-12 Tahun)'
      when classification.previous_group = 'SMP' then 'SMP-Pra Remaja (13-15 Tahun)'
      when classification.previous_group = 'SMA' then 'SMA-Remaja (16-18 Tahun)'
      when classification.previous_group = 'Pra Nikah' then 'PN-Pra Nikah (19-30 Tahun belum menikah)'
      when classification.previous_group = 'Dewasa' then 'PN-Dewasa (Diatas 30 Tahun yang belum menikah)'
      else classification.previous_group
    end
from classification
where jamaah.id = classification.id;

alter table public.jamaah add constraint jamaah_kelompok_umur_check
  check (kelompok_umur in (
    'Usia Dini (0-6 Tahun)','Caberawit (7-12 Tahun)','SMP-Pra Remaja (13-15 Tahun)',
    'SMA-Remaja (16-18 Tahun)','PN-Pra Nikah (19-30 Tahun belum menikah)',
    'PN-Dewasa (Diatas 30 Tahun yang belum menikah)','Menikah'
  ));

-- A safe aggregate snapshot lets the public home page update live without
-- exposing individual jamaah records to the anon role.
create table if not exists public.statistik_jamaah_public (
  id boolean primary key default true check (id),
  total bigint not null default 0,
  usia jsonb not null default '{}'::jsonb,
  status jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.presensi_sesi (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis_pengajian text not null check (jenis_pengajian in ('Pengajian Umum','Pengajian Ibu-Ibu','Pembinaan Generus')),
  kelas_generus text check (kelas_generus in ('SMP','SMA','PN')),
  is_hasda boolean not null default false,
  created_at timestamptz not null default now(),
  check ((jenis_pengajian = 'Pembinaan Generus') = (kelas_generus is not null)),
  check (jenis_pengajian = 'Pengajian Umum' or is_hasda = false)
);

create table if not exists public.presensi_detail (
  id uuid primary key default gen_random_uuid(),
  sesi_id uuid not null references public.presensi_sesi(id) on delete cascade,
  jamaah_id uuid not null references public.jamaah(id) on delete cascade,
  status text not null check (status in ('Hadir','Tidak Hadir','Izin')),
  unique (sesi_id, jamaah_id)
);

create table if not exists public.materi_pengajian (
  id uuid primary key default gen_random_uuid(),
  tanggal date not null,
  jenis_pengajian text not null check (jenis_pengajian in ('Pengajian Umum','Pengajian Ibu-Ibu','Pembinaan Generus')),
  kelas_generus text check (kelas_generus in ('SMP','SMA','PN')),
  judul_materi text not null,
  pemateri text,
  ringkasan text,
  created_at timestamptz not null default now(),
  check ((jenis_pengajian = 'Pembinaan Generus') = (kelas_generus is not null))
);

create table if not exists public.program_masjid (
  id uuid primary key default gen_random_uuid(),
  judul_program text not null,
  tanggal date not null,
  waktu_mulai time,
  waktu_selesai time,
  penanggung_jawab text,
  keterangan text,
  created_at timestamptz not null default now()
);

create index if not exists jamaah_nama_idx on public.jamaah (nama_lengkap);
create index if not exists presensi_tanggal_idx on public.presensi_sesi (tanggal desc);
create index if not exists presensi_detail_sesi_idx on public.presensi_detail (sesi_id);
create index if not exists program_tanggal_idx on public.program_masjid (tanggal);

create or replace function public.refresh_public_jamaah_stats()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.statistik_jamaah_public (id,total,usia,status,updated_at)
  select true,
    (select count(*) from public.jamaah),
    (select coalesce(jsonb_object_agg(kelompok_umur,jumlah),'{}'::jsonb)
     from (select kelompok_umur,count(*) as jumlah from public.jamaah where kelompok_umur is not null group by kelompok_umur) age_groups),
    (select coalesce(jsonb_object_agg(status,jumlah),'{}'::jsonb)
     from (select coalesce(nullif(status_nikah,''),status_pernikahan) as status,count(*) as jumlah
       from public.jamaah where coalesce(nullif(status_nikah,''),status_pernikahan) is not null
       group by coalesce(nullif(status_nikah,''),status_pernikahan)) marriage_status),
    now()
  on conflict (id) do update set total=excluded.total,usia=excluded.usia,status=excluded.status,updated_at=excluded.updated_at;
  return null;
end
$$;

drop trigger if exists jamaah_refresh_public_stats on public.jamaah;
create trigger jamaah_refresh_public_stats after insert or update or delete on public.jamaah
for each statement execute function public.refresh_public_jamaah_stats();

insert into public.statistik_jamaah_public (id,total,usia,status)
values (
  true,
  (select count(*) from public.jamaah),
  (select coalesce(jsonb_object_agg(kelompok_umur,jumlah),'{}'::jsonb)
   from (select kelompok_umur,count(*) as jumlah from public.jamaah where kelompok_umur is not null group by kelompok_umur) age_groups),
  (select coalesce(jsonb_object_agg(status,jumlah),'{}'::jsonb)
   from (select coalesce(nullif(status_nikah,''),status_pernikahan) as status,count(*) as jumlah
     from public.jamaah where coalesce(nullif(status_nikah,''),status_pernikahan) is not null
     group by coalesce(nullif(status_nikah,''),status_pernikahan)) marriage_status)
)
on conflict (id) do update set total=excluded.total,usia=excluded.usia,status=excluded.status,updated_at=now();

create or replace function public.is_dkm_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.akun_pengguna where id = (select auth.uid()) and role = 'admin') $$;

create or replace function public.public_home_stats()
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('total',total,'usia',usia,'status',status)
  from public.statistik_jamaah_public where id = true
$$;

create or replace function public.admin_create_account(p_nama text, p_username text, p_password text, p_role text)
returns uuid language plpgsql security definer set search_path = public, auth, extensions
as $$
declare new_id uuid := gen_random_uuid(); account_email text := lower(trim(p_username)) || '@dkm-baitu-taqwa.invalid';
begin
  if not public.is_dkm_admin() then raise exception 'Akses admin diperlukan'; end if;
  if trim(coalesce(p_nama,'')) = '' or p_username !~ '^[A-Za-z0-9._-]{3,30}$' then raise exception 'Nama atau username tidak valid'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'Password minimal 8 karakter'; end if;
  if p_role not in ('admin','pengurus') then raise exception 'Role tidak valid'; end if;
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
  values ('00000000-0000-0000-0000-000000000000',new_id,'authenticated','authenticated',account_email,extensions.crypt(p_password,extensions.gen_salt('bf')),now(),
    '{"provider":"email","providers":["email"]}'::jsonb,jsonb_build_object('username',lower(trim(p_username)),'nama_lengkap',trim(p_nama)),now(),now(),'','','','');
  insert into auth.identities (provider_id,user_id,identity_data,provider,created_at,updated_at)
  values (new_id::text,new_id,jsonb_build_object('sub',new_id::text,'email',account_email),'email',now(),now());
  insert into public.akun_pengguna (id,nama_lengkap,username,password,role)
  values (new_id,trim(p_nama),lower(trim(p_username)),extensions.crypt(p_password,extensions.gen_salt('bf')),p_role);
  return new_id;
end
$$;

create or replace function public.admin_update_account(p_id uuid, p_nama text, p_role text, p_password text default null)
returns void language plpgsql security definer set search_path = public, auth, extensions
as $$
declare target public.akun_pengguna%rowtype;
begin
  if not public.is_dkm_admin() then raise exception 'Akses admin diperlukan'; end if;
  select * into target from public.akun_pengguna where id = p_id;
  if not found then raise exception 'Akun tidak ditemukan'; end if;
  if p_role not in ('admin','pengurus') or trim(coalesce(p_nama,'')) = '' then raise exception 'Data akun tidak valid'; end if;
  if coalesce(p_password,'') <> '' and length(p_password) < 8 then raise exception 'Password minimal 8 karakter'; end if;
  if p_id = (select auth.uid()) and p_role <> 'admin' then raise exception 'Tidak dapat menurunkan role akun yang sedang digunakan'; end if;
  if target.role = 'admin' and p_role <> 'admin'
     and (select count(*) from public.akun_pengguna where role = 'admin') <= 1 then raise exception 'Tidak dapat menghapus admin terakhir'; end if;
  update public.akun_pengguna set nama_lengkap = trim(p_nama), role = p_role,
    password = case when coalesce(p_password,'') <> '' then extensions.crypt(p_password,extensions.gen_salt('bf')) else password end
    where id = p_id;
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('nama_lengkap',trim(p_nama)),
    encrypted_password = case when coalesce(p_password,'') <> '' then extensions.crypt(p_password,extensions.gen_salt('bf')) else encrypted_password end,
    updated_at = now() where id = p_id;
end
$$;

create or replace function public.admin_delete_account(p_id uuid)
returns void language plpgsql security definer set search_path = public, auth
as $$
declare target_role text;
begin
  if not public.is_dkm_admin() then raise exception 'Akses admin diperlukan'; end if;
  if p_id = (select auth.uid()) then raise exception 'Tidak dapat menghapus akun yang sedang digunakan'; end if;
  select role into target_role from public.akun_pengguna where id = p_id;
  if target_role is null then raise exception 'Akun tidak ditemukan'; end if;
  if target_role = 'admin' and (select count(*) from public.akun_pengguna where role = 'admin') <= 1 then raise exception 'Tidak dapat menghapus admin terakhir'; end if;
  delete from auth.users where id = p_id;
end
$$;

alter table public.profil_masjid enable row level security;
alter table public.akun_pengguna enable row level security;
alter table public.jamaah enable row level security;
alter table public.statistik_jamaah_public enable row level security;
alter table public.presensi_sesi enable row level security;
alter table public.presensi_detail enable row level security;
alter table public.materi_pengajian enable row level security;
alter table public.program_masjid enable row level security;

drop policy if exists profile_public_read on public.profil_masjid;
create policy profile_public_read on public.profil_masjid for select to anon, authenticated using (true);
drop policy if exists profile_admin_write on public.profil_masjid;
create policy profile_admin_write on public.profil_masjid for all to authenticated using (public.is_dkm_admin()) with check (public.is_dkm_admin());

drop policy if exists account_self_or_admin_read on public.akun_pengguna;
create policy account_self_or_admin_read on public.akun_pengguna for select to authenticated using (id = (select auth.uid()) or public.is_dkm_admin());

drop policy if exists jamaah_authenticated_read on public.jamaah;
create policy jamaah_authenticated_read on public.jamaah for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists jamaah_admin_write on public.jamaah;
create policy jamaah_admin_write on public.jamaah for all to authenticated using (public.is_dkm_admin()) with check (public.is_dkm_admin());
drop policy if exists public_jamaah_stats_read on public.statistik_jamaah_public;
create policy public_jamaah_stats_read on public.statistik_jamaah_public for select to anon, authenticated using (true);

drop policy if exists presensi_authenticated_read on public.presensi_sesi;
create policy presensi_authenticated_read on public.presensi_sesi for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists presensi_admin_write on public.presensi_sesi;
create policy presensi_admin_write on public.presensi_sesi for all to authenticated using (public.is_dkm_admin()) with check (public.is_dkm_admin());

drop policy if exists detail_authenticated_read on public.presensi_detail;
create policy detail_authenticated_read on public.presensi_detail for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists detail_admin_write on public.presensi_detail;
create policy detail_admin_write on public.presensi_detail for all to authenticated using (public.is_dkm_admin()) with check (public.is_dkm_admin());

drop policy if exists materi_authenticated_read on public.materi_pengajian;
create policy materi_authenticated_read on public.materi_pengajian for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists materi_admin_write on public.materi_pengajian;
create policy materi_admin_write on public.materi_pengajian for all to authenticated using (public.is_dkm_admin()) with check (public.is_dkm_admin());

drop policy if exists program_authenticated_read on public.program_masjid;
create policy program_authenticated_read on public.program_masjid for select to authenticated using ((select auth.uid()) is not null);
drop policy if exists program_admin_write on public.program_masjid;
create policy program_admin_write on public.program_masjid for all to authenticated using (public.is_dkm_admin()) with check (public.is_dkm_admin());

revoke all on public.akun_pengguna from anon, authenticated;
grant select (id,nama_lengkap,username,role,created_at) on public.akun_pengguna to authenticated;
grant select on public.profil_masjid to anon, authenticated;
grant select on public.statistik_jamaah_public to anon, authenticated;
grant select,insert,update,delete on public.profil_masjid,public.jamaah,public.presensi_sesi,public.presensi_detail,public.materi_pengajian,public.program_masjid to authenticated;
grant execute on function public.public_home_stats() to anon, authenticated;
grant execute on function public.is_dkm_admin() to authenticated;
grant execute on function public.admin_create_account(text,text,text,text) to authenticated;
grant execute on function public.admin_update_account(uuid,text,text,text) to authenticated;
grant execute on function public.admin_delete_account(uuid) to authenticated;

insert into public.profil_masjid (nama_masjid,alamat)
select 'Masjid Baitu Taqwa','Ciracas, Jakarta Timur'
where not exists (select 1 from public.profil_masjid);

update public.profil_masjid
set nama_masjid = 'Masjid Baitu Taqwa'
where nama_masjid <> 'Masjid Baitu Taqwa';

-- Seed Supabase Auth identities so login works with the initial usernames.
do $$
declare admin_id uuid := '8c3d46f5-73d2-48bd-933d-d7363acb0901';
        staff_id uuid := 'd4963a38-98fa-4f4c-82f7-e6549a2639f5';
begin
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,email_change,email_change_token_new,recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000',admin_id,'authenticated','authenticated','admin@dkm-baitu-taqwa.invalid',extensions.crypt('admin123',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"username":"admin","nama_lengkap":"Administrator"}'::jsonb,now(),now(),'','','',''),
    ('00000000-0000-0000-0000-000000000000',staff_id,'authenticated','authenticated','pengurus@dkm-baitu-taqwa.invalid',extensions.crypt('pengurus123',extensions.gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}'::jsonb,'{"username":"pengurus","nama_lengkap":"Pengurus Masjid"}'::jsonb,now(),now(),'','','','')
  on conflict (id) do nothing;
  insert into auth.identities (provider_id,user_id,identity_data,provider,created_at,updated_at)
  values
    (admin_id::text,admin_id,jsonb_build_object('sub',admin_id::text,'email','admin@dkm-baitu-taqwa.invalid'),'email',now(),now()),
    (staff_id::text,staff_id,jsonb_build_object('sub',staff_id::text,'email','pengurus@dkm-baitu-taqwa.invalid'),'email',now(),now())
  on conflict (provider_id,provider) do nothing;
  insert into public.akun_pengguna (id,nama_lengkap,username,password,role)
  values
    (admin_id,'Administrator','admin',extensions.crypt('admin123',extensions.gen_salt('bf')),'admin'),
    (staff_id,'Pengurus Masjid','pengurus',extensions.crypt('pengurus123',extensions.gen_salt('bf')),'pengurus')
  on conflict (username) do nothing;
end $$;

-- Enable live updates for only public-safe data when the Supabase publication exists.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'statistik_jamaah_public') then
      alter publication supabase_realtime add table public.statistik_jamaah_public;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profil_masjid') then
      alter publication supabase_realtime add table public.profil_masjid;
    end if;
  end if;
end $$;
