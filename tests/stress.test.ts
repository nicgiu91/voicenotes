import { describe, expect, it as test } from 'vitest'
import { fold, searchNotes, snippetAround } from '../src/lib/search'
import { titleFromText } from '../src/lib/import/text'
import { mapDeepgram } from '../src/lib/transcribe/deepgram'
import { findQuietCut } from '../src/lib/transcribe/live'
import { groupSegments, mergeParts } from '../src/lib/transcribe/merge'
import { markdownToMermaidMindmap } from '../src/lib/llm/mindmap'
import type { Note } from '../src/lib/types'

/**
 * Prove cattive: input che un utente vero prima o poi produce per sbaglio
 * (incolla un PDF intero, cerca una parentesi, registra il silenzio).
 * Qui non si controlla che il risultato sia bello, ma che niente esploda.
 */

const nota = (over: Partial<Note> = {}): Note => ({
  id: crypto.randomUUID(),
  title: 'Nota',
  createdAt: Date.now(),
  durationSec: 0,
  mimeType: 'audio/webm',
  tags: [],
  status: 'ready',
  ...over,
})

describe('ricerca sotto stress', () => {
  const note = [
    nota({ title: 'Costi (2026) [bozza]', transcript: { text: 'a+b = c*d', segments: [], createdAt: 0 } }),
    nota({ title: '🎉 emoji e simboli', transcript: { text: 'però caffè 100% ok', segments: [], createdAt: 0 } }),
  ]

  test('i caratteri speciali non vengono presi per espressioni regolari', () => {
    for (const q of ['(', ')', '[', '*', '+', '?', '\\', '.*', '$^', '((((']) {
      expect(() => searchNotes(note, q)).not.toThrow()
    }
    expect(searchNotes(note, '(2026)').length).toBe(1)
    expect(searchNotes(note, 'a+b').length).toBe(1)
  })

  test('gli emoji non spostano l’anteprima né rompono la normalizzazione', () => {
    expect(() => fold('🎉👨‍👩‍👧‍👦')).not.toThrow()
    const s = snippetAround('prima 🎉 dopo la parola cercata', 'parola')
    expect(s?.match).toBe('parola')
  })

  test('una ricerca lunghissima non trova nulla senza lamentarsi', () => {
    expect(searchNotes(note, 'x'.repeat(5000)).length).toBe(0)
  })

  test('note senza trascrizione, senza etichette e con campi vuoti', () => {
    expect(() => searchNotes([nota({ title: '' })], 'qualcosa')).not.toThrow()
    expect(searchNotes([nota({ title: '' })], '').length).toBe(1)
  })

  test('cerca dentro un testo molto grande in tempi ragionevoli', () => {
    const grande = nota({
      transcript: { text: `${'parola '.repeat(200_000)}ago`, segments: [], createdAt: 0 },
    })
    const avvio = Date.now()
    const r = searchNotes([grande], 'ago')
    expect(r.length).toBe(1)
    expect(Date.now() - avvio).toBeLessThan(4000)
  })
})

describe('importazione di testo sotto stress', () => {
  test('righe fatte solo di segni non producono un titolo assurdo', () => {
    expect(titleFromText('###')).toBe('')
    expect(titleFromText('---\n\n- - -')).toBe('')
    expect(titleFromText('...')).toBe('')
  })

  test('una parola sola lunghissima viene accorciata', () => {
    const t = titleFromText('a'.repeat(5000))
    expect(t.length).toBeLessThanOrEqual(81)
  })

  test('testo con soli a capo e spazi non dà titolo', () => {
    expect(titleFromText('\r\n\r\n   \t  \n')).toBe('')
  })
})

describe('risposte malformate dai servizi', () => {
  test('campi mancanti o strutture impreviste non fanno crollare la lettura', () => {
    const casi: unknown[] = [
      {},
      { results: {} },
      { results: { channels: [] } },
      { results: { channels: [{}] } },
      { results: { channels: [{ alternatives: [] }] } },
      { results: { channels: [{ alternatives: [{}] }] } },
      null,
      undefined,
    ]
    for (const c of casi) {
      expect(() => mapDeepgram((c ?? {}) as never, 10)).not.toThrow()
    }
  })

  test('parole senza interlocutore finiscono comunque in un blocco', () => {
    const r = mapDeepgram(
      { results: { channels: [{ alternatives: [{ words: [{ word: 'ciao', start: 0, end: 1 }] }] }] } },
      5,
    )
    expect(r.segments.length).toBe(1)
    expect(r.segments[0].speaker).toBeUndefined()
  })

  test('tanti cambi di voce non degenerano', () => {
    const words = Array.from({ length: 2000 }, (_, i) => ({
      word: `p${i}`,
      start: i,
      end: i + 1,
      speaker: i % 3,
    }))
    const r = mapDeepgram({ results: { channels: [{ alternatives: [{ words }] }] } }, 2000)
    expect(r.segments.length).toBe(2000)
    expect(groupSegments(r.segments).length).toBe(2000)
  })
})

describe('audio anomalo', () => {
  test('finestra vuota', () => {
    expect(findQuietCut(new Float32Array(0))).toBe(0)
  })

  test('silenzio totale', () => {
    const s = new Float32Array(16000 * 10)
    const cut = findQuietCut(s)
    expect(cut).toBeGreaterThan(0)
    expect(cut).toBeLessThanOrEqual(s.length)
  })

  test('valori sporchi non producono un indice non valido', () => {
    const s = new Float32Array(16000 * 5)
    s.fill(NaN, 0, 1000)
    const cut = findQuietCut(s)
    expect(Number.isInteger(cut)).toBe(true)
    expect(cut).toBeGreaterThanOrEqual(0)
    expect(cut).toBeLessThanOrEqual(s.length)
  })
})

describe('fusione e mappa mentale', () => {
  test('nessuna parte da unire', () => {
    expect(() => mergeParts([], [])).not.toThrow()
  })

  test('markdown storto non genera mermaid rotto', () => {
    for (const m of ['', '   ', '#', '- \n- \n-', 'testo senza struttura', '```\n```']) {
      expect(() => markdownToMermaidMindmap(m)).not.toThrow()
    }
  })
})
