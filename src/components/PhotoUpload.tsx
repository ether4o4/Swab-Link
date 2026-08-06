import { useRef, useState } from 'react'
import type { Photo } from '../lib/types'

/** Downscale an image file to a reasonable max dimension and return a data URL. */
function fileToDataUrl(file: File, maxDim = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function PhotoUpload({
  photos,
  onAdd,
  onDelete,
}: {
  photos: Photo[]
  onAdd: (dataUrl: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || !files.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        const dataUrl = await fileToDataUrl(file)
        await onAdd(dataUrl)
      }
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        className="btn-ghost w-full"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? 'Adding…' : '＋ Add photo'}
      </button>

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((p) => (
            <div key={p.id} className="group relative">
              <img
                src={p.storage_path}
                alt={p.caption || 'work order photo'}
                className="aspect-square w-full rounded-lg object-cover"
              />
              <button
                type="button"
                aria-label="Delete photo"
                className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                onClick={() => onDelete(p.id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
