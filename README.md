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

## Security note

`.env` and `.env.*` are ignored by Git. This is a static browser app, so it cannot read `.env` directly. The Supabase publishable/anon key is intended to be visible in browser code; database security must come from the included RLS policies. Never use a Supabase `service_role` or other private key in frontend code.
