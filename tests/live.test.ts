import { describe, expect, it as test } from 'vitest'
import { findQuietCut } from '../src/lib/transcribe/live'

const RATE = 16000

/** Rumore costante, con un tratto di silenzio dove indicato (in secondi). */
function audio(durataSec: number, silenzioDa?: number, silenzioA?: number): Float32Array {
  const s = new Float32Array(Math.round(durataSec * RATE))
  for (let i = 0; i < s.length; i++) s[i] = Math.sin(i / 8) * 0.5
  if (silenzioDa !== undefined && silenzioA !== undefined) {
    s.fill(0, Math.round(silenzioDa * RATE), Math.round(silenzioA * RATE))
  }
  return s
}

describe('taglio nel punto di silenzio', () => {
  test('taglia dentro il silenzio invece che alla fine', () => {
    // 30 s di parlato con una pausa fra il 28° e il 29° secondo
    const cut = findQuietCut(audio(30, 28, 29))
    expect(cut / RATE).toBeGreaterThanOrEqual(28)
    expect(cut / RATE).toBeLessThanOrEqual(29.2)
  })

  test('senza pause taglia in fondo, senza buttare via audio', () => {
    const s = audio(30)
    const cut = findQuietCut(s)
    expect(cut).toBeLessThanOrEqual(s.length)
    expect(cut / RATE).toBeGreaterThan(27)
  })

  test('cerca solo nel tratto finale, non rimanda indietro tutta la finestra', () => {
    // il silenzio all'inizio non deve attirare il taglio
    const cut = findQuietCut(audio(30, 1, 3))
    expect(cut / RATE).toBeGreaterThan(20)
  })

  test('su una finestra brevissima non taglia niente', () => {
    const s = audio(0.05)
    expect(findQuietCut(s)).toBe(s.length)
  })

  test('non restituisce mai un indice fuori dai campioni', () => {
    for (const d of [0.2, 1, 5, 12.5]) {
      const s = audio(d)
      const cut = findQuietCut(s)
      expect(cut).toBeGreaterThan(0)
      expect(cut).toBeLessThanOrEqual(s.length)
    }
  })
})
