import { useCallback, useEffect, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Debounced auto-save. Each save is filed under a `key` (the work-order header,
 * a specific swab run, a specific tank level) and debounced independently, so
 * editing two things quickly can't make one save clobber the other. Every
 * queued save should persist the *whole* object for its key — the latest queued
 * fn for a key wins.
 */
export function useDebouncedSave(delay = 600) {
  const [state, setState] = useState<SaveState>('idle')
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const fns = useRef(new Map<string, () => Promise<void>>())
  const inflight = useRef(0)

  const run = useCallback(async (key: string) => {
    const fn = fns.current.get(key)
    fns.current.delete(key)
    timers.current.delete(key)
    if (!fn) return
    inflight.current += 1
    setState('saving')
    try {
      await fn()
    } catch (err) {
      console.error('save failed', err)
      inflight.current -= 1
      setState('error')
      return
    }
    inflight.current -= 1
    if (inflight.current === 0 && fns.current.size === 0) setState('saved')
  }, [])

  const queue = useCallback(
    (fn: () => Promise<void>, key = 'default') => {
      fns.current.set(key, fn)
      const existing = timers.current.get(key)
      if (existing) clearTimeout(existing)
      timers.current.set(
        key,
        setTimeout(() => run(key), delay),
      )
    },
    [delay, run],
  )

  useEffect(() => {
    const timerMap = timers.current
    return () => {
      timerMap.forEach((t) => clearTimeout(t))
    }
  }, [])

  return { queue, state }
}
