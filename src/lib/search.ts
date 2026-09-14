import type { Note } from './types'

/** Pezzo di testo attorno alla parola trovata, già diviso per essere evidenziato. */
export interface Snippet {
  before: string
  match: string
  after: string
}

export type MatchField = 'title' | 'transcript' | 'summary' | 'tag'

export interface NoteMatch {
  note: Note
  field: MatchField
  snippet?: Snippet
}

/** Caratteri attorno alla parola trovata, da una parte e dall'altra. */
const RADIUS = 70

/**
 * Minuscole e senza accenti, ma conservando la corrispondenza con il testo
 * originale: "perche" deve trovare "perché" e l'anteprima deve restare leggibile.
 */
function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = ''
  const map: number[] = []
  let i = 0
  for (const ch of s) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() || ch.toLowerCase()
    // si avanza per unita' della stringa, non per caratteri "logici": un emoji
    // ne occupa due, e contarlo una volta sola sfasava tutte le posizioni dopo
    for (let k = 0; k < base.length; k++) {
      folded += base[k]
      map.push(i)
    }
    i += ch.length
  }
  return { folded, map }
}

export function fold(s: string): string {
  return foldWithMap(s).folded
}

/** Ritaglia il testo attorno alla prima occorrenza, senza spezzare le parole. */
export function snippetAround(text: string, word: string): Snippet | undefined {
  if (!word) return undefined
  const { folded, map } = foldWithMap(text)
  const at = folded.indexOf(fold(word))
  if (at === -1) return undefined

  const start = map[at]
  const endFolded = Math.min(at + fold(word).length, map.length)
  const end = endFolded < map.length ? map[endFolded] : text.length

  let from = Math.max(0, start - RADIUS)
  let to = Math.min(text.length, end + RADIUS)
  // non tagliare a metà di una parola, se c'è uno spazio vicino
  if (from > 0) {
    const space = text.indexOf(' ', from)
    if (space !== -1 && space < start) from = space + 1
  }
  if (to < text.length) {
    const space = text.lastIndexOf(' ', to)
    if (space !== -1 && space > end) to = space
  }
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, start),
    match: text.slice(start, end),
    after: text.slice(end, to) + (to < text.length ? '…' : ''),
  }
}

function summariesText(note: Note): string {
  return Object.values(note.summaries ?? {}).join('\n')
}

/**
 * Cerca in titolo, trascrizione, riepiloghi ed etichette. Tutte le parole
 * scritte devono comparire da qualche parte nella nota (non per forza insieme),
 * e l'anteprima mostra il punto in cui compare la parola più lunga.
 */
export function searchNotes(notes: Note[], query: string): NoteMatch[] {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return notes.map((note) => ({ note, field: 'title' }))

  const out: NoteMatch[] = []
  for (const note of notes) {
    const transcript = note.transcript?.text ?? ''
    const summaries = summariesText(note)
    const tags = note.tags.join(' ')
    const haystack = fold(`${note.title}\n${transcript}\n${summaries}\n${tags}`)
    if (!words.every((w) => haystack.includes(w))) continue

    // la parola più lunga è la più significativa: è lì che conviene guardare
    const best = [...words].sort((a, b) => b.length - a.length)[0]
    const source: [MatchField, string][] = [
      ['transcript', transcript],
      ['summary', summaries],
      ['title', note.title],
      ['tag', tags],
    ]
    const found = source
      .map(([field, text]) => ({ field, snippet: snippetAround(text, best) }))
      .find((x) => x.snippet)

    out.push({ note, field: found?.field ?? 'title', snippet: found?.snippet })
  }
  return out
}
