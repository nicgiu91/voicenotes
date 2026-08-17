/// <reference lib="webworker" />
// Web Worker: esegue Whisper nel browser (Transformers.js) senza bloccare la UI.
import { pipeline } from '@huggingface/transformers'

interface JobMessage {
  audio: Float32Array
  language?: string
  model: string
}

interface AsrChunk {
  timestamp: [number, number | null]
  text: string
}

// il pipeline resta in memoria tra una trascrizione e l'altra
let asr: Awaited<ReturnType<typeof pipeline>> | null = null
let loadedModel = ''

self.onmessage = async (e: MessageEvent<JobMessage>) => {
  const { audio, language, model } = e.data
  try {
    if (!asr || loadedModel !== model) {
      asr = null
      const seen = new Set<string>()
      asr = await pipeline('automatic-speech-recognition', model, {
        // quantizzazione mista: il decoder q8 di questi modelli è difettoso
        dtype: { encoder_model: 'q8', decoder_model_merged: 'q4' },
        progress_callback: (p: unknown) => {
          const info = p as { status?: string; file?: string; progress?: number }
          if (info.status === 'progress' && typeof info.progress === 'number') {
            const pct = Math.round(info.progress)
            const key = `${info.file}-${Math.floor(pct / 5)}`
            if (!seen.has(key)) {
              seen.add(key)
              self.postMessage({
                type: 'progress',
                message: `Scaricamento del modello (solo la prima volta)… ${pct}%`,
              })
            }
          }
        },
      })
      loadedModel = model
    }

    self.postMessage({
      type: 'progress',
      message: 'Trascrizione sul dispositivo in corso… (può richiedere alcuni minuti)',
    })

    const options: Record<string, unknown> = {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    }
    if (language) {
      options.language = language
      options.task = 'transcribe'
    }
    const output = (await (asr as (a: Float32Array, o: object) => Promise<unknown>)(audio, options)) as {
      text?: string
      chunks?: AsrChunk[]
    }

    self.postMessage({
      type: 'done',
      text: (output.text ?? '').trim(),
      chunks: (output.chunks ?? []).map((c) => ({
        start: c.timestamp[0] ?? 0,
        end: c.timestamp[1],
        text: c.text.trim(),
      })),
    })
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
