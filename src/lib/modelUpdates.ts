/**
 * Riconosce, nell'elenco dei modelli restituito da un servizio, la versione
 * più recente della stessa famiglia di quello in uso: "claude-sonnet-5-5"
 * diventa "claude-sonnet-5-6", "gemini-3.8-flash" diventa "gemini-3.9-flash".
 *
 * L'app non può leggere i listini dei servizi (nessun server nostro, e i siti
 * non lo permettono dal browser): conosce solo i nomi. Per questo si resta
 * dentro la famiglia — un Sonnet non diventa mai un Opus, che costa di più —
 * e la scelta finale è sempre dell'utente. Funzioni pure, testate.
 */

export interface ParsedModelId {
  /** le parole del nome senza i numeri: "claude-sonnet", "gemini-flash-lite" */
  family: string
  /** i numeri di versione nell'ordine: [5, 5], [3, 8] */
  version: number[]
}

/** Toglie la data di uno snapshot: "-20251001", "-2024-07-18". */
function stripSnapshot(id: string): string {
  return id.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-\d{8}$/, '')
}

/**
 * Null quando il nome non ha un numero di versione (non si sa cosa sia "più
 * nuovo") o è un alias come "-latest", che si aggiorna già da solo.
 */
export function parseModelId(id: string): ParsedModelId | null {
  const tokens = stripSnapshot(id.toLowerCase()).split(/[-.]/).filter(Boolean)
  if (tokens.includes('latest')) return null
  const words: string[] = []
  const version: number[] = []
  for (const tok of tokens) {
    if (/^\d{1,2}$/.test(tok)) version.push(Number(tok))
    // tre cifre o più sono date di snapshot ("0309"), non versioni
    else if (!/^\d+$/.test(tok)) words.push(tok)
  }
  if (version.length === 0 || words.length === 0) return null
  return { family: words.join('-'), version }
}

export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export type ModelCheck =
  | { status: 'ok' }
  | { status: 'newer'; next: string }
  | { status: 'missing'; next?: string }

/**
 * Confronta il modello in uso con quelli offerti dal servizio.
 * - 'missing': il servizio non lo offre più (le richieste fallirebbero);
 * - 'newer': c'è una versione più recente della stessa famiglia;
 * - 'ok': niente da fare, oppure nessun confronto possibile.
 */
export function checkModel(current: string, available: string[]): ModelCheck {
  if (!current || available.length === 0) return { status: 'ok' }
  const base = stripSnapshot(current)
  // "claude-haiku-4-5" e "claude-haiku-4-5-20251001" sono lo stesso modello
  const present = available.some((a) => a === current || stripSnapshot(a) === base)

  const mine = parseModelId(current)
  let next: string | undefined
  if (mine) {
    let best = mine.version
    for (const a of available) {
      const p = parseModelId(a)
      if (!p || p.family !== mine.family) continue
      if (compareVersions(p.version, best) > 0) {
        best = p.version
        next = a
      } else if (next && compareVersions(p.version, best) === 0 && a.length < next.length) {
        // a parità di versione si preferisce l'alias senza data
        next = a
      }
    }
  }

  if (!present) return next ? { status: 'missing', next } : { status: 'missing' }
  return next ? { status: 'newer', next } : { status: 'ok' }
}
