import { describe, expect, it as test } from 'vitest'
import { importTranscriptText, parseImportedText, parseLooseDate, titleFromText } from '../src/lib/import/text'

describe('titolo ricavato dal testo', () => {
  test('usa la prima riga piena', () => {
    expect(titleFromText('\n\nRiunione con il fornitore\nabbiamo parlato di…')).toBe(
      'Riunione con il fornitore',
    )
  })

  test('toglie i segni del Markdown e degli elenchi', () => {
    expect(titleFromText('## Appunti del lunedì')).toBe('Appunti del lunedì')
    expect(titleFromText('- primo punto')).toBe('primo punto')
    expect(titleFromText('1. primo punto')).toBe('primo punto')
    expect(titleFromText('> citazione')).toBe('citazione')
  })

  test('toglie i due punti finali', () => {
    expect(titleFromText('Cose da ordinare:')).toBe('Cose da ordinare')
  })

  test('accorcia le righe lunghissime', () => {
    const lungo = 'parola '.repeat(40)
    const titolo = titleFromText(lungo)
    expect(titolo.length).toBeLessThanOrEqual(81)
    expect(titolo.endsWith('…')).toBe(true)
  })

  test('su un testo senza righe utili non inventa niente', () => {
    expect(titleFromText('   \n\n  \n')).toBe('')
    expect(titleFromText('')).toBe('')
  })
})

describe('creazione della nota da testo', () => {
  test('un testo vuoto viene rifiutato prima di toccare il database', async () => {
    await expect(importTranscriptText('   \n  ')).rejects.toThrow()
    await expect(importTranscriptText('')).rejects.toThrow()
  })
})

describe('file dei Comandi Rapidi', () => {
  const sogno = [
    '---',
    'tipo: sogno',
    'data: 2026-10-01 07:12',
    '---',
    '# Sogno 2026-10-01 07:12',
    '',
    'ero nella casa dei nonni e pioveva dentro',
    '',
    '## Risposta',
    '',
    '## Il sogno',
    'Sono nella casa dei nonni.',
  ].join('\n')

  test('separa testo dettato, titolo, data e risposta', () => {
    const p = parseImportedText(sogno)
    expect(p.text).toBe('ero nella casa dei nonni e pioveva dentro')
    expect(p.title).toBe('Sogno 2026-10-01 07:12')
    expect(p.createdAt).toBe(new Date(2026, 9, 1, 7, 12).getTime())
    expect(p.tags).toEqual(['sogno'])
    // la risposta tiene i suoi titoli interni: si taglia solo al primo "## Risposta"
    expect(p.reply).toEqual({ templateId: 'sogno', text: '## Il sogno\nSono nella casa dei nonni.' })
  })

  test('accetta gli a capo di Windows e il BOM', () => {
    const p = parseImportedText('﻿' + sogno.replace(/\n/g, '\r\n'))
    expect(p.tags).toEqual(['sogno'])
    expect(p.text).toBe('ero nella casa dei nonni e pioveva dentro')
  })

  test('un tipo sconosciuto diventa etichetta, la risposta va nel riepilogo generico', () => {
    const p = parseImportedText('---\ntipo: Ricetta\n---\npasta e ceci\n## Risposta\nok')
    expect(p.tags).toEqual(['ricetta'])
    expect(p.reply?.templateId).toBe('generico')
  })

  test('senza risposta non inventa un riepilogo vuoto', () => {
    expect(parseImportedText('---\ntipo: idea\n---\nun negozio di bici\n## Risposta\n').reply).toBeUndefined()
    expect(parseImportedText('---\ntipo: idea\n---\nun negozio di bici').reply).toBeUndefined()
  })

  test('un testo normale resta intatto, anche con titoli e trattini', () => {
    const libero = '# Appunti\n---\n## Risposta\nnon sono un file dei Comandi'
    const p = parseImportedText(libero)
    expect(p.text).toBe(libero)
    expect(p.tags).toEqual([])
    expect(p.reply).toBeUndefined()
  })

  test('la data si prende, in ordine: intestazione, nome del file, data del file', () => {
    const file = new Date(2026, 0, 2).getTime()
    expect(parseImportedText('---\ndata: 2026-03-04\n---\nx', '2026-05-06 Idea.md', file).createdAt).toBe(
      new Date(2026, 2, 4).getTime(),
    )
    expect(parseImportedText('ciao', '2026-05-06 08.30 Idea.md', file).createdAt).toBe(
      new Date(2026, 4, 6, 8, 30).getTime(),
    )
    expect(parseImportedText('ciao', 'idea.md', file).createdAt).toBe(file)
    expect(parseImportedText('ciao').createdAt).toBeUndefined()
  })

  test('le date impossibili vengono scartate', () => {
    expect(parseLooseDate('2026-02-31')).toBeUndefined()
    expect(parseLooseDate('2026-10-01 25:00')).toBeUndefined()
    expect(parseLooseDate('nessuna data')).toBeUndefined()
  })
})
