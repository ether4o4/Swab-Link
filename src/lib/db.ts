import { isCloud, supabase, PHOTO_BUCKET } from './supabase'
import { nowIso, uuid } from './id'
import {
  PHOTO_TABLE,
  SWAB_RUN_TABLE,
  TANK_LEVEL_TABLE,
  WORK_ORDER_TABLE,
  type Photo,
  type SwabRun,
  type TankLevel,
  type WorkOrder,
} from './types'

/**
 * The data layer. Both backends implement the same `Store` interface so page
 * code never has to know whether it is talking to Supabase or localStorage.
 *
 *  - `cloudStore`  -> Supabase Postgres + Realtime + Storage (live multi-device sync)
 *  - `localStore`  -> browser localStorage + BroadcastChannel (single device, cross-tab)
 */
export interface Store {
  listWorkOrders(): Promise<WorkOrder[]>
  getWorkOrder(id: string): Promise<WorkOrder | null>
  upsertWorkOrder(wo: WorkOrder): Promise<void>

  listSwabRuns(workOrderId: string): Promise<SwabRun[]>
  listTankLevels(workOrderId: string): Promise<TankLevel[]>
  listPhotos(workOrderId: string): Promise<Photo[]>

  insertSwabRun(row: SwabRun): Promise<void>
  updateSwabRun(id: string, patch: Partial<SwabRun>): Promise<void>
  deleteSwabRun(id: string): Promise<void>

  insertTankLevel(row: TankLevel): Promise<void>
  updateTankLevel(id: string, patch: Partial<TankLevel>): Promise<void>
  deleteTankLevel(id: string): Promise<void>

  insertPhoto(row: Photo): Promise<void>
  deletePhoto(id: string): Promise<void>

  /** Store an image (data URL) and return a URL usable in an <img src>. */
  uploadImage(workOrderId: string, dataUrl: string): Promise<string>

  /** Fire `cb` whenever the work-order list may have changed. Returns unsubscribe. */
  subscribeList(cb: () => void): () => void
  /** Fire `cb` whenever anything about this work order may have changed. */
  subscribeWorkOrder(workOrderId: string, cb: () => void): () => void
}

// ---------------------------------------------------------------------------
// localStorage backend
// ---------------------------------------------------------------------------

const LS_KEYS = {
  workOrders: 'swablink:work_orders',
  swabRuns: 'swablink:swab_runs',
  tankLevels: 'swablink:tank_levels',
  photos: 'swablink:photos',
} as const

function lsRead<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function lsWrite<T>(key: string, rows: T[]): void {
  localStorage.setItem(key, JSON.stringify(rows))
}

// Cross-tab change notification (best-effort). Same-tab callers are notified
// directly; other tabs receive the BroadcastChannel message.
const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('swab-link')
    : null

type Listener = (workOrderId: string | null) => void
const listeners = new Set<Listener>()

function notify(workOrderId: string | null) {
  listeners.forEach((l) => l(workOrderId))
  channel?.postMessage({ workOrderId })
}

channel?.addEventListener('message', (e) => {
  const wid = (e.data && e.data.workOrderId) ?? null
  listeners.forEach((l) => l(wid))
})

