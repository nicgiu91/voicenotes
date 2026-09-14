import { t } from './i18n'

export type ApiErrorKind = 'llm' | 'transcribe'

/** Dettaglio tecnico tenuto corto: serve a chi indaga, non a chi legge. */
const DETAIL_MAX = 160

/**
 * Traduce la risposta di errore di un servizio in una frase che dica
 * all'utente cosa è successo e cosa può fare. Il corpo grezzo della risposta
 * resta in coda, accorciato: senza, diventa impossibile capire i casi strani.
 */
export function describeApiError(status: number, body: string, kind: ApiErrorKind): string {
  const low = body.toLowerCase()
  const dettaglio = body.trim().replace(/\s+/g, ' ').slice(0, DETAIL_MAX)

  // OpenAI risponde 429 sia per "troppe richieste" sia per "credito finito":
  // lo stato da solo non basta, bisogna guardare cosa dice la risposta
  const parlaDiCredito =
    low.includes('credit') ||
    low.includes('quota') ||
    low.includes('billing') ||
    low.includes('payment') ||
    low.includes('insufficient')
  const parlaDiFrequenza = low.includes('rate limit') || low.includes('too many requests')

  let spiegazione: string
  if (status === 401 || status === 403) {
    spiegazione = t('err.apiKey')
  } else if (status === 402 || (parlaDiCredito && !parlaDiFrequenza)) {
    spiegazione = t('err.apiCredit')
  } else if (status === 429) {
    spiegazione = t('err.apiRate')
  } else if (status === 404 || low.includes('model') && low.includes('not found')) {
    spiegazione = t('err.apiModel')
  } else if (status === 413 || low.includes('too large') || low.includes('maximum size')) {
    spiegazione = kind === 'transcribe' ? t('err.apiTooBig') : t('err.apiTooLong')
  } else if (status >= 500) {
    spiegazione = t('err.apiServer')
  } else {
    spiegazione = kind === 'transcribe' ? t('err.apiTranscribeGeneric') : t('err.apiLlmGeneric')
  }

  return dettaglio ? `${spiegazione} ${t('err.apiDetail', { status, detail: dettaglio })}` : spiegazione
}

/**
 * Quando fetch stesso fallisce non c'è nessuno stato HTTP: quasi sempre è
 * l'indirizzo sbagliato, la rete assente, o un servizio che rifiuta le
 * chiamate dal browser.
 */
export function describeNetworkError(kind: ApiErrorKind): string {
  return kind === 'transcribe' ? t('err.netTranscribe') : t('err.netLlm')
}
