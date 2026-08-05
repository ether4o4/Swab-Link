import type { ReactNode } from 'react'

interface BaseProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

/** Text field. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  className,
}: BaseProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/** Numeric measurement field — brings up the numeric keypad on phones. */
export function NumberField({
  label,
  value,
  onChange,
  placeholder,
  unit,
  className,
}: BaseProps & { unit?: string }) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      <div className="relative">
        <input
          className="field-input pr-12"
          type="text"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
        {unit && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            {unit}
          </span>
        )}
      </div>
    </label>
  )
}

/** Date field. */
export function DateField({ label, value, onChange, className }: BaseProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      <input
        className="field-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/** Multi-line notes field. */
export function TextArea({ label, value, onChange, placeholder, className }: BaseProps) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      <textarea
        className="field-input min-h-[80px] resize-y"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

/** Section wrapper with a heading. */
export function Section({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="card mb-4 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
