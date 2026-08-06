import localforage from 'localforage'
import { nowIso } from './id'
import {
  PHOTO_TABLE,
  SWAB_RUN_TABLE,
  TANK_LEVEL_TABLE,
  WORK_ORDER_TABLE,
  type Photo,
  type SwabRun,
  type SyncFields,
  type TableName,
  type TankLevel,
  type WorkOrder,
} from './types'

/**
 * Offline-first local store. Every read and write goes to the on-device
 * database (IndexedDB via localforage), so the app is fully usable with no
 * network. Writes stamp `updated_at` and mark the row `_dirty`; deletes are
 * soft (they set `deleted_at`) so they can be synced. The cloud is handled
 * separately by src/lib/sync.ts, which pushes dirty rows up, pulls remote
 * changes down, and calls back here to merge them in.
 */

const lf = localforage.createInstance({
  name: 'swablink',
  storeName: 'work_orders_db',
})

type AnyRow = SyncFields & { id: string; work_order_id?: string }

// Serialize all read-modify-write cycles so concurrent saves can't lose data.
let writeChain: Promise<unknown> = Promise.resolve()
function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn)
  writeChain = next.catch(() => {})
  return next
}

async function readTable<T>(table: TableName): Promise<T[]> {
  return ((await lf.getItem<T[]>(table)) ?? []) as T[]
}
function writeTable<T>(table: TableName, rows: T[]): Promise<T[]> {
  return lf.setItem(table, rows)
}

/** Live = not soft-deleted. */
function live<T extends SyncFields>(rows: T[]): T[] {
  return rows.filter((r) => !r.deleted_at)
}

// ---------------------------------------------------------------------------
// Change notification (in-tab listeners + other tabs via BroadcastChannel).
// sync.ts also listens so it can push shortly after a local edit.
// ---------------------------------------------------------------------------

const channel: BroadcastChannel | null =
  typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('swab-link')
    : null

type Listener = (workOrderId: string | null) => void
const listeners = new Set<Listener>()

export function notifyChange(workOrderId: string | null, broadcast = true) {
  listeners.forEach((l) => l(workOrderId))
  if (broadcast) channel?.postMessage({ workOrderId })
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
  return () => {
    listeners.delete(listener)
  }
}

// ---------------------------------------------------------------------------
// Public store used by the UI
// ---------------------------------------------------------------------------

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

  subscribeList(cb: () => void): () => void
  subscribeWorkOrder(workOrderId: string, cb: () => void): () => void
}

async function upsertRow<T extends AnyRow>(
  table: TableName,
  row: T,
  workOrderId: string | null,
) {
  await serialize(async () => {
    const rows = await readTable<T>(table)
    const stamped = { ...row, updated_at: nowIso(), _dirty: true }
    const i = rows.findIndex((r) => r.id === row.id)
    if (i >= 0) rows[i] = stamped
    else rows.push(stamped)
    await writeTable(table, rows)
  })
  notifyChange(workOrderId)
}

async function patchRow<T extends AnyRow>(
  table: TableName,
  id: string,
  patch: Partial<T>,
): Promise<string | null> {
  let workOrderId: string | null = null
  await serialize(async () => {
    const rows = await readTable<T>(table)
    const i = rows.findIndex((r) => r.id === id)
    if (i < 0) return
    rows[i] = { ...rows[i], ...patch, updated_at: nowIso(), _dirty: true }
    workOrderId = rows[i].work_order_id ?? rows[i].id
    await writeTable(table, rows)
  })
  return workOrderId
}

async function softDelete<T extends AnyRow>(
  table: TableName,
  id: string,
): Promise<string | null> {
  return patchRow<T>(table, id, { deleted_at: nowIso() } as Partial<T>)
}

