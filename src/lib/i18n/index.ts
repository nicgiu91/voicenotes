import { useSyncExternalStore } from 'react'
import { it, type TKey } from './it'
import { en } from './en'

export type Lang = 'it' | 'en'
export type { TKey }

const dictionaries: Record<Lang, Record<TKey, string>> = { it, en }

let current: Lang = 'it'
const listeners = new Set<() => void>()

/** Lingua da usare al primo avvio, dedotta dal browser. */
export function detectLang(): Lang {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'it'
  return nav.toLowerCase().startsWith('it') ? 'it' : 'en'
}

export function getLang(): Lang {
  return current
}

export function setLang(lang: Lang): void {
  if (lang === current) return
  current = lang
  if (typeof document !== 'undefined') document.documentElement.lang = lang
  for (const l of listeners) l()
}

/** Codice locale per date e numeri. */
export function locale(): string {
  return current === 'it' ? 'it-IT' : 'en-US'
}

/**
 * Traduce una chiave nella lingua corrente, sostituendo i segnaposto {nome}.
 * Utilizzabile anche fuori dai componenti React (es. messaggi di errore in lib/).
 */
export function t(key: TKey, vars?: Record<string, string | number>): string {
  const text = dictionaries[current][key] ?? dictionaries.it[key] ?? key
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  )
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Hook React: restituisce la funzione di traduzione e rerenderizza
 * automaticamente quando l'utente cambia lingua.
 */
export function useT(): { t: typeof t; lang: Lang } {
  const lang = useSyncExternalStore(subscribe, getLang, getLang)
  return { t, lang }
}
