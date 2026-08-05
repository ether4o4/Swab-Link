import { formatTime } from '../lib/format'
import type { SwabRun } from '../lib/types'

/** One row in the continuous swab log. */
export function SwabRunRow({
  run,
  onChange,
  onDelete,
}: {
  run: SwabRun
  onChange: (patch: Partial<SwabRun>) => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-rig-line bg-rig-bg/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">
          Run {run.run_number || '—'}{' '}
          <span className="font-normal text-slate-500">
            · {formatTime(run.run_time)}
          </span>
        </span>
        <button
          type="button"
          aria-label="Delete run"
          className="text-sm text-slate-500 hover:text-red-400"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <label className="block">
          <span className="field-label">Depth run to</span>
          <input
            className="field-input !py-2"
            inputMode="decimal"
            value={run.depth_run_to}
            onChange={(e) => onChange({ depth_run_to: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="field-label">Depth to fluid</span>
          <input
            className="field-input !py-2"
            inputMode="decimal"
            value={run.depth_to_fluid}
            onChange={(e) => onChange({ depth_to_fluid: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="field-label">Recovered (bbls)</span>
          <input
            className="field-input !py-2"
            inputMode="decimal"
            value={run.fluid_recovered_bbls}
            onChange={(e) => onChange({ fluid_recovered_bbls: e.target.value })}
          />
        </label>
        <label className="col-span-2 block sm:col-span-3">
          <span className="field-label">Note</span>
          <input
            className="field-input !py-2"
            value={run.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
