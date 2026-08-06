import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { SyncStatus } from '../components/SyncStatus'
import {
  DateField,
  NumberField,
  Section,
  TextArea,
  TextField,
} from '../components/Field'
import { PhotoUpload } from '../components/PhotoUpload'
import { SignaturePad } from '../components/SignaturePad'
import { SwabRunRow } from '../components/SwabRunRow'
import { TankLevelRow } from '../components/TankLevelRow'
import { store } from '../lib/db'
import { newSwabRun, newTankLevel } from '../lib/defaults'
import { nowIso, uuid } from '../lib/id'
import { useDebouncedSave } from '../hooks/useDebouncedSave'
import type { Photo, SwabRun, TankLevel, WorkOrder } from '../lib/types'

export function WorkOrderForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [wo, setWo] = useState<WorkOrder | null>(null)
  const [runs, setRuns] = useState<SwabRun[]>([])
  const [levels, setLevels] = useState<TankLevel[]>([])
  const [photos, setPhotos] = useState<Photo[]>([])
  const [notFound, setNotFound] = useState(false)

  const { queue, state } = useDebouncedSave()

  // Skip clobbering local edits while the user is actively typing.
  const editingRef = useRef(false)

  const loadHeader = useCallback(async () => {
    if (!id) return
    const found = await store.getWorkOrder(id)
    if (!found) {
      setNotFound(true)
      return
    }
    if (!editingRef.current) setWo(found)
  }, [id])

  const loadChildren = useCallback(async () => {
    if (!id) return
    const [r, l, p] = await Promise.all([
      store.listSwabRuns(id),
      store.listTankLevels(id),
      store.listPhotos(id),
    ])
    if (!editingRef.current) {
      setRuns(r)
      setLevels(l)
    }
    setPhotos(p)
  }, [id])

  useEffect(() => {
    if (!id) return
    loadHeader()
    loadChildren()
    const unsub = store.subscribeWorkOrder(id, () => {
      loadHeader()
      loadChildren()
    })
    return unsub
  }, [id, loadHeader, loadChildren])

  // --- Header field editing (debounced auto-save) ---
  function setField<K extends keyof WorkOrder>(key: K, value: WorkOrder[K]) {
    setWo((prev) => {
      if (!prev) return prev
      const next = { ...prev, [key]: value }
      queue(() => store.upsertWorkOrder(next), 'header')
      return next
    })
  }

  const focusOn = () => (editingRef.current = true)
  const focusOff = () => (editingRef.current = false)

  // --- Swab runs ---
  async function addRun() {
    if (!id) return
    const run = newSwabRun(id, runs.length + 1)
    setRuns((prev) => [run, ...prev])
    await store.insertSwabRun(run)
  }
  function editRun(runId: string, patch: Partial<SwabRun>) {
    setRuns((prev) => {
      const next = prev.map((r) => (r.id === runId ? { ...r, ...patch } : r))
      const updated = next.find((r) => r.id === runId)
      if (updated) queue(() => store.updateSwabRun(runId, updated), `run:${runId}`)
      return next
    })
  }
  async function removeRun(runId: string) {
    setRuns((prev) => prev.filter((r) => r.id !== runId))
    await store.deleteSwabRun(runId)
  }

  // --- Tank levels ---
  async function addLevel() {
    if (!id) return
    const level = newTankLevel(id)
    setLevels((prev) => [level, ...prev])
    await store.insertTankLevel(level)
  }
  function editLevel(levelId: string, patch: Partial<TankLevel>) {
    setLevels((prev) => {
      const next = prev.map((l) => (l.id === levelId ? { ...l, ...patch } : l))
      const updated = next.find((l) => l.id === levelId)
      if (updated)
        queue(() => store.updateTankLevel(levelId, updated), `level:${levelId}`)
      return next
    })
  }
  async function removeLevel(levelId: string) {
    setLevels((prev) => prev.filter((l) => l.id !== levelId))
    await store.deleteTankLevel(levelId)
  }

  // --- Photos ---
  async function addPhoto(dataUrl: string) {
    if (!id) return
    const url = await store.uploadImage(id, dataUrl)
    const photo: Photo = {
      id: uuid(),
      work_order_id: id,
      storage_path: url,
      caption: '',
      created_at: nowIso(),
    }
    setPhotos((prev) => [photo, ...prev])
    await store.insertPhoto(photo)
  }
  async function removePhoto(photoId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    await store.deletePhoto(photoId)
  }

  // --- Sign-off ---
  async function saveSignature(dataUrl: string) {
    if (!wo || !id) return
    const url = await store.uploadImage(id, dataUrl)
    setField('signature_url', url)
    setField('signed_at', nowIso())
  }
  function clearSignature() {
    setField('signature_url', '')
    setField('signed_at', null)
  }

  function toggleStatus() {
    if (!wo) return
    setField('status', wo.status === 'open' ? 'closed' : 'open')
  }

  if (notFound) {
    return (
      <Layout back title={<span className="text-lg font-bold">Not found</span>}>
        <div className="card p-8 text-center text-slate-400">
          This work order doesn’t exist.
          <div className="mt-4">
            <button className="btn-accent" onClick={() => navigate('/')}>
              Back to list
            </button>
          </div>
        </div>
      </Layout>
    )
  }

  if (!wo) {
    return (
      <Layout back>
        <p className="py-10 text-center text-slate-500">Loading…</p>
      </Layout>
    )
  }

  return (
    <Layout
      back
      title={
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">
            {wo.well_name || 'New work order'}
          </div>
          <SyncStatus state={state} />
        </div>
      }
      right={
        <button
          className={`btn !px-3 !py-2 text-sm ${
            wo.status === 'open'
              ? 'btn-ghost'
              : 'bg-emerald-500/15 text-emerald-400'
          }`}
          onClick={toggleStatus}
        >
          {wo.status === 'open' ? 'Mark done' : 'Reopen'}
        </button>
      }
    >
      <div onFocusCapture={focusOn} onBlurCapture={focusOff}>
        {/* Well & job header */}
        <Section title="Well & job">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Well name"
              value={wo.well_name}
              onChange={(v) => setField('well_name', v)}
              className="sm:col-span-2"
            />
            <TextField
              label="Location"
              value={wo.well_location}
              onChange={(v) => setField('well_location', v)}
              className="sm:col-span-2"
            />
            <NumberField
              label="Well depth"
              unit="ft"
              value={wo.well_depth}
              onChange={(v) => setField('well_depth', v)}
            />
            <TextField
              label="Pump size"
              value={wo.pump_size}
              onChange={(v) => setField('pump_size', v)}
            />
            <DateField
              label="Installation date"
              value={wo.installation_date}
              onChange={(v) => setField('installation_date', v)}
            />
            <DateField
              label="Last workover"
              value={wo.last_workover_date}
              onChange={(v) => setField('last_workover_date', v)}
            />
            <TextField
              label="Job / ticket #"
              value={wo.job_number}
              onChange={(v) => setField('job_number', v)}
            />
            <DateField
              label="Job date"
              value={wo.job_date}
              onChange={(v) => setField('job_date', v)}
            />
            <TextField
              label="Operator"
              value={wo.operator}
              onChange={(v) => setField('operator', v)}
            />
            <TextField
              label="Lease"
              value={wo.lease_name}
              onChange={(v) => setField('lease_name', v)}
            />
            <TextField
              label="Well API #"
              value={wo.well_api}
              onChange={(v) => setField('well_api', v)}
            />
            <TextField
              label="Unit / rig #"
              value={wo.unit_number}
              onChange={(v) => setField('unit_number', v)}
            />
            <TextField
              label="Crew"
              value={wo.crew}
              onChange={(v) => setField('crew', v)}
              className="sm:col-span-2"
            />
          </div>
        </Section>

        {/* Tubing */}
        <Section title="Tubing">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Tubing size"
              value={wo.tubing_size}
              onChange={(v) => setField('tubing_size', v)}
            />
            <NumberField
              label="Footage documented"
              unit="ft"
              value={wo.tubing_footage_documented}
              onChange={(v) => setField('tubing_footage_documented', v)}
            />
            <NumberField
              label="Tallied footage"
              unit="ft"
              value={wo.tubing_footage_tallied}
              onChange={(v) => setField('tubing_footage_tallied', v)}
            />
            <NumberField
              label="Actual footage"
              unit="ft"
              value={wo.tubing_footage_actual}
              onChange={(v) => setField('tubing_footage_actual', v)}
            />
          </div>
        </Section>

        {/* Pressures & fluid levels */}
        <Section title="Pressures & fluid levels">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <NumberField
              label="Casing pressure"
              unit="psi"
              value={wo.casing_pressure}
              onChange={(v) => setField('casing_pressure', v)}
            />
            <NumberField
              label="Tubing pressure"
              unit="psi"
              value={wo.tubing_pressure}
              onChange={(v) => setField('tubing_pressure', v)}
            />
            <NumberField
              label="Static fluid level"
              unit="ft"
              value={wo.static_fluid_level}
              onChange={(v) => setField('static_fluid_level', v)}
            />
            <NumberField
              label="Working fluid level"
              unit="ft"
              value={wo.working_fluid_level}
              onChange={(v) => setField('working_fluid_level', v)}
            />
          </div>
        </Section>
      </div>

      {/* Swab runs — the continuous swab log */}
      <Section
        title="Swabbing"
        action={
          <button className="btn-accent !px-3 !py-2 text-sm" onClick={addRun}>
            ＋ Add run
          </button>
        }
      >
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">
            No swab runs yet. Tap “Add run” each time you make a run.
          </p>
        ) : (
          <div
            className="space-y-2"
            onFocusCapture={focusOn}
            onBlurCapture={focusOff}
          >
            {runs.map((r) => (
              <SwabRunRow
                key={r.id}
                run={r}
                onChange={(patch) => editRun(r.id, patch)}
                onDelete={() => removeRun(r.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Tank fluid levels — add continuously through the day */}
      <Section
        title="Tank fluid levels"
        action={
          <button className="btn-accent !px-3 !py-2 text-sm" onClick={addLevel}>
            ＋ Add level
          </button>
        }
      >
        {levels.length === 0 ? (
          <p className="text-sm text-slate-500">
            No levels yet. Tap “Add level” to log a tank reading anytime through
            the day.
          </p>
        ) : (
          <div
            className="space-y-2"
            onFocusCapture={focusOn}
            onBlurCapture={focusOff}
          >
            {levels.map((l) => (
              <TankLevelRow
                key={l.id}
                level={l}
                onChange={(patch) => editLevel(l.id, patch)}
                onDelete={() => removeLevel(l.id)}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Photos */}
      <Section title="Photos">
        <PhotoUpload photos={photos} onAdd={addPhoto} onDelete={removePhoto} />
      </Section>

      {/* Notes */}
      <Section title="Notes">
        <div onFocusCapture={focusOn} onBlurCapture={focusOff}>
          <TextArea
            label="Notes"
            value={wo.notes}
            onChange={(v) => setField('notes', v)}
            placeholder="Anything worth noting about the job…"
          />
        </div>
      </Section>

      {/* Sign-off */}
      <Section title="Sign-off">
        <div onFocusCapture={focusOn} onBlurCapture={focusOff}>
          <TextField
            label="Signed by"
            value={wo.signed_by}
            onChange={(v) => setField('signed_by', v)}
            className="mb-3"
          />
        </div>
        <span className="field-label">Signature</span>
        <SignaturePad
          value={wo.signature_url}
          onSave={saveSignature}
          onClear={clearSignature}
        />
      </Section>
    </Layout>
  )
}
