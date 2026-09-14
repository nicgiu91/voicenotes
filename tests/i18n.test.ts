import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it as test } from 'vitest'
import { it as dictIt } from '../src/lib/i18n/it'
import { en } from '../src/lib/i18n/en'
import { getLang, setLang, t } from '../src/lib/i18n'

afterEach(() => setLang('it'))

describe('dizionari', () => {
  test('inglese e italiano hanno esattamente le stesse chiavi', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(dictIt).sort())
  })

  test('nessuna traduzione è vuota', () => {
    for (const [key, value] of Object.entries(en)) {
      expect(value.trim(), `chiave inglese vuota: ${key}`).not.toBe('')
    }
    for (const [key, value] of Object.entries(dictIt)) {
      expect(value.trim(), `chiave italiana vuota: ${key}`).not.toBe('')
    }
  })

  test('i segnaposto {…} coincidono tra le due lingue', () => {
    const holders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
    for (const key of Object.keys(dictIt) as (keyof typeof dictIt)[]) {
      expect(holders(en[key]), `segnaposto diversi per ${key}`).toEqual(holders(dictIt[key]))
    }
  })
})

describe('t()', () => {
  test('traduce nella lingua attiva', () => {
    setLang('it')
    expect(t('nav.notes')).toBe('Note')
    setLang('en')
    expect(t('nav.notes')).toBe('Notes')
  })

  test('sostituisce i segnaposto', () => {
    setLang('en')
    expect(t('settings.backupImported', { n: 3 })).toBe('Imported 3 notes.')
    setLang('it')
    expect(t('settings.backupImported', { n: 3 })).toBe('Importate 3 note.')
  })

  test('lascia intatti i segnaposto senza valore', () => {
    expect(t('note.deleteConfirm')).toContain('{title}')
  })

  test('setLang aggiorna la lingua corrente', () => {
    setLang('en')
    expect(getLang()).toBe('en')
  })
})

describe('integrità dei file di traduzione', () => {
  // Una chiave scritta due volte in un oggetto TypeScript non dà errore:
  // la seconda vince in silenzio. Qui si legge il sorgente per accorgersene.
  const chiaviDoppie = (file: string): string[] => {
    const src = readFileSync(new URL(`../src/lib/i18n/${file}`, import.meta.url), 'utf-8')
    const viste = new Set<string>()
    const doppie: string[] = []
    for (const m of src.matchAll(/^ {2}'([a-zA-Z][\w.]*)':/gm)) {
      if (viste.has(m[1])) doppie.push(m[1])
      viste.add(m[1])
    }
    return doppie
  }

  test('nessuna chiave ripetuta in italiano', () => {
    expect(chiaviDoppie('it.ts')).toEqual([])
  })

  test('nessuna chiave ripetuta in inglese', () => {
    expect(chiaviDoppie('en.ts')).toEqual([])
  })
})
