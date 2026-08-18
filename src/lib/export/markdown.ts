import type { Note } from '../types'
import { formatDuration, formatTimestamp } from '../format'
import { groupSegments } from '../transcribe/merge'
import { t } from '../i18n'

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
  lines.push(`${t('export.fmTitle')}: "${note.title.replace(/"/g, '\\"')}"`)
  lines.push(`${t('export.fmDate')}: ${iso}`)
  lines.push(`${t('export.fmDuration')}: ${formatDuration(note.durationSec)}`)
  if (note.tags.length > 0) {
    lines.push(`${t('export.fmTags')}:`)
    for (const tag of note.tags) lines.push(`  - ${tag}`)
  }
  lines.push(`${t('export.fmSource')}: VoiceNotes`)
  lines.push('---')
  lines.push('')
  lines.push(`# ${note.title}`)
  lines.push('')

  if (note.summaries && Object.keys(note.summaries).length > 0) {
    for (const [id, text] of Object.entries(note.summaries)) {
      const name = id === 'diarizzazione' ? t('note.diarizationName') : (templateNames[id] ?? id)
      lines.push(`## ${t('export.summary')} — ${name}`)
      lines.push('')
      lines.push(text.trim())
      lines.push('')
    }
  }

  if (note.mindmap) {
    lines.push(`## ${t('export.mindmap')}`)
    lines.push('')
    lines.push('```mermaid')
    lines.push(note.mindmap.mermaid.trim())
    lines.push('```')
    lines.push('')
  }

  if (note.transcript && note.transcript.segments.length > 0) {
    lines.push(`## ${t('export.transcript')}`)
    lines.push('')
    for (const group of groupSegments(note.transcript.segments)) {
      lines.push(`${formatTimestamp(group[0].start)} ${group.map((s) => s.text).join(' ')}`)
      lines.push('')
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n'
}
