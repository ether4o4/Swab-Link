# Swab-Link

A work-order app for pulling-unit / workover swabbing jobs. Fill out a work
order on your phone at the well, and it shows up live on the office PC — one job
per day, with swab readings and tank fluid levels logged continuously through the
day.

Runs in any browser on phone or PC, and installs to the home screen (PWA).

## 👉 Just open the app (no coding)

**Live link:** https://ether4o4.github.io/Swab-Link/

That's it — open it on your phone or your PC, same link. On a phone you can tap
your browser's **Share → Add to Home Screen** and it behaves like a real app icon.

Nothing to install and nothing to type. (Data saves on each device by itself; to
make phone and PC share the same jobs live, see *Live sync* below.)

The link goes live automatically the first time the app is built — the deploy
turns GitHub Pages on for you, so there's nothing to switch on by hand. If the
page 404s right after the very first deploy, give it a minute; you can watch
progress under the repo's **Actions** tab ("Deploy app to GitHub Pages").

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
