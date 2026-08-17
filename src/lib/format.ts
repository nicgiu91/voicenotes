/** 65 -> "1:05", 3671 -> "1:01:11" */
export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.round(totalSec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Timestamp per la trascrizione: 65.4 -> "[01:05]" */
export function formatTimestamp(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  if (h > 0) return `[${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}]`
  return `[${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}]`
}

export function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Nome file sicuro: "Riunione: budget 2026!" -> "riunione-budget-2026" */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'nota'
  )
}

export function defaultNoteTitle(createdAt: number): string {
  return `Registrazione ${formatDate(createdAt)}`
}
