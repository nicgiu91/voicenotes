import { describe, expect, it } from 'vitest'
import { groupSegments, mergeParts } from '../src/lib/transcribe/merge'

describe('mergeParts', () => {
  it('sposta i timestamp degli spezzoni successivi', () => {
    const merged = mergeParts(
      [
        { text: 'prima parte', segments: [{ start: 0, end: 5, text: 'prima parte' }] },
        { text: 'seconda parte', segments: [{ start: 2, end: 8, text: 'seconda parte' }] },
      ],
      [0, 600],
    )
    expect(merged.segments).toEqual([
      { start: 0, end: 5, text: 'prima parte' },
      { start: 602, end: 608, text: 'seconda parte' },
    ])
    expect(merged.text).toBe('prima parte\nseconda parte')
  })

  it('ignora parti vuote nel testo unito', () => {
    const merged = mergeParts(
      [
        { text: 'ciao', segments: [{ start: 0, end: 1, text: 'ciao' }] },
        { text: '  ', segments: [] },
      ],
      [0, 600],
    )
    expect(merged.text).toBe('ciao')
  })
})

describe('groupSegments', () => {
  it('spezza il paragrafo dopo una pausa lunga', () => {
    const groups = groupSegments([
      { start: 0, end: 2, text: 'uno' },
      { start: 2.5, end: 4, text: 'due' },
      { start: 10, end: 12, text: 'tre' },
    ])
    expect(groups.length).toBe(2)
    expect(groups[0].map((s) => s.text)).toEqual(['uno', 'due'])
    expect(groups[1].map((s) => s.text)).toEqual(['tre'])
  })

  it('spezza il paragrafo dopo ~40 parole', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      start: i * 2,
      end: i * 2 + 1.5,
      text: 'cinque parole per ogni segmento qui',
    }))
    const groups = groupSegments(many)
    expect(groups.length).toBeGreaterThan(1)
  })
})
