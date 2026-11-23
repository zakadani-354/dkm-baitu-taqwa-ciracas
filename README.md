# DKM Masjid Baitu Taqwa

Single-page web app using HTML, Tailwind CDN, vanilla JavaScript, and Supabase.

## Setup

1. Create a Supabase project.
2. Run [`database.sql`](./database.sql) in the Supabase SQL Editor.
3. Replace `SUPABASE_URL` and `SUPABASE_ANON_KEY` in [`js/supabase-client.js`](./js/supabase-client.js) with the project's URL and **anon/public** key. Never put a `service_role` key in this browser app.
4. Serve this folder from a local or hosted web server and open `index.html`. The browser's `file://` mode may prevent CDN or Supabase requests.

Initial accounts:

| Username | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | Admin |
| `pengurus` | `pengurus123` | Pengurus |

Change both initial passwords after setup. Account passwords are authenticated by Supabase Auth; the `akun_pengguna.password` column stores a private bcrypt hash and is not selectable through the browser API. Database RLS policies enforce read and write access independently of the UI.

The public home page only receives profile data and aggregate jamaah counts. Personal jamaah records require a signed-in account. Tailwind and the other UI libraries load from CDNs, so the app needs an internet connection.
