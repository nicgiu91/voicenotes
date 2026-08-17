import type { Note } from '../types'
import { formatDuration, formatTimestamp } from '../format'
import { groupSegments } from '../transcribe/merge'

/**
 * Converte una nota in Markdown compatibile con Obsidian:
 * frontmatter YAML, trascrizione con timestamp, riepiloghi e mappa mentale
 * in blocco mermaid. Funzione pura, testata in tests/export.test.ts.
 */
export function noteToMarkdown(note: Note, templateNames: Record<string, string> = {}): string {
  const date = new Date(note.createdAt)
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

  const lines: string[] = ['---']
  lines.push(`titolo: "${note.title.replace(/"/g, '\\"')}"`)
  lines.push(`data: ${iso}`)
  lines.push(`durata: ${formatDuration(note.durationSec)}`)
  if (note.tags.length > 0) {
    lines.push('tags:')
    for (const t of note.tags) lines.push(`  - ${t}`)
  }
  lines.push('origine: VoiceNotes')
  lines.push('---')
  lines.push('')
  lines.push(`# ${note.title}`)
  lines.push('')

  if (note.summaries && Object.keys(note.summaries).length > 0) {
    for (const [id, text] of Object.entries(note.summaries)) {
      const name =
        id === 'diarizzazione' ? 'Trascrizione per interlocutore' : (templateNames[id] ?? id)
      lines.push(`## Riepilogo — ${name}`)
      lines.push('')
      lines.push(text.trim())
      lines.push('')
    }
  }

  if (note.mindmap) {
    lines.push('## Mappa mentale')
    lines.push('')
    lines.push('```mermaid')
    lines.push(note.mindmap.mermaid.trim())
    lines.push('```')
    lines.push('')
  }

  if (note.transcript && note.transcript.segments.length > 0) {
    lines.push('## Trascrizione')
    lines.push('')
    for (const group of groupSegments(note.transcript.segments)) {
      lines.push(`${formatTimestamp(group[0].start)} ${group.map((s) => s.text).join(' ')}`)
      lines.push('')
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}