function subscribe(match: (wid: string | null) => boolean, cb: () => void) {
  const listener: Listener = (wid) => {
    if (match(wid)) cb()
  }
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const localStore: Store = {
  async listWorkOrders() {
    return lsRead<WorkOrder>(LS_KEYS.workOrders).sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    )
  },
  async getWorkOrder(id) {
    return lsRead<WorkOrder>(LS_KEYS.workOrders).find((w) => w.id === id) ?? null
  },
  async upsertWorkOrder(wo) {
    const rows = lsRead<WorkOrder>(LS_KEYS.workOrders)
    const i = rows.findIndex((w) => w.id === wo.id)
    const next = { ...wo, updated_at: nowIso() }
    if (i >= 0) rows[i] = next
    else rows.push(next)
    lsWrite(LS_KEYS.workOrders, rows)
    notify(wo.id)
  },

  async listSwabRuns(workOrderId) {
    return lsRead<SwabRun>(LS_KEYS.swabRuns)
      .filter((r) => r.work_order_id === workOrderId)
      .sort((a, b) => b.run_time.localeCompare(a.run_time))
  },
  async listTankLevels(workOrderId) {
    return lsRead<TankLevel>(LS_KEYS.tankLevels)
      .filter((r) => r.work_order_id === workOrderId)
      .sort((a, b) => b.reading_time.localeCompare(a.reading_time))
  },
  async listPhotos(workOrderId) {
    return lsRead<Photo>(LS_KEYS.photos)
      .filter((r) => r.work_order_id === workOrderId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async insertSwabRun(row) {
    const rows = lsRead<SwabRun>(LS_KEYS.swabRuns)
    rows.push(row)
    lsWrite(LS_KEYS.swabRuns, rows)
    notify(row.work_order_id)
  },
  async updateSwabRun(id, patch) {
    const rows = lsRead<SwabRun>(LS_KEYS.swabRuns)
    const i = rows.findIndex((r) => r.id === id)
    if (i >= 0) {
      rows[i] = { ...rows[i], ...patch }
      lsWrite(LS_KEYS.swabRuns, rows)
      notify(rows[i].work_order_id)
    }
  },
  async deleteSwabRun(id) {
    const rows = lsRead<SwabRun>(LS_KEYS.swabRuns)
    const row = rows.find((r) => r.id === id)
    lsWrite(
      LS_KEYS.swabRuns,
      rows.filter((r) => r.id !== id),
    )
    notify(row?.work_order_id ?? null)
  },

  async insertTankLevel(row) {
    const rows = lsRead<TankLevel>(LS_KEYS.tankLevels)
    rows.push(row)
    lsWrite(LS_KEYS.tankLevels, rows)
    notify(row.work_order_id)
  },
  async updateTankLevel(id, patch) {
    const rows = lsRead<TankLevel>(LS_KEYS.tankLevels)
    const i = rows.findIndex((r) => r.id === id)
    if (i >= 0) {
      rows[i] = { ...rows[i], ...patch }
      lsWrite(LS_KEYS.tankLevels, rows)
      notify(rows[i].work_order_id)
    }
  },
  async deleteTankLevel(id) {
    const rows = lsRead<TankLevel>(LS_KEYS.tankLevels)
    const row = rows.find((r) => r.id === id)
    lsWrite(
      LS_KEYS.tankLevels,
      rows.filter((r) => r.id !== id),
    )
    notify(row?.work_order_id ?? null)
  },

  async insertPhoto(row) {
    const rows = lsRead<Photo>(LS_KEYS.photos)
    rows.push(row)
    lsWrite(LS_KEYS.photos, rows)
    notify(row.work_order_id)
  },
  async deletePhoto(id) {
    const rows = lsRead<Photo>(LS_KEYS.photos)
    const row = rows.find((r) => r.id === id)
    lsWrite(
      LS_KEYS.photos,
      rows.filter((r) => r.id !== id),
    )
    notify(row?.work_order_id ?? null)
  },

  async uploadImage(_workOrderId, dataUrl) {
    // In local mode we simply keep the data URL.
    return dataUrl
  },

  subscribeList(cb) {
    return subscribe(() => true, cb)
  },
  subscribeWorkOrder(workOrderId, cb) {
    return subscribe((wid) => wid === null || wid === workOrderId, cb)
  },
}

// ---------------------------------------------------------------------------
// Supabase backend
// ---------------------------------------------------------------------------

function sb() {
  if (!supabase) throw new Error('Supabase client not configured')
  return supabase
}

const cloudStore: Store = {
  async listWorkOrders() {
    const { data, error } = await sb()
      .from(WORK_ORDER_TABLE)
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as WorkOrder[]
  },
  async getWorkOrder(id) {
    const { data, error } = await sb()
      .from(WORK_ORDER_TABLE)
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as WorkOrder) ?? null
  },
  async upsertWorkOrder(wo) {
    const { error } = await sb()
      .from(WORK_ORDER_TABLE)
      .upsert({ ...wo, updated_at: nowIso() })
    if (error) throw error
  },

  async listSwabRuns(workOrderId) {
    const { data, error } = await sb()
      .from(SWAB_RUN_TABLE)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('run_time', { ascending: false })
    if (error) throw error
    return (data ?? []) as SwabRun[]
  },
  async listTankLevels(workOrderId) {
    const { data, error } = await sb()
      .from(TANK_LEVEL_TABLE)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('reading_time', { ascending: false })
    if (error) throw error
    return (data ?? []) as TankLevel[]
  },
  async listPhotos(workOrderId) {
    const { data, error } = await sb()
      .from(PHOTO_TABLE)
      .select('*')
      .eq('work_order_id', workOrderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Photo[]
  },

  async insertSwabRun(row) {
    const { error } = await sb().from(SWAB_RUN_TABLE).insert(row)
    if (error) throw error
  },
  async updateSwabRun(id, patch) {
    const { error } = await sb().from(SWAB_RUN_TABLE).update(patch).eq('id', id)
    if (error) throw error
  },
  async deleteSwabRun(id) {
    const { error } = await sb().from(SWAB_RUN_TABLE).delete().eq('id', id)
    if (error) throw error
  },

  async insertTankLevel(row) {
    const { error } = await sb().from(TANK_LEVEL_TABLE).insert(row)
    if (error) throw error
  },
  async updateTankLevel(id, patch) {
    const { error } = await sb().from(TANK_LEVEL_TABLE).update(patch).eq('id', id)
    if (error) throw error
  },
  async deleteTankLevel(id) {
    const { error } = await sb().from(TANK_LEVEL_TABLE).delete().eq('id', id)
    if (error) throw error
  },

  async insertPhoto(row) {
    const { error } = await sb().from(PHOTO_TABLE).insert(row)
    if (error) throw error
  },
  async deletePhoto(id) {
    const { error } = await sb().from(PHOTO_TABLE).delete().eq('id', id)
    if (error) throw error
  },

  async uploadImage(workOrderId, dataUrl) {
    const blob = await (await fetch(dataUrl)).blob()
    const ext = blob.type.split('/')[1] || 'png'
    const path = `${workOrderId}/${uuid()}.${ext}`
    const { error } = await sb()
      .storage.from(PHOTO_BUCKET)
      .upload(path, blob, { contentType: blob.type, upsert: true })
    if (error) throw error
    const { data } = sb().storage.from(PHOTO_BUCKET).getPublicUrl(path)
    return data.publicUrl
  },

  subscribeList(cb) {
    const ch = sb()
      .channel('work_orders_list')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: WORK_ORDER_TABLE },
        cb,
      )
      .subscribe()
    return () => {
      sb().removeChannel(ch)
    }
  },
  subscribeWorkOrder(workOrderId, cb) {
    const filter = `work_order_id=eq.${workOrderId}`
    const ch = sb()
      .channel(`work_order_${workOrderId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: WORK_ORDER_TABLE, filter: `id=eq.${workOrderId}` },
        cb,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: SWAB_RUN_TABLE, filter },
        cb,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TANK_LEVEL_TABLE, filter },
        cb,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: PHOTO_TABLE, filter },
        cb,
      )
      .subscribe()
    return () => {
      sb().removeChannel(ch)
    }
  },
}

/** The active store for this session, chosen by whether Supabase is configured. */
export const store: Store = isCloud ? cloudStore : localStore
