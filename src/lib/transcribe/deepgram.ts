import { t } from '../i18n'
import type { TranscribeSettings, TranscriptSegment } from '../types'
import type { TranscriptPart } from './merge'

/** Forma della risposta di Deepgram che ci interessa. */
interface DeepgramWord {
  word: string
  punctuated_word?: string
  start: number
  end: number
  speaker?: number
}

interface DeepgramResponse {
  results?: {
    channels?: {
      alternatives?: { transcript?: string; words?: DeepgramWord[] }[]
    }[]
    // presente solo se si chiede la lingua automatica
    channels_metadata?: { language?: string }[]
  }
}

/**
 * Raggruppa le parole in battute: si chiude la battuta quando cambia chi parla.
 * Deepgram numera gli interlocutori 0, 1, 2… nell'ordine in cui compaiono.
 */
export function mapDeepgram(data: DeepgramResponse, fallbackDurationSec: number): TranscriptPart {
  const alt = data.results?.channels?.[0]?.alternatives?.[0]
  const words = alt?.words ?? []
  const full = (alt?.transcript ?? '').trim()

  if (words.length === 0) {
    return {
      text: full,
      segments: full ? [{ start: 0, end: fallbackDurationSec, text: full }] : [],
    }
  }

  const segments: TranscriptSegment[] = []
  let current: TranscriptSegment | null = null
  for (const w of words) {
    const testo = w.punctuated_word ?? w.word
    if (!current || current.speaker !== w.speaker) {
      if (current) segments.push(current)
      current = { start: w.start, end: w.end, text: testo, speaker: w.speaker }
    } else {
      current.text += ` ${testo}`
      current.end = w.end
    }
  }
  if (current) segments.push(current)

  return {
    text: full || segments.map((s) => s.text).join(' '),
    segments,
  }
}

/**
 * Trascrizione con Deepgram: separa davvero le voci e restituisce i tempi
 * parola per parola, cose che il protocollo OpenAI-compatible non dà.
 *
 * L'audio viene inviato intero, non a pezzi: spezzandolo, la numerazione degli
 * interlocutori ripartirebbe da zero a ogni pezzo e "voce 1" non sarebbe più
 * la stessa persona.
 */
export async function transcribeWithDeepgram(
  blob: Blob,
  settings: TranscribeSettings,
  fallbackDurationSec: number,
): Promise<TranscriptPart & { language?: string }> {
  if (!settings.apiKey) throw new Error(t('err.transcribeConfigure'))

  const params = new URLSearchParams({
    model: settings.model || 'nova-3',
    diarize_model: 'latest',
    smart_format: 'true',
    punctuate: 'true',
    // esclude gli audio dall'addestramento dei loro modelli: costa il doppio
    // del prezzo di listino, ma è l'impostazione che rispetta chi registra
    mip_opt_out: 'true',
  })
  if (settings.language) params.set('language', settings.language)
  else params.set('detect_language', 'true')

  const url = `${settings.baseUrl.replace(/\/+$/, '')}/listen?${params.toString()}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Token ${settings.apiKey}`,
      'Content-Type': blob.type || 'audio/webm',
    },
    body: blob,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw Object.assign(
      new Error(t('err.transcribeFailed', { status: res.status, body: body.slice(0, 300) })),
      { status: res.status },
    )
  }

  const data = (await res.json()) as DeepgramResponse
  return {
    ...mapDeepgram(data, fallbackDurationSec),
    language: data.results?.channels_metadata?.[0]?.language,
  }
}
