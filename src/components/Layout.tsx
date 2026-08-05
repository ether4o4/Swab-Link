import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

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
                <img src="/favicon.svg" alt="" className="h-6 w-6" />
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
