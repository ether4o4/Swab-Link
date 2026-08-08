# Swab-Link

[![Download the Android APK](https://img.shields.io/badge/Download-swab--link.apk-3ddc84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/ether4o4/Swab-Link/releases/download/android-latest/swab-link.apk)
[![Build Android APK](https://github.com/ether4o4/Swab-Link/actions/workflows/android.yml/badge.svg)](https://github.com/ether4o4/Swab-Link/actions/workflows/android.yml)

A mobile work-order app for pulling-unit / workover swabbing jobs. Fill out a
work order on your phone at the well — **works with no cell service** — one job
per day, with swab readings and tank fluid levels logged continuously through the
day. When you get back into service it uploads and shares to the office PC.

## 📲 Download the Android app

**Direct download (always the newest build):**
<https://github.com/ether4o4/Swab-Link/releases/download/android-latest/swab-link.apk>

That link is a fixed address — it never changes, and every push to the default
branch rebuilds the APK and replaces the file behind it. You can also browse the
release page at
<https://github.com/ether4o4/Swab-Link/releases/tag/android-latest>.

Install it on your phone (one time):

1. Tap the downloaded **swab-link.apk**.
2. Android will warn it's from an "unknown source" — tap **Settings**, turn on
   **Allow from this source**, then back out and tap the file again.
3. Tap **Install**, then **Open**. Done — it's on your home screen like any app.

The app runs **fully offline** — everything you enter saves right on the phone, no
signal needed. (Sharing to the office PC turns on once cloud sync is connected —
see *Live sync* below.)

## Open in a browser instead (no install)

Prefer not to install anything? The same app runs in any browser here:
**<https://ether4o4.github.io/Swab-Link/>**

Pages is already switched on, so this link stays live and redeploys itself on
every push to the default branch.

## What a work order captures

- **Header** — well name/location, well depth, install date, last workover, tubing
  size, footage (documented / tallied / actual), pump size, plus job/ticket info,
  operator, lease, API #, unit #, crew.
- **Pressures & fluid levels** — casing & tubing pressure, static & working fluid level.
- **Swab runs** — a running log through the day: run #, time, depth run to, depth to
  fluid, barrels recovered.
- **Tank levels** — add a new tank level continuously through the day.
- **Photos** — snap from the phone camera.
- **Sign-off** — name + on-screen signature.

## Run it locally (only if you're a developer)

You do **not** need this to use the app — use the live link above. This is just for
editing the code:

```bash
npm install
npm run dev
```

Open the printed URL. With no cloud configured it runs in **local mode**: data is
saved in that browser only, no sync between devices.

## Turn on live sync across devices (Supabase — free)

1. Create a free project at <https://supabase.com>.
2. In the project, open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
   tables, the photo storage bucket, realtime, and the shared-access policies.
3. Open **Project Settings → API** and copy the **Project URL** and the **anon public**
   key.
4. Copy `.env.example` to `.env` and paste them in:

   ```
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. Restart `npm run dev`. Now every phone and PC pointed at the app shares the same
   work orders and updates live.

> **Access note (v1):** anyone with the app link and anon key can view and edit — good
> for a small trusted crew. Login can be added later; see the comments in
> `supabase/schema.sql` for where to tighten the policies.

## Build for deployment

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

Host the `dist/` folder on any static host (Netlify, Vercel, Cloudflare Pages, etc.),
setting the same two `VITE_SUPABASE_*` values as environment variables.

## Tech

Vite • React + TypeScript • Tailwind CSS • Supabase (Postgres + Realtime + Storage) •
vite-plugin-pwa.

## Planned next (not in v1)

- **Change history / audit trail** — keep every edit so a wrong value and its correction
  both stay visible, with who changed it and when.
- Login / per-user accounts.
- Full offline write queue.
- PDF export of a completed work order; fluid-build-rate chart from swab-run data.
