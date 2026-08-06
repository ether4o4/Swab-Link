// Data model for Swab-Link. These types mirror the Supabase tables in
// supabase/schema.sql exactly. Numeric measurement fields are kept as strings
// on the client so partially-typed values ("12.", "") round-trip cleanly through
// the inputs; they are stored as numeric/text in Postgres.
//
// Every row carries `updated_at` and `deleted_at` so the offline-first sync
// engine (src/lib/sync.ts) can reconcile local and cloud copies by last-write-
// wins and propagate deletes as soft-deletes. `_dirty` is a local-only flag
// (never sent to the server) marking rows that still need to be uploaded.

export type WorkOrderStatus = 'open' | 'closed'

/** Fields shared by every syncable row. */
export interface SyncFields {
  updated_at: string
  deleted_at: string | null
  /** Local-only: set when the row has unsynced local changes. Stripped on push. */
  _dirty?: boolean
}

/** One row per job/day. */
export interface WorkOrder extends SyncFields {
  id: string
  status: WorkOrderStatus

  // --- Core measurements (user-listed) ---
  well_name: string
  well_location: string
  well_depth: string
  installation_date: string // yyyy-mm-dd
  last_workover_date: string // yyyy-mm-dd
  tubing_size: string
  tubing_footage_documented: string
  tubing_footage_tallied: string
  tubing_footage_actual: string
  pump_size: string

  // --- Job header info ---
  job_number: string
  job_date: string // yyyy-mm-dd
  operator: string
  lease_name: string
  well_api: string
  unit_number: string
  crew: string

  // --- Pressures & fluid levels ---
  casing_pressure: string
  tubing_pressure: string
  static_fluid_level: string
  working_fluid_level: string

  // --- Sign-off ---
  signed_by: string
  signature_url: string // data URL (fallback) or storage URL
  signed_at: string | null

  notes: string
  created_at: string
}

/** Many per work order — the continuous swab log. */
export interface SwabRun extends SyncFields {
  id: string
  work_order_id: string
  run_number: string
  run_time: string // ISO timestamp
  depth_run_to: string
  depth_to_fluid: string
  fluid_recovered_bbls: string
  note: string
  created_at: string
}

export type TankLevelUnit = 'ft-in' | 'bbls'

/** Many per work order — "add a new level continuously through the day". */
export interface TankLevel extends SyncFields {
  id: string
  work_order_id: string
  reading_time: string // ISO timestamp
  tank_label: string
  level_value: string
  level_unit: TankLevelUnit
  note: string
  created_at: string
}

/** Many per work order. */
export interface Photo extends SyncFields {
  id: string
  work_order_id: string
  // Holds the photo as a data URL (base64). Stored and synced as plain text so
  // photos travel with the row and need no separate binary upload.
  storage_path: string
  caption: string
  created_at: string
}

export const WORK_ORDER_TABLE = 'work_orders'
export const SWAB_RUN_TABLE = 'swab_runs'
export const TANK_LEVEL_TABLE = 'tank_levels'
export const PHOTO_TABLE = 'photos'

export type TableName =
  | typeof WORK_ORDER_TABLE
  | typeof SWAB_RUN_TABLE
  | typeof TANK_LEVEL_TABLE
  | typeof PHOTO_TABLE
