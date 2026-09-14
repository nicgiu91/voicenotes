import { describe, expect, it as test } from 'vitest'
import { mapDeepgram } from '../src/lib/transcribe/deepgram'
import { groupSegments } from '../src/lib/transcribe/merge'

const risposta = (words: unknown[], transcript = '') => ({
  results: { channels: [{ alternatives: [{ transcript, words }] }] },
})

describe('lettura della risposta di Deepgram', () => {
  test('raggruppa le parole per interlocutore', () => {
    const r = mapDeepgram(
      risposta([
        { word: 'buongiorno', punctuated_word: 'Buongiorno,', start: 0, end: 0.6, speaker: 0 },
        { word: 'dottore', punctuated_word: 'dottore.', start: 0.6, end: 1.2, speaker: 0 },
        { word: 'buongiorno', punctuated_word: 'Buongiorno!', start: 1.5, end: 2.1, speaker: 1 },
        { word: 'allora', punctuated_word: 'Allora,', start: 2.4, end: 3, speaker: 0 },
      ]),
      10,
    )
    expect(r.segments.map((s) => s.speaker)).toEqual([0, 1, 0])
    expect(r.segments[0].text).toBe('Buongiorno, dottore.')
    expect(r.segments[0].start).toBe(0)
    expect(r.segments[0].end).toBe(1.2)
  })

  test('usa la parola con la punteggiatura quando c’è', () => {
    const r = mapDeepgram(risposta([{ word: 'ciao', start: 0, end: 1, speaker: 0 }]), 5)
    expect(r.segments[0].text).toBe('ciao')
  })

  test('preferisce il testo completo del servizio', () => {
    const r = mapDeepgram(
      risposta([{ word: 'uno', start: 0, end: 1, speaker: 0 }], 'Testo completo del servizio.'),
      5,
    )
    expect(r.text).toBe('Testo completo del servizio.')
  })

  test('senza parole ripiega su un unico blocco lungo quanto l’audio', () => {
    const r = mapDeepgram(risposta([], 'Solo testo.'), 42)
    expect(r.segments).toEqual([{ start: 0, end: 42, text: 'Solo testo.' }])
  })

  test('una risposta vuota non produce segmenti', () => {
    expect(mapDeepgram({}, 10).segments).toEqual([])
  })
})

describe('paragrafi con più voci', () => {
  test('il cambio di interlocutore chiude il paragrafo anche senza pause', () => {
    const groups = groupSegments([
      { start: 0, end: 1, text: 'prima voce', speaker: 0 },
      { start: 1, end: 2, text: 'seconda voce', speaker: 1 },
      { start: 2, end: 3, text: 'ancora la seconda', speaker: 1 },
    ])
    expect(groups.length).toBe(2)
    expect(groups[0][0].speaker).toBe(0)
    expect(groups[1].length).toBe(2)
  })

  test('senza interlocutori il raggruppamento resta quello di prima', () => {
    const groups = groupSegments([
      { start: 0, end: 1, text: 'una frase' },
      { start: 1, end: 2, text: 'e un’altra' },
    ])
    expect(groups.length).toBe(1)
  })
})
