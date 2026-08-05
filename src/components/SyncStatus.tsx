import { isCloud } from '../lib/supabase'
import type { SaveState } from '../hooks/useDebouncedSave'

/**
 * Small live indicator. Shows whether the app is cloud-synced or local-only,
 * and the current save state while editing.
 */
export function SyncStatus({ state }: { state: SaveState }) {
  const label =
    state === 'saving'
      ? 'Saving…'
      : state === 'error'
        ? 'Save failed'
        : state === 'saved'
          ? 'Saved'
          : isCloud
            ? 'Live sync'
            : 'Local only'

  const dot =
    state === 'error'
      ? 'bg-red-500'
      : state === 'saving'
        ? 'bg-amber-400 animate-pulse'
        : isCloud
          ? 'bg-emerald-500'
          : 'bg-slate-400'

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
