/** Display helpers. */

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function formatDate(iso: string): string {
  if (!iso) return ''
  try {
    // Date-only strings ("2026-08-05") — avoid TZ shifting the day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      const [y, m, d] = iso.split('-')
      return `${m}/${d}/${y}`
    }
    return new Date(iso).toLocaleDateString()
  } catch {
    return iso
  }
}

export function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
