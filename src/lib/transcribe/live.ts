import { assembleAudio } from '../audio/assemble'
import { decodeTo16kMono, encodeWav } from '../audio/wav'
import type { TranscribeSettings, TranscriptSegment } from '../types'
import { transcribeBlob } from './client'

const RATE = 16000
/** Ogni quanto si manda in trascrizione il pezzo nuovo. */
export const PASS_MS = 30_000
/** Sotto questa durata non vale la pena spedire: si aspetta il giro dopo. */
const MIN_WINDOW_SEC = 8
/** Quanto si guarda indietro per trovare un punto di silenzio dove tagliare. */
const CUT_SEARCH_SEC = 3

/**
 * Cerca il punto più silenzioso nell'ultimo tratto della finestra: tagliando lì
 * invece che di netto si evita quasi sempre di spezzare una parola a metà.
 * Restituisce l'indice del campione su cui chiudere.
 */
export function findQuietCut(samples: Float32Array, searchSec = CUT_SEARCH_SEC): number {
  const frame = Math.floor(RATE / 10) // finestrelle da 100 ms
  const from = Math.max(0, samples.length - Math.floor(searchSec * RATE))
  if (samples.length - from < frame * 2) return samples.length

  let bestAt = samples.length
  let bestEnergy = Infinity
  for (let start = from; start + frame <= samples.length; start += frame) {
    let energy = 0
    for (let i = start; i < start + frame; i++) energy += samples[i] * samples[i]
    if (energy <= bestEnergy) {
      bestEnergy = energy
      bestAt = start + frame
    }
  }
  return bestAt
}

export interface LiveUpdate {
  text: string
  segments: TranscriptSegment[]
  /** una richiesta è in corso */
  working: boolean
  error?: string
}

/**
 * Trascrizione mentre si registra, senza bisogno di un server: ogni mezzo
 * minuto prende il pezzo di audio non ancora trascritto, lo taglia in un punto
 * di silenzio e lo manda al servizio configurato.
 *
 * Non tocca il registratore: legge i pezzi che questo ha già salvato, così non
 * può interferire con la registrazione.
 */
export class LiveTranscriber {
  private timer: number | undefined
  private processedSamples = 0
  private segments: TranscriptSegment[] = []
  private running = false
  private busy = false

  constructor(
    private noteId: string,
    private settings: TranscribeSettings,
    private onUpdate: (u: LiveUpdate) => void,
  ) {}

  get text(): string {
    return this.segments.map((s) => s.text).join(' ').trim()
  }

  get result(): { text: string; segments: TranscriptSegment[] } {
    return { text: this.text, segments: [...this.segments] }
  }

  /** Permette alla pagina rimontata di riagganciare gli aggiornamenti. */
  setOnUpdate(fn: (u: LiveUpdate) => void) {
    this.onUpdate = fn
    this.emit(this.busy)
  }

  start() {
    if (this.running) return
    this.running = true
    this.timer = window.setInterval(() => void this.pass(false), PASS_MS)
  }

  /** Ultimo giro sul residuo e spegnimento. */
  async stop(): Promise<{ text: string; segments: TranscriptSegment[] }> {
    this.running = false
    if (this.timer !== undefined) window.clearInterval(this.timer)
    this.timer = undefined
    await this.pass(true)
    return this.result
  }

  private emit(working: boolean, error?: string) {
    this.onUpdate({ text: this.text, segments: [...this.segments], working, error })
  }

  private async pass(final: boolean) {
    if (this.busy) return
    this.busy = true
    this.emit(true)
    try {
      const audio = await assembleAudio(this.noteId)
      const samples = await decodeTo16kMono(audio)
      const available = samples.length - this.processedSamples
      if (available <= 0 || (!final && available < MIN_WINDOW_SEC * RATE)) {
        this.emit(false)
        return
      }

      const window = samples.subarray(this.processedSamples)
      const cut = final ? window.length : findQuietCut(window)
      if (cut <= 0) {
        this.emit(false)
        return
      }

      const offsetSec = this.processedSamples / RATE
      const blob = encodeWav(new Float32Array(window.subarray(0, cut)), RATE)
      const part = await transcribeBlob(blob, this.settings, cut / RATE)
      this.processedSamples += cut

      for (const s of part.segments) {
        if (!s.text.trim()) continue
        this.segments.push({ ...s, start: s.start + offsetSec, end: s.end + offsetSec })
      }
      this.emit(false)
    } catch (e) {
      // un giro fallito non deve fermare la registrazione: si riprova al prossimo
      this.emit(false, e instanceof Error ? e.message : String(e))
    } finally {
      this.busy = false
    }
  }
}
