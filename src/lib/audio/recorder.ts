import { db } from '../db'
import { defaultNoteTitle } from '../format'
import type { Note } from '../types'
import { t } from '../i18n'

/** Sceglie il miglior formato supportato: webm/opus, poi mp4 (iOS Safari). */
export function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

export interface RecorderCallbacks {
  /** chiamata ogni secondo con i secondi trascorsi */
  onTick?: (elapsedSec: number) => void
  /** livello audio 0..1 per il VU meter, ~10 volte al secondo */
  onLevel?: (level: number) => void
  onError?: (message: string) => void
}

const CHUNK_MS = 30_000

/**
 * Registratore con salvataggio incrementale: ogni 30 secondi il chunk audio
 * viene scritto subito in IndexedDB, così un crash non perde la registrazione.
 */
export class ChunkedRecorder {
  private recorder: MediaRecorder | null = null
  private stream: MediaStream | null = null
  private audioCtx: AudioContext | null = null
  private wakeLock: WakeLockSentinel | null = null
  private noteId = ''
  private chunkIndex = 0
  private startedAt = 0
  private tickTimer: number | undefined
  private levelTimer: number | undefined
  private pendingWrites: Promise<unknown>[] = []
  private cb: RecorderCallbacks

  constructor(callbacks: RecorderCallbacks = {}) {
    this.cb = callbacks
  }

  /** Permette di riattaccare i callback quando la UI viene rimontata. */
  setCallbacks(callbacks: RecorderCallbacks) {
    this.cb = callbacks
  }

  get isRecording(): boolean {
    return this.recorder !== null && this.recorder.state === 'recording'
  }

  async start(): Promise<string> {
    const mimeType = pickMimeType()
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const createdAt = Date.now()
    this.noteId = crypto.randomUUID()
    this.chunkIndex = 0
    const note: Note = {
      id: this.noteId,
      title: defaultNoteTitle(createdAt),
      createdAt,
      durationSec: 0,
      mimeType: mimeType || 'audio/webm',
      tags: [],
      status: 'recording',
    }
    await db.notes.add(note)

    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        const index = this.chunkIndex++
        const write = db.chunks
          .add({ noteId: this.noteId, index, blob: e.data })
          .then(() => db.notes.update(this.noteId, { durationSec: this.elapsedSec() }))
          .catch(() => this.cb.onError?.(t('err.chunkSave')))
        this.pendingWrites.push(write)
      }
    }
    this.recorder.onerror = () => this.cb.onError?.(t('err.recorder'))

    this.startedAt = Date.now()
    this.recorder.start(CHUNK_MS)
    this.startLevelMeter()
    this.startTicker()
    await this.acquireWakeLock()
    document.addEventListener('visibilitychange', this.onVisibility)
    return this.noteId
  }

  /** Ferma la registrazione, salva l'ultimo chunk e chiude la nota. */
  async stop(): Promise<string> {
    const rec = this.recorder
    if (!rec) throw new Error(t('err.notRecording'))
    const stopped = new Promise<void>((resolve) => {
      rec.onstop = () => resolve()
    })
    if (rec.state !== 'inactive') rec.stop()
    await stopped
    // aspetta che tutti i chunk siano scritti in IndexedDB
    await Promise.allSettled(this.pendingWrites)
    await db.notes.update(this.noteId, { status: 'ready', durationSec: this.elapsedSec() })
    const id = this.noteId
    this.cleanup()
    return id
  }

  /** Da chiamare se l'utente annulla: elimina nota e chunk. */
  async discard(): Promise<void> {
    const rec = this.recorder
    if (rec && rec.state !== 'inactive') {
      const stopped = new Promise<void>((resolve) => {
        rec.onstop = () => resolve()
      })
      rec.stop()
      await stopped
    }
    await Promise.allSettled(this.pendingWrites)
    await db.chunks.where('noteId').equals(this.noteId).delete()
    await db.notes.delete(this.noteId)
    this.cleanup()
  }

  private elapsedSec(): number {
    return Math.round((Date.now() - this.startedAt) / 1000)
  }

  private startTicker() {
    this.tickTimer = window.setInterval(() => this.cb.onTick?.(this.elapsedSec()), 1000)
  }

  private startLevelMeter() {
    if (!this.stream || !this.cb.onLevel) return
    try {
      this.audioCtx = new AudioContext()
      const source = this.audioCtx.createMediaStreamSource(this.stream)
      const analyser = this.audioCtx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.fftSize)
      this.levelTimer = window.setInterval(() => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        this.cb.onLevel?.(Math.min(1, Math.sqrt(sum / data.length) * 3))
      }, 100)
    } catch {
      // niente VU meter, la registrazione funziona comunque
    }
  }

  private onVisibility = () => {
    // il wake lock viene rilasciato quando la pagina va in background:
    // riprova ad acquisirlo quando si torna in primo piano
    if (document.visibilityState === 'visible' && this.isRecording) {
      void this.acquireWakeLock()
    }
  }

  private async acquireWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        this.wakeLock = await navigator.wakeLock.request('screen')
      }
    } catch {
      // non supportato (es. iOS vecchi) o negato: documentato nel README
    }
  }

  private cleanup() {
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.levelTimer) clearInterval(this.levelTimer)
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.wakeLock?.release().catch(() => {})
    this.wakeLock = null
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.audioCtx?.close().catch(() => {})
    this.audioCtx = null
    this.recorder = null
    this.pendingWrites = []
  }
}

/** Importa un file audio esistente come nuova nota. */
export async function importAudioFile(file: File): Promise<string> {
  const createdAt = Date.now()
  const noteId = crypto.randomUUID()
  const durationSec = await readAudioDuration(file).catch(() => 0)
  const note: Note = {
    id: noteId,
    title: file.name.replace(/\.[^.]+$/, '') || defaultNoteTitle(createdAt),
    createdAt,
    durationSec,
    mimeType: file.type || 'audio/mpeg',
    tags: [],
    status: 'ready',
  }
  await db.notes.add(note)
  await db.chunks.add({ noteId, index: 0, blob: file })
  return noteId
}

function readAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0)
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(t('err.durationUnreadable')))
    }
    audio.src = url
  })
}
