import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { store } from '../lib/db'
import { newWorkOrder } from '../lib/defaults'
import { formatDate } from '../lib/format'
import type { WorkOrder } from '../lib/types'

export function WorkOrderList() {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  async function refresh() {
    setOrders(await store.listWorkOrders())
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const unsub = store.subscribeList(refresh)
    return unsub
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return orders
    return orders.filter((o) =>
      [o.well_name, o.well_location, o.lease_name, o.job_number, o.operator]
        .join(' ')
        .toLowerCase()
        .includes(q),
    )
  }, [orders, query])

  async function createNew() {
    const wo = newWorkOrder()
    await store.upsertWorkOrder(wo)
    navigate(`/work-orders/${wo.id}`)
  }

  return (
    <Layout
      right={
        <button className="btn-accent !px-3 !py-2 text-sm" onClick={createNew}>
          ＋ New
        </button>
      }
    >
      <input
        className="field-input mb-4"
        type="search"
        placeholder="Search well, lease, operator, job #…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p className="py-10 text-center text-slate-500">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          {orders.length === 0 ? (
            <>
              <p className="mb-4">No work orders yet.</p>
              <button className="btn-accent" onClick={createNew}>
                ＋ Create your first work order
              </button>
            </>
          ) : (
            <p>No work orders match “{query}”.</p>
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                className="card w-full p-4 text-left transition-colors hover:border-rig-accent"
                onClick={() => navigate(`/work-orders/${o.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-base font-semibold text-slate-100">
                    {o.well_name || 'Untitled well'}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-slate-400">
                  {o.well_location && <span>{o.well_location}</span>}
                  {o.job_date && <span>{formatDate(o.job_date)}</span>}
                  {o.job_number && <span>Job #{o.job_number}</span>}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Layout>
  )
}

function StatusBadge({ status }: { status: WorkOrder['status'] }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
        status === 'open'
          ? 'bg-emerald-500/15 text-emerald-400'
          : 'bg-slate-500/15 text-slate-400'
      }`}
    >
      {status}
    </span>
  )
}
