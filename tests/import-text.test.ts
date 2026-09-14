import { describe, expect, it as test } from 'vitest'
import { importTranscriptText, titleFromText } from '../src/lib/import/text'

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
