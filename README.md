# DKM Masjid Baitu Taqwa

Single-page web app using HTML, Tailwind CDN, vanilla JavaScript, and Supabase.

## Architecture

- **Frontend:** `index.html`, `css/`, and `js/` run in the browser.
- **Backend:** Supabase Auth handles sign-in; Supabase PostgreSQL stores data; `database.sql` defines tables, RLS authorization policies, and server-side RPC functions.
- No separate Node/PHP server is required. The browser uses only the Supabase publishable/anon key; database access is restricted by RLS and the authenticated user's role.

## Setup

1. Create a Supabase project.
2. Run [`database.sql`](./database.sql) in the Supabase SQL Editor.
3. Set `SUPABASE_URL` and the project's **anon/publishable** key in [`js/supabase-client.js`](./js/supabase-client.js). Never put a `service_role` key in this browser app.
4. Serve this folder from a local or hosted web server and open `index.html`. The browser's `file://` mode may prevent CDN or Supabase requests.

Initial accounts:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Admin |
| `pengurus` | `pengurus123` | Pengurus |

Change both initial passwords after setup. Account passwords are authenticated by Supabase Auth; the `akun_pengguna.password` column stores a private bcrypt hash and is not selectable through the browser API. Database RLS policies enforce read and write access independently of the UI.

The public home page only receives profile data and aggregate jamaah counts. Personal jamaah records require a signed-in account. Tailwind and the other UI libraries load from CDNs, so the app needs an internet connection.

## Jamaah and census

Jamaah are classified from age and marital status: Usia Dini (0-6), Caberawit (7-12), SMP-Pra Remaja (13-15), SMA-Remaja (16-18), PN-Pra Nikah (19-30 and unmarried), PN-Dewasa (over 30 and unmarried), or Menikah. Janda and Duda are counted separately, not as PN-Dewasa, and are treated as Kepala Keluarga. Age and classification are calculated when a jamaah record is created, edited, or imported; they do not advance automatically at the start of a new year. The Database Jamaah page includes a Sensus Jamaah tab with counts by gender and a household-head count. When updating an existing project, run `database.sql` again to migrate stored classifications and database constraints.

Attendance candidates are filtered by the saved age and marital status: Pengajian Umum includes jamaah aged 13 and above; Pengajian Ibu-Ibu includes married women and widows; Pembinaan Generus includes SMP (13-15), SMA (16-18), and PN (19-30, only Belum Menikah). Attendance statuses are Hadir, Izin, Sakit, and Alpha. Admins can edit all jamaah statuses for a session from its Riwayat row. Teks Susulan lists jamaah marked Izin, Sakit, or Alpha for Pengajian Umum sessions marked HASDA. Re-run `database.sql` on an existing project to migrate previous `Tidak Hadir` records to `Alpha`, update the status constraint, install the atomic status-edit function, and refresh the Supabase API schema cache.

The attendance dashboard plots daily attendance percentages and shows the attended/required counts; its status ratio shows each status percentage and person count. Dashboard filters support a start/end month period, an optional meeting date list for a selected pengajian type, and a per-person attendance filter with a dedicated 0% option.

The Program Masjid page can export agenda items for a selected date range as a high-resolution flyer image and share it with supported apps or download it as a PNG.

## Security note

`.env` and `.env.*` are ignored by Git. This is a static browser app, so it cannot read `.env` directly. The Supabase publishable/anon key is intended to be visible in browser code; database security must come from the included RLS policies. Never use a Supabase `service_role` or other private key in frontend code.
