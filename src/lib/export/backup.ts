import { db } from '../db'
import type { AudioChunk, ChatThread, Note, Template } from '../types'
import { t } from '../i18n'

interface BackupChunk {
  noteId: string
  index: number
  mimeType: string
  dataBase64: string
}

interface BackupFile {
  formato: 'voicenotes-backup'
  versione: 1
  creatoIl: string
  notes: Note[]
  templates: Template[]
  chats: ChatThread[]
  chunks: BackupChunk[]
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve((r.result as string).split(',')[1] ?? '')
    r.onerror = () => reject(new Error(t('err.noAudio')))
    r.readAsDataURL(blob)
  })
}

function base64ToBlob(b64: string, mimeType: string): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

/**
 * Esporta tutto (note, audio, template, chat) in un unico file JSON.
 * Le impostazioni e le chiavi API NON sono incluse: si reinseriscono a mano.
 */
export async function exportBackup(): Promise<Blob> {
  const [notes, templates, chats, chunks] = await Promise.all([
    db.notes.toArray(),
    db.templates.toArray(),
    db.chats.toArray(),
    db.chunks.toArray(),
  ])
  const backupChunks: BackupChunk[] = []
  for (const c of chunks) {
    backupChunks.push({
      noteId: c.noteId,
      index: c.index,
      mimeType: c.blob.type,
      dataBase64: await blobToBase64(c.blob),
    })
  }
  const payload: BackupFile = {
    formato: 'voicenotes-backup',
    versione: 1,
    creatoIl: new Date().toISOString(),
    notes,
    templates,
    chats,
    chunks: backupChunks,
  }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

/**
 * Importa un backup. Le note già presenti con lo stesso id vengono
 * sovrascritte; le altre restano.
 */
export async function importBackup(file: Blob): Promise<{ note: number }> {
  const text = await file.text()
  let data: BackupFile
  try {
    data = JSON.parse(text) as BackupFile
  } catch {
    throw new Error(t('err.backupJson'))
  }
  if (data.formato !== 'voicenotes-backup' || !Array.isArray(data.notes)) {
    throw new Error(t('err.backupFormat'))
  }

  await db.transaction('rw', [db.notes, db.chunks, db.templates, db.chats], async () => {
    for (const note of data.notes) {
      await db.notes.put(note)
      await db.chunks.where('noteId').equals(note.id).delete()
    }
    const chunks: AudioChunk[] = data.chunks.map((c) => ({
      noteId: c.noteId,
      index: c.index,
      blob: base64ToBlob(c.dataBase64, c.mimeType),
    }))
    await db.chunks.bulkAdd(chunks)
    for (const t of data.templates ?? []) await db.templates.put(t)
    for (const c of data.chats ?? []) await db.chats.put(c)
  })
  return { note: data.notes.length }
}
