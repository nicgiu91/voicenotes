import { describe, expect, it as test } from 'vitest'
import { fold, searchNotes, snippetAround } from '../src/lib/search'
import type { Note } from '../src/lib/types'

const nota = (over: Partial<Note>): Note => ({
  id: crypto.randomUUID(),
  title: 'Senza titolo',
  createdAt: Date.now(),
  durationSec: 0,
  mimeType: 'audio/webm',
  tags: [],
  status: 'ready',
  ...over,
})

const conTesto = (text: string, over: Partial<Note> = {}) =>
  nota({ transcript: { text, segments: [], createdAt: Date.now() }, ...over })

describe('normalizzazione', () => {
  test('toglie accenti e maiuscole', () => {
    expect(fold('Perché È Così')).toBe('perche e cosi')
  })

  test('non cambia la lunghezza del testo', () => {
    const s = 'però è più àccentàto'
    expect(fold(s).length).toBe(s.length)
  })
})

describe('anteprima del punto trovato', () => {
  const testo = 'Abbiamo parlato dei tempi di consegna con il fornitore di Milano e poi del listino.'

  test('taglia attorno alla parola e la isola', () => {
    const s = snippetAround(testo, 'fornitore')
    expect(s?.match).toBe('fornitore')
    expect(`${s?.before}${s?.match}${s?.after}`.replace(/…/g, '')).toContain('consegna con il fornitore')
  })

  test('trova anche scrivendo senza accento, e restituisce il testo com’è', () => {
    const s = snippetAround('Il perché della cosa', 'perche')
    expect(s?.match).toBe('perché')
  })

  test('segnala col puntino che il testo continua', () => {
    const lungo = `${'parola '.repeat(50)}ago${' parola'.repeat(50)}`
    const s = snippetAround(lungo, 'ago')
    expect(s?.before.startsWith('…')).toBe(true)
    expect(s?.after.endsWith('…')).toBe(true)
  })

  test('se la parola non c’è non inventa un’anteprima', () => {
    expect(snippetAround(testo, 'inesistente')).toBeUndefined()
  })
})

describe('ricerca fra le note', () => {
  const note = [
    conTesto('Abbiamo parlato del fornitore di Milano', { title: 'Riunione lunedì' }),
    conTesto('Lezione sulla conservazione dei vaccini', { title: 'Corso' }),
    nota({ title: 'Nota senza trascrizione', tags: ['idee'] }),
    conTesto('testo qualsiasi', {
      title: 'Con riepilogo',
      summaries: { generico: 'Punti principali: ordinare le siringhe' },
    }),
  ]

  test('senza query restituisce tutto', () => {
    expect(searchNotes(note, '  ').length).toBe(4)
  })

  test('cerca nella trascrizione', () => {
    const r = searchNotes(note, 'fornitore')
    expect(r.length).toBe(1)
    expect(r[0].field).toBe('transcript')
    expect(r[0].snippet?.match).toBe('fornitore')
  })

  test('cerca anche nei riepiloghi, cosa che prima non faceva', () => {
    const r = searchNotes(note, 'siringhe')
    expect(r.length).toBe(1)
    expect(r[0].field).toBe('summary')
  })

  test('cerca nel titolo e nelle etichette', () => {
    expect(searchNotes(note, 'lunedi')[0].field).toBe('title')
    expect(searchNotes(note, 'idee')[0].note.title).toBe('Nota senza trascrizione')
  })

  test('tutte le parole scritte devono comparire, anche in punti diversi', () => {
    expect(searchNotes(note, 'riunione fornitore').length).toBe(1)
    expect(searchNotes(note, 'riunione vaccini').length).toBe(0)
  })

  test('gli accenti non contano', () => {
    expect(searchNotes(note, 'lunedì').length).toBe(1)
    expect(searchNotes(note, 'LUNEDI').length).toBe(1)
  })
})
