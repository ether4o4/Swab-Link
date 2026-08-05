import { formatTime } from '../lib/format'
import type { TankLevel, TankLevelUnit } from '../lib/types'

/** One row in the tank-level log — addable continuously through the day. */
export function TankLevelRow({
  level,
  onChange,
  onDelete,
}: {
  level: TankLevel
  onChange: (patch: Partial<TankLevel>) => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-rig-line bg-rig-bg/40 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-300">
          {formatTime(level.reading_time)}
        </span>
        <button
          type="button"
          aria-label="Delete level"
          className="text-sm text-slate-500 hover:text-red-400"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="block">
          <span className="field-label">Tank</span>
          <input
            className="field-input !py-2"
            value={level.tank_label}
            placeholder="e.g. #1"
            onChange={(e) => onChange({ tank_label: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="field-label">Level</span>
          <input
            className="field-input !py-2"
            inputMode="decimal"
            value={level.level_value}
            onChange={(e) => onChange({ level_value: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="field-label">Unit</span>
          <select
            className="field-input !py-2"
            value={level.level_unit}
            onChange={(e) =>
              onChange({ level_unit: e.target.value as TankLevelUnit })
            }
          >
            <option value="ft-in">ft-in</option>
            <option value="bbls">bbls</option>
          </select>
        </label>
        <label className="col-span-2 block sm:col-span-1">
          <span className="field-label">Note</span>
          <input
            className="field-input !py-2"
            value={level.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
