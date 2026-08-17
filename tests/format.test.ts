import { describe, expect, it } from 'vitest'
import { formatDuration, formatTimestamp, slugify } from '../src/lib/format'

describe('formatDuration', () => {
  it('formatta minuti e secondi', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(599)).toBe('9:59')
  })
  it('formatta le ore', () => {
    expect(formatDuration(3671)).toBe('1:01:11')
  })
})

describe('formatTimestamp', () => {
  it('usa [mm:ss] sotto l\'ora', () => {
    expect(formatTimestamp(65.4)).toBe('[01:05]')
    expect(formatTimestamp(0)).toBe('[00:00]')
  })
  it('usa [h:mm:ss] sopra l\'ora', () => {
    expect(formatTimestamp(3665)).toBe('[1:01:05]')
  })
})

describe('slugify', () => {
  it('rimuove accenti e caratteri speciali', () => {
    expect(slugify('Riunione: qualità 2026!')).toBe('riunione-qualita-2026')
  })
  it('non restituisce mai stringa vuota', () => {
    expect(slugify('***')).toBe('nota')
  })
})
