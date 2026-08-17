import { decodeTo16kMono } from '../audio/wav'
import type { LocalWhisperSize, TranscribeSettings } from '../types'
import type { TranscriptPart } from './merge'
import type { TranscribeProgress } from './client'

/** Modelli Whisper multilingua per la trascrizione nel browser. */
export const LOCAL_MODELS: Record<LocalWhisperSize, { id: string; label: string }> = {
  tiny: { id: 'onnx-community/whisper-tiny', label: 'Veloce (~40 MB, meno preciso)' },
  base: { id: 'onnx-community/whisper-base', label: 'Equilibrato (~80 MB)' },
  small: { id: 'onnx-community/whisper-small', label: 'Preciso (~250 MB, lento sul telefono)' },
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
  onProgress('Preparazione audio…')
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
      if (msg.type === 'progress' && msg.message) {
        onProgress(msg.message)
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
        reject(new Error(`Trascrizione locale fallita: ${msg.message ?? 'errore sconosciuto'}`))
      }
    }
    w.onerror = (e) => {
      cleanup()
      reject(new Error(`Errore del worker di trascrizione: ${e.message}`))
    }
    // il buffer audio viene trasferito (non copiato) al worker
    w.postMessage({ audio, language: settings.language || undefined, model }, [audio.buffer])
  })
}
