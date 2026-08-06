import { useEffect, useRef, useState } from 'react'

/**
 * On-screen signature pad. Draws with pointer events (works with finger or
 * mouse) and hands back a PNG data URL when the user taps "Save signature".
 */
export function SignaturePad({
  value,
  onSave,
  onClear,
}: {
  value: string
  onSave: (dataUrl: string) => void
  onClear: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  const [editing, setEditing] = useState(!value)

  useEffect(() => {
    if (!editing) return
    const canvas = canvasRef.current
    if (!canvas) return
    // Size the backing store to the displayed size for crisp lines.
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [editing])

  function pos(e: React.PointerEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function start(e: React.PointerEvent) {
    drawing.current = true
    dirty.current = true
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }
  function move(e: React.PointerEvent) {
    if (!drawing.current) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  function end() {
    drawing.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    dirty.current = false
  }

  if (!editing && value) {
    return (
      <div>
        <img
          src={value}
          alt="signature"
          className="h-32 w-full rounded-lg border border-rig-line bg-white object-contain"
        />
        <button
          type="button"
          className="btn-ghost mt-2 w-full"
          onClick={() => {
            onClear()
            setEditing(true)
          }}
        >
          Re-sign
        </button>
      </div>
    )
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        className="h-32 w-full touch-none rounded-lg border border-rig-line bg-white"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={clearCanvas}>
          Clear
        </button>
        <button
          type="button"
          className="btn-accent flex-1"
          onClick={() => {
            if (!dirty.current) return
            onSave(canvasRef.current!.toDataURL('image/png'))
            setEditing(false)
          }}
        >
          Save signature
        </button>
      </div>
    </div>
  )
}
