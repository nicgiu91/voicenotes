import { describe, expect, it } from 'vitest'
import { noteToMarkdown } from '../src/lib/export/markdown'
import type { Note } from '../src/lib/types'

const baseNote: Note = {
  id: 'n1',
  title: 'Riunione "importante"',
  createdAt: new Date(2026, 7, 17, 9, 30).getTime(),
  durationSec: 125,
  mimeType: 'audio/webm',
  tags: ['lavoro', 'fornitori'],
  status: 'ready',
  transcript: {
    text: 'Testo completo.',
    segments: [
      { start: 0, end: 3, text: 'Prima frase.' },
      { start: 65, end: 70, text: 'Seconda frase dopo pausa.' },
    ],
    createdAt: 0,
  },
  summaries: { riunione: '## Decisioni\n- una decisione' },
  mindmap: { markdown: '# Tema', mermaid: 'mindmap\n  root((Tema))' },
}

describe('noteToMarkdown', () => {
  const md = noteToMarkdown(baseNote, { riunione: 'Riunione' })

  it('produce frontmatter YAML con data, durata e tag', () => {
    expect(md.startsWith('---\n')).toBe(true)
    expect(md).toContain('titolo: "Riunione \\"importante\\""')
    expect(md).toContain('data: 2026-08-17 09:30')
    expect(md).toContain('durata: 2:05')
    expect(md).toContain('  - lavoro')
    expect(md).toContain('  - fornitori')
  })

  it('include riepilogo, mappa mermaid e trascrizione con timestamp', () => {
    expect(md).toContain('## Riepilogo — Riunione')
    expect(md).toContain('```mermaid')
    expect(md).toContain('root((Tema))')
    expect(md).toContain('[00:00] Prima frase.')
    expect(md).toContain('[01:05] Seconda frase dopo pausa.')
  })

  it('funziona anche con nota senza trascrizione', () => {
    const bare: Note = { ...baseNote, transcript: undefined, summaries: undefined, mindmap: undefined }
    const out = noteToMarkdown(bare)
    expect(out).toContain('# Riunione "importante"')
    expect(out).not.toContain('## Trascrizione')
  })
})
