import { decodeTo16kMono } from '../audio/wav'
import type { LocalWhisperSize, TranscribeSettings } from '../types'
import type { TranscriptPart } from './merge'
import type { TranscribeProgress } from './client'
import { t } from '../i18n'

/** Modelli Whisper multilingua per la trascrizione nel browser. */
export const LOCAL_MODELS: Record<LocalWhisperSize, { id: string; labelKey: 'whisper.tiny' | 'whisper.base' | 'whisper.small' }> = {
  tiny: { id: 'onnx-community/whisper-tiny', labelKey: 'whisper.tiny' },
  base: { id: 'onnx-community/whisper-base', labelKey: 'whisper.base' },
  small: { id: 'onnx-community/whisper-small', labelKey: 'whisper.small' },
}

// worker unico e persistente: il modello resta caricato in memoria
let worker: Worker | null = null

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./local-worker.ts', import.meta.url), { type: 'module' })
  }
  return worker
}

interface WorkerReply {
  type: 'progress' | 'done' | 'error'
  /** per i messaggi di avanzamento: fase in corso (il testo è tradotto qui, non nel worker) */
  stage?: 'download' | 'transcribe'
  pct?: number
  message?: string
  text?: string
  chunks?: { start: number; end: number | null; text: string }[]
}

/**
 * Trascrizione completamente locale (Whisper via Transformers.js in un
 * Web Worker): nessuna API, nessuna chiave, funziona anche offline dopo
 * il primo scaricamento del modello.
 */
export async function transcribeLocally(
  blob: Blob,
  settings: TranscribeSettings,
  durationSec: number,
  onProgress: TranscribeProgress,
): Promise<TranscriptPart & { language?: string }> {
  onProgress(t('transcribe.preparing'))
  const audio = await decodeTo16kMono(blob)
  const model = LOCAL_MODELS[settings.localModel]?.id ?? LOCAL_MODELS.tiny.id
  const w = getWorker()

  return await new Promise((resolve, reject) => {
    const cleanup = () => {
      w.onmessage = null
      w.onerror = null
    }
    w.onmessage = (e: MessageEvent<WorkerReply>) => {
      const msg = e.data
      if (msg.type === 'progress') {
        // il worker manda solo il tipo di avanzamento: il testo lo traduciamo qui
        onProgress(
          msg.stage === 'download'
            ? t('transcribe.localDownload', { pct: msg.pct ?? 0 })
            : t('transcribe.localRunning'),
        )
      } else if (msg.type === 'done') {
        cleanup()
        const segments = (msg.chunks ?? [])
          .filter((c) => c.text)
          .map((c) => ({ start: c.start, end: c.end ?? durationSec, text: c.text }))
        resolve({
          text: msg.text ?? '',
          segments,
          language: settings.language || undefined,
        })
      } else if (msg.type === 'error') {
        cleanup()
        reject(new Error(t('err.localFailed', { message: msg.message ?? '?' })))
      }
    }
    w.onerror = (e) => {
      cleanup()
      reject(new Error(t('err.workerFailed', { message: e.message })))
    }
    // il buffer audio viene trasferito (non copiato) al worker
    w.postMessage({ audio, language: settings.language || undefined, model }, [audio.buffer])
  })
}
