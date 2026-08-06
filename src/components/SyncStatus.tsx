import { useEffect, useState } from 'react'
import { getSyncState, subscribeSync, type SyncState } from '../lib/sync'
import type { SaveState } from '../hooks/useDebouncedSave'

/**
 * Live status pill. Priority:
 *   saving now  ->  offline  ->  N to upload  ->  synced / saved / local only.
 * Tells a field hand at a glance whether their work is safe and whether it has
 * made it up to the office yet.
 */
export function SyncStatus({ state: saveState }: { state: SaveState }) {
  const [sync, setSync] = useState<SyncState>(getSyncState())
  useEffect(() => subscribeSync(setSync), [])

  let label: string
  let dot: string

  if (saveState === 'saving') {
    label = 'Saving…'
    dot = 'bg-amber-400 animate-pulse'
  } else if (sync.configured && !sync.online) {
    label = 'Offline — saved on device'
    dot = 'bg-slate-400'
  } else if (sync.configured && sync.syncing) {
    label = 'Syncing…'
    dot = 'bg-amber-400 animate-pulse'
  } else if (sync.configured && sync.pending > 0) {
    label = `${sync.pending} to upload`
    dot = 'bg-amber-400'
  } else if (sync.configured && sync.error) {
    label = 'Will retry sync'
    dot = 'bg-red-500'
  } else if (sync.configured) {
    label = 'Synced'
    dot = 'bg-emerald-500'
  } else {
    // No cloud configured: purely local.
    label = saveState === 'saved' ? 'Saved' : 'Saved on device'
    dot = 'bg-slate-400'
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