export const store: Store = {
  async listWorkOrders() {
    const rows = live(await readTable<WorkOrder>(WORK_ORDER_TABLE))
    return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  },
  async getWorkOrder(id) {
    const rows = await readTable<WorkOrder>(WORK_ORDER_TABLE)
    const found = rows.find((w) => w.id === id)
    return found && !found.deleted_at ? found : null
  },
  async upsertWorkOrder(wo) {
    await upsertRow(WORK_ORDER_TABLE, wo, wo.id)
  },

  async listSwabRuns(workOrderId) {
    return live(await readTable<SwabRun>(SWAB_RUN_TABLE))
      .filter((r) => r.work_order_id === workOrderId)
      .sort((a, b) => b.run_time.localeCompare(a.run_time))
  },
  async listTankLevels(workOrderId) {
    return live(await readTable<TankLevel>(TANK_LEVEL_TABLE))
      .filter((r) => r.work_order_id === workOrderId)
      .sort((a, b) => b.reading_time.localeCompare(a.reading_time))
  },
  async listPhotos(workOrderId) {
    return live(await readTable<Photo>(PHOTO_TABLE))
      .filter((r) => r.work_order_id === workOrderId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  },

  async insertSwabRun(row) {
    await upsertRow(SWAB_RUN_TABLE, row, row.work_order_id)
  },
  async updateSwabRun(id, patch) {
    notifyChange(await patchRow<SwabRun>(SWAB_RUN_TABLE, id, patch))
  },
  async deleteSwabRun(id) {
    notifyChange(await softDelete<SwabRun>(SWAB_RUN_TABLE, id))
  },

  async insertTankLevel(row) {
    await upsertRow(TANK_LEVEL_TABLE, row, row.work_order_id)
  },
  async updateTankLevel(id, patch) {
    notifyChange(await patchRow<TankLevel>(TANK_LEVEL_TABLE, id, patch))
  },
  async deleteTankLevel(id) {
    notifyChange(await softDelete<TankLevel>(TANK_LEVEL_TABLE, id))
  },

  async insertPhoto(row) {
    await upsertRow(PHOTO_TABLE, row, row.work_order_id)
  },
  async deletePhoto(id) {
    notifyChange(await softDelete<Photo>(PHOTO_TABLE, id))
  },

  async uploadImage(_workOrderId, dataUrl) {
    // Photos/signatures are kept as data URLs and synced as text with the row.
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
// Raw access for the sync engine (src/lib/sync.ts)
// ---------------------------------------------------------------------------

export const ALL_TABLES: TableName[] = [
  WORK_ORDER_TABLE,
  SWAB_RUN_TABLE,
  TANK_LEVEL_TABLE,
  PHOTO_TABLE,
]

/** All rows incl. soft-deleted (for pushing). */
export function rawAll<T>(table: TableName): Promise<T[]> {
  return readTable<T>(table)
}

/** Rows with unsynced local changes. */
export async function dirtyRows<T extends SyncFields>(
  table: TableName,
): Promise<T[]> {
  return (await readTable<T>(table)).filter((r) => r._dirty)
}

/** Clear the dirty flag on rows whose local `updated_at` still matches (i.e.
 *  they were not edited again while the push was in flight). */
export function clearDirty(
  table: TableName,
  synced: { id: string; updated_at: string }[],
): Promise<void> {
  const byId = new Map(synced.map((s) => [s.id, s.updated_at]))
  return serialize(async () => {
    const rows = await readTable<AnyRow>(table)
    let changed = false
    for (const r of rows) {
      if (r._dirty && byId.get(r.id) === r.updated_at) {
        delete r._dirty
        changed = true
      }
    }
    if (changed) await writeTable(table, rows)
  }).then(() => undefined)
}

/** Merge server rows into local, last-write-wins, without clobbering newer
 *  local edits. Returns the set of affected work-order ids for notification. */
export function mergeRemote<T extends AnyRow>(
  table: TableName,
  remote: T[],
): Promise<Set<string>> {
  const affected = new Set<string>()
  return serialize(async () => {
    const rows = await readTable<T>(table)
    const byId = new Map(rows.map((r) => [r.id, r]))
    let changed = false
    for (const rem of remote) {
      const loc = byId.get(rem.id)
      // Keep local if it has unsynced edits that are newer than the server's.
      if (loc?._dirty && loc.updated_at > rem.updated_at) continue
      const isNewer = !loc || rem.updated_at > loc.updated_at
      const confirmsOurPush = loc?._dirty && rem.updated_at === loc.updated_at
      if (isNewer || confirmsOurPush) {
        byId.set(rem.id, { ...rem, _dirty: false } as T)
        if (isNewer) affected.add(rem.work_order_id ?? rem.id)
        changed = true
      }
    }
    if (changed) await writeTable(table, Array.from(byId.values()))
  }).then(() => affected)
}
