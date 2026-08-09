import localforage from 'localforage'
import { isCloud, supabase } from './supabase'
import {
  ALL_TABLES,
  clearDirty,
  dirtyRows,
  mergeRemote,
  notifyChange,
  store,
} from './db'
import type { SyncFields, TableName } from './types'

/**
 * Offline-first sync engine. The local store (db.ts) is always the source of
 * truth. When online and Supabase is configured, this:
 *   - pushes locally-changed rows up (upsert),
 *   - pulls rows changed since last time down (last-write-wins merge),
 *   - listens to Supabase realtime for near-live updates,
 * and re-runs on reconnect, on local edits, and on a periodic timer. Anything
 * entered offline is uploaded automatically the next time there is service.
 */

export interface SyncState {
  configured: boolean // Supabase creds present
  online: boolean
  syncing: boolean
  pending: number // rows waiting to upload
  lastSyncedAt: number | null
  error: boolean
}

let state: SyncState = {
  configured: isCloud,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncing: false,
  pending: 0,
  lastSyncedAt: null,
  error: false,
}

const watchers = new Set<(s: SyncState) => void>()
function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  watchers.forEach((w) => w(state))
}
export function getSyncState(): SyncState {
  return state
}
export function subscribeSync(cb: (s: SyncState) => void): () => void {
  watchers.add(cb)
  cb(state)
  return () => {
    watchers.delete(cb)
  }
}

const CURSOR_KEY = 'sync:cursors'
const EPOCH = '1970-01-01T00:00:00.000Z'

async function getCursors(): Promise<Record<string, string>> {
  return (await localforage.getItem<Record<string, string>>(CURSOR_KEY)) ?? {}
}
async function setCursor(table: TableName, value: string) {
  const cursors = await getCursors()
  cursors[table] = value
  await localforage.setItem(CURSOR_KEY, cursors)
}

function sb() {
  if (!supabase) throw new Error('Supabase not configured')
  return supabase
}

async function countPending(): Promise<number> {
  let n = 0
  for (const t of ALL_TABLES) n += (await dirtyRows(t)).length
  return n
}

async function push() {
  for (const table of ALL_TABLES) {
    const dirty = await dirtyRows<SyncFields & { id: string }>(table)
    if (!dirty.length) continue
    // Strip the local-only _dirty flag before sending.
    const payload = dirty.map((r) => {
      const row: Record<string, unknown> = { ...r }
      delete row._dirty
      return row
    })
    const { error } = await sb().from(table).upsert(payload)
    if (error) throw error
    await clearDirty(
      table,
      dirty.map((r) => ({ id: r.id, updated_at: r.updated_at })),
    )
  }
}

async function pull() {
  const cursors = await getCursors()
  const affected = new Set<string>()
  for (const table of ALL_TABLES) {
    const since = cursors[table] ?? EPOCH
    const { data, error } = await sb()
      .from(table)
      .select('*')
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
    if (error) throw error
    const rows = (data ?? []) as (SyncFields & { id: string })[]
    if (!rows.length) continue
    const changed = await mergeRemote(table, rows)
    changed.forEach((id) => affected.add(id))
    await setCursor(table, rows[rows.length - 1].updated_at)
  }
  if (affected.size) {
    // Refresh any open views; broadcast so other tabs update too.
    notifyChange(null)
  }
}

let running = false
let queued = false

/** Run one push+pull cycle. Coalesces concurrent calls. */
export async function syncNow(): Promise<void> {
  if (!isCloud) return
  if (!state.online) return
  if (running) {
    queued = true
    return
  }
  running = true
  setState({ syncing: true, error: false })
  try {
    await push()
    await pull()
    setState({
      syncing: false,
      pending: await countPending(),
      lastSyncedAt: Date.now(),
      error: false,
    })
  } catch (err) {
    console.error('sync failed', err)
    setState({ syncing: false, pending: await countPending(), error: true })
  } finally {
    running = false
    if (queued) {
      queued = false
      void syncNow()
    }
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
function syncSoon(delay = 800) {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => void syncNow(), delay)
}

let started = false

/** Wire up triggers and do the first sync. Safe to call once at startup. */
export function startSync() {
  if (started) return
  started = true

  // Reflect connectivity in the UI even when Supabase isn't configured.
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      setState({ online: true })
      syncSoon(200)
    })
    window.addEventListener('offline', () => setState({ online: false }))
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') syncSoon(200)
    })
  }

  if (!isCloud) return

  // Push shortly after any local edit. subscribeList fires on every mutation.
  store.subscribeList(() => {
    void countPending().then((pending) => setState({ pending }))
    syncSoon()
  })

  // Near-live updates from other devices.
  try {
    const ch = sb().channel('swablink-sync')
    for (const table of ALL_TABLES) {
      ch.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => syncSoon(300),
      )
    }
    ch.subscribe()
  } catch (err) {
    console.error('realtime subscribe failed', err)
  }

  // Safety-net poll while online.
  setInterval(() => {
    if (state.online) syncSoon(0)
  }, 20000)

  // Initial sync.
  void syncNow()
}
