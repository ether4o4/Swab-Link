import type { SwabRun, TankLevel, WorkOrder } from './types'
import { nowIso, uuid } from './id'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** A brand-new work order with every field blank/sensible-default. */
export function newWorkOrder(): WorkOrder {
  const ts = nowIso()
  return {
    id: uuid(),
    status: 'open',

    well_name: '',
    well_location: '',
    well_depth: '',
    installation_date: '',
    last_workover_date: '',
    tubing_size: '',
    tubing_footage_documented: '',
    tubing_footage_tallied: '',
    tubing_footage_actual: '',
    pump_size: '',

    job_number: '',
    job_date: today(),
    operator: '',
    lease_name: '',
    well_api: '',
    unit_number: '',
    crew: '',

    casing_pressure: '',
    tubing_pressure: '',
    static_fluid_level: '',
    working_fluid_level: '',

    signed_by: '',
    signature_url: '',
    signed_at: null,

    notes: '',
    created_at: ts,
    updated_at: ts,
  }
}

export function newSwabRun(workOrderId: string, runNumber: number): SwabRun {
  return {
    id: uuid(),
    work_order_id: workOrderId,
    run_number: String(runNumber),
    run_time: nowIso(),
    depth_run_to: '',
    depth_to_fluid: '',
    fluid_recovered_bbls: '',
    note: '',
    created_at: nowIso(),
  }
}

export function newTankLevel(workOrderId: string): TankLevel {
  return {
    id: uuid(),
    work_order_id: workOrderId,
    reading_time: nowIso(),
    tank_label: '',
    level_value: '',
    level_unit: 'ft-in',
    note: '',
    created_at: nowIso(),
  }
}
