import { assembleAudio, audioExtension } from '../audio/assemble'
import { splitForTranscription } from '../audio/wav'
import { db } from '../db'
import { mergeParts, type TranscriptPart } from './merge'
import type { TranscribeSettings, Transcript } from '../types'
import { t } from '../i18n'

interface VerboseJsonResponse {
  text?: string
  language?: string
  segments?: { start: number; end: number; text: string }[]
}

function apiUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/+$/, '')}/audio/transcriptions`
}

/**
 * Trascrive un singolo blob con un'API OpenAI-compatible
 * (OpenAI, Groq, server whisper.cpp in LAN...).
 * Prova prima verbose_json (con timestamp); se il server non lo supporta
 * ripiega su json semplice.
 */
export async function transcribeBlob(
  blob: Blob,
  settings: TranscribeSettings,
  fallbackDurationSec: number,
): Promise<TranscriptPart & { language?: string }> {
  if (!settings.baseUrl) throw new Error(t('err.transcribeConfigure'))

  const attempt = async (format: 'verbose_json' | 'json') => {
    const form = new FormData()
    form.append('file', blob, `audio.${audioExtension(blob.type || 'audio/webm')}`)
    form.append('model', settings.model || 'whisper-1')
    if (settings.language) form.append('language', settings.language)
    form.append('response_format', format)
    const headers: Record<string, string> = {}
    if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`
    const res = await fetch(apiUrl(settings.baseUrl), { method: 'POST', headers, body: form })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw Object.assign(
        new Error(t('err.transcribeFailed', { status: res.status, body: body.slice(0, 300) })),
        { status: res.status },
      )
    }
    return (await res.json()) as VerboseJsonResponse
  }

  let data: VerboseJsonResponse
  try {
    data = await attempt('verbose_json')
  } catch (e) {
    const status = (e as { status?: number }).status
    // alcuni server non supportano verbose_json: riprova senza timestamp
    if (status === 400 || status === 422) data = await attempt('json')
    else throw e
  }

  const text = (data.text ?? '').trim()
  const segments =
    data.segments && data.segments.length > 0
      ? data.segments.map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }))
      : text
        ? [{ start: 0, end: fallbackDurationSec, text }]
        : []
  return { text, segments, language: data.language }
}

export type TranscribeProgress = (message: string) => void

/**
 * Trascrive una nota completa e salva la trascrizione sulla nota.
 * Modalità 'api': ricompone l'audio, lo spezza se lungo e chiama l'endpoint
 * configurato. Modalità 'local': Whisper nel browser via Web Worker.
 */
export async function transcribeNote(
  noteId: string,
  settings: TranscribeSettings,
  onProgress: TranscribeProgress = () => {},
): Promise<Transcript> {
  const note = await db.notes.get(noteId)
  if (!note) throw new Error(t('err.noteNotFound'))

  onProgress(t('transcribe.preparing'))
  const audio = await assembleAudio(noteId)

  let merged: TranscriptPart
  let language: string | undefined

  if (settings.mode === 'local') {
    const { transcribeLocally } = await import('./local')
    const result = await transcribeLocally(audio, settings, note.durationSec, onProgress)
    merged = { text: result.text, segments: result.segments }
    language = result.language
  } else {
    const pieces = await splitForTranscription(audio, note.durationSec)
    const parts: TranscriptPart[] = []
    for (let i = 0; i < pieces.length; i++) {
      onProgress(
        pieces.length > 1
          ? t('transcribe.part', { n: i + 1, total: pieces.length })
          : t('transcribe.inProgress'),
      )
      const part = await transcribeBlob(pieces[i].blob, settings, note.durationSec)
      language ??= part.language
      parts.push(part)
    }
    merged = mergeParts(
      parts,
      pieces.map((p) => p.offsetSec),
    )
  }
  const transcript: Transcript = {
    text: merged.text,
    segments: merged.segments,
    language,
    createdAt: Date.now(),
  }
  await db.notes.update(noteId, { transcript })
  return transcript
}
