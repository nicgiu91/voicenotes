import { db } from '../db'

/**
 * Ricompone l'audio completo di una nota concatenando i chunk in ordine.
 * Con MediaRecorder + timeslice solo il primo chunk contiene l'header del
 * contenitore, quindi la concatenazione produce un file valido.
 */
export async function assembleAudio(noteId: string): Promise<Blob> {
  const note = await db.notes.get(noteId)
  if (!note) throw new Error('Nota non trovata')
  const chunks = await db.chunks.where('noteId').equals(noteId).sortBy('index')
  if (chunks.length === 0) throw new Error('Nessun audio salvato per questa nota')
  return new Blob(
    chunks.map((c) => c.blob),
    { type: note.mimeType },
  )
}

/** Estensione file coerente col formato di registrazione. */
export function audioExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('mp4')) return 'm4a'
  if (mimeType.includes('mpeg')) return 'mp3'
  if (mimeType.includes('wav')) return 'wav'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'audio'
}
