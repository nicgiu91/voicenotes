/** Durata massima di uno spezzone inviato all'API di trascrizione. */
export const SEGMENT_SEC = 600

export interface AudioSegment {
  blob: Blob
  offsetSec: number
}

/** Codifica campioni mono in un file WAV 16 bit. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 1, true) // mono
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  writeStr(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

/** Decodifica qualunque audio e lo ricampiona a 16 kHz mono (formato di Whisper). */
export async function decodeTo16kMono(blob: Blob): Promise<Float32Array> {
  const raw = await blob.arrayBuffer()
  const decodeCtx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await decodeCtx.decodeAudioData(raw)
  } finally {
    void decodeCtx.close().catch(() => {})
  }

  const targetRate = 16000
  const length = Math.ceil(decoded.duration * targetRate)
  const offline = new OfflineAudioContext(1, length, targetRate)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}

/**
 * Prepara l'audio per la trascrizione via API. Registrazioni brevi passano
 * intere; quelle oltre SEGMENT_SEC vengono decodificate, ricampionate a
 * 16 kHz mono e spezzate in WAV da 10 minuti (i timestamp vengono poi
 * ricomposti sommando offsetSec).
 */
export async function splitForTranscription(blob: Blob, durationSec: number): Promise<AudioSegment[]> {
  if (durationSec <= SEGMENT_SEC) return [{ blob, offsetSec: 0 }]

  const targetRate = 16000
  const samples = await decodeTo16kMono(blob)

  const segments: AudioSegment[] = []
  const samplesPerSegment = SEGMENT_SEC * targetRate
  for (let start = 0; start < samples.length; start += samplesPerSegment) {
    const slice = samples.subarray(start, Math.min(start + samplesPerSegment, samples.length))
    segments.push({
      blob: encodeWav(new Float32Array(slice), targetRate),
      offsetSec: start / targetRate,
    })
  }
  return segments
}
