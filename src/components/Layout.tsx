import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** Inline logo (a derrick over a fluid line) — no external request, renders anywhere. */
function LogoMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden="true">
      <rect width="64" height="64" rx="12" fill="#0f172a" />
      <path
        d="M32 10 L20 52 M32 10 L44 52 M24 38 h16 M27 26 h10"
        stroke="#f59e0b"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path d="M12 52 h40" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** App shell with a sticky header. */
export function Layout({
  children,
  title,
  back,
  right,
}: {
  children: ReactNode
  title?: ReactNode
  back?: boolean
  right?: ReactNode
}) {
  return (
    <div className="mx-auto min-h-full max-w-2xl">
      <header className="sticky top-0 z-10 border-b border-rig-line bg-rig-bg/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          {back && (
            <Link
              to="/"
              className="btn-ghost !px-3 !py-2 text-sm"
              aria-label="Back to work orders"
            >
              ‹ Back
            </Link>
          )}
          <div className="min-w-0 flex-1">
            {title ?? (
              <div className="flex items-center gap-2">
                <LogoMark />
                <span className="text-lg font-bold tracking-tight">Swab-Link</span>
              </div>
            )}
          </div>
          {right}
        </div>
      </header>
      <main className="px-4 py-4">{children}</main>
    </div>
  )
}
