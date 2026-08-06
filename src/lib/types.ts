// Data model for Swab-Link. These types mirror the Supabase tables in
// supabase/schema.sql exactly. Numeric measurement fields are kept as strings
// on the client so partially-typed values ("12.", "") round-trip cleanly through
// the inputs; they are stored as numeric/text in Postgres.

export type WorkOrderStatus = 'open' | 'closed'

/** One row per job/day. */
export interface WorkOrder {
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
  updated_at: string
}

/** Many per work order — the continuous swab log. */
export interface SwabRun {
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
export interface TankLevel {
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
export interface Photo {
  id: string
  work_order_id: string
  // In cloud mode this is a Storage path resolved to a public URL; in fallback
  // mode it is a data URL held in localStorage.
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
