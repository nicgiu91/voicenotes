import type { TranscriptSegment } from '../types'

export interface TranscriptPart {
  text: string
  segments: TranscriptSegment[]
}

/**
 * Unisce le trascrizioni dei singoli spezzoni audio in un'unica trascrizione,
 * spostando i timestamp di ogni spezzone del suo offset dall'inizio.
 * Funzione pura, testata in tests/merge.test.ts.
 */
export function mergeParts(parts: TranscriptPart[], offsetsSec: number[]): TranscriptPart {
  const segments: TranscriptSegment[] = []
  const texts: string[] = []
  parts.forEach((part, i) => {
    const offset = offsetsSec[i] ?? 0
    for (const seg of part.segments) {
      segments.push({ start: seg.start + offset, end: seg.end + offset, text: seg.text })
    }
    const t = part.text.trim()
    if (t) texts.push(t)
  })
  return { text: texts.join('\n'), segments }
}

/**
 * Raggruppa i segmenti in paragrafi da mostrare: un paragrafo ogni ~40 parole
 * o quando c'è una pausa lunga tra un segmento e l'altro.
 */
export function groupSegments(segments: TranscriptSegment[]): TranscriptSegment[][] {
  const groups: TranscriptSegment[][] = []
  let current: TranscriptSegment[] = []
  let words = 0
  for (const seg of segments) {
    const prev = current[current.length - 1]
    const longPause = prev !== undefined && seg.start - prev.end > 2.5
    if (current.length > 0 && (words > 40 || longPause)) {
      groups.push(current)
      current = []
      words = 0
    }
    current.push(seg)
    words += seg.text.split(/\s+/).filter(Boolean).length
  }
  if (current.length > 0) groups.push(current)
  return groups
}
