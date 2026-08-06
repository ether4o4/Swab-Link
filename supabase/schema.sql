-- Swab-Link database schema
-- Run this in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it uses "if not exists" / "or replace" throughout.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open', 'closed')),

  -- Core measurements
  well_name text not null default '',
  well_location text not null default '',
  well_depth text not null default '',
  installation_date date,
  last_workover_date date,
  tubing_size text not null default '',
  tubing_footage_documented text not null default '',
  tubing_footage_tallied text not null default '',
  tubing_footage_actual text not null default '',
  pump_size text not null default '',

  -- Job header info
  job_number text not null default '',
  job_date date,
  operator text not null default '',
  lease_name text not null default '',
  well_api text not null default '',
  unit_number text not null default '',
  crew text not null default '',

  -- Pressures & fluid levels
  casing_pressure text not null default '',
  tubing_pressure text not null default '',
  static_fluid_level text not null default '',
  working_fluid_level text not null default '',

  -- Sign-off
  signed_by text not null default '',
  signature_url text not null default '',
  signed_at timestamptz,

  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.swab_runs (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  run_number text not null default '',
  run_time timestamptz not null default now(),
  depth_run_to text not null default '',
  depth_to_fluid text not null default '',
  fluid_recovered_bbls text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.tank_levels (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  reading_time timestamptz not null default now(),
  tank_label text not null default '',
  level_value text not null default '',
  level_unit text not null default 'ft-in' check (level_unit in ('ft-in', 'bbls')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  storage_path text not null default '',
  caption text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Idempotent upgrade for databases created before the sync columns existed.
alter table public.work_orders add column if not exists deleted_at timestamptz;
alter table public.swab_runs  add column if not exists updated_at timestamptz not null default now();
alter table public.swab_runs  add column if not exists deleted_at timestamptz;
alter table public.tank_levels add column if not exists updated_at timestamptz not null default now();
alter table public.tank_levels add column if not exists deleted_at timestamptz;
alter table public.photos     add column if not exists updated_at timestamptz not null default now();
alter table public.photos     add column if not exists deleted_at timestamptz;

create index if not exists swab_runs_wo_idx on public.swab_runs (work_order_id);
create index if not exists tank_levels_wo_idx on public.tank_levels (work_order_id);
create index if not exists photos_wo_idx on public.photos (work_order_id);
create index if not exists work_orders_updated_idx on public.work_orders (updated_at);
create index if not exists swab_runs_updated_idx on public.swab_runs (updated_at);
create index if not exists tank_levels_updated_idx on public.tank_levels (updated_at);
create index if not exists photos_updated_idx on public.photos (updated_at);

-- ---------------------------------------------------------------------------
-- Realtime: broadcast row changes to subscribed clients
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table public.work_orders;
alter publication supabase_realtime add table public.swab_runs;
alter publication supabase_realtime add table public.tank_levels;
alter publication supabase_realtime add table public.photos;

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- v1 = "simple shared access": anyone with the app's anon key can read/write.
-- This is fine for a small trusted crew. When you add login later, replace the
-- "using (true) / with check (true)" policies below with ones that check
-- auth.uid(), and add a created_by column for per-user attribution.
-- ---------------------------------------------------------------------------

alter table public.work_orders enable row level security;
alter table public.swab_runs enable row level security;
alter table public.tank_levels enable row level security;
alter table public.photos enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['work_orders', 'swab_runs', 'tank_levels', 'photos']
  loop
    execute format('drop policy if exists shared_all on public.%I;', t);
    execute format(
      'create policy shared_all on public.%I for all using (true) with check (true);',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage bucket for photos and signatures
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('work-order-photos', 'work-order-photos', true)
on conflict (id) do nothing;

drop policy if exists "shared read photos" on storage.objects;
create policy "shared read photos" on storage.objects
  for select using (bucket_id = 'work-order-photos');

drop policy if exists "shared write photos" on storage.objects;
create policy "shared write photos" on storage.objects
  for insert with check (bucket_id = 'work-order-photos');

drop policy if exists "shared update photos" on storage.objects;
create policy "shared update photos" on storage.objects
  for update using (bucket_id = 'work-order-photos');

drop policy if exists "shared delete photos" on storage.objects;
create policy "shared delete photos" on storage.objects
  for delete using (bucket_id = 'work-order-photos');
