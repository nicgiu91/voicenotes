import Dexie, { type Table } from 'dexie'
import type { AudioChunk, ChatThread, Note, SettingsData, Template } from './types'
import { detectLang, setLang } from './i18n'

interface SettingsRow {
  key: string
  value: unknown
}

class VoiceNotesDB extends Dexie {
  notes!: Table<Note, string>
  chunks!: Table<AudioChunk, number>
  settings!: Table<SettingsRow, string>
  templates!: Table<Template, string>
  chats!: Table<ChatThread, string>

  constructor() {
    super('voicenotes')
    this.version(1).stores({
      notes: 'id, createdAt, title',
      chunks: '++id, noteId, [noteId+index]',
      settings: 'key',
      templates: 'id',
      chats: 'id, updatedAt',
    })
  }
}

export const db = new VoiceNotesDB()

export const defaultSettings: SettingsData = {
  privacyAccepted: false,
  lang: 'it',
  transcribe: {
    mode: 'api',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'whisper-1',
    localModel: 'tiny',
    language: 'it',
  },
  llm: {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    model: 'claude-sonnet-5',
    maxTokens: 4096,
  },
}

export async function getSettings(): Promise<SettingsData> {
  const row = await db.settings.get('app')
  if (!row) return { ...structuredClone(defaultSettings), lang: detectLang() }
  const saved = row.value as Partial<SettingsData>
  return {
    ...structuredClone(defaultSettings),
    lang: saved.lang ?? detectLang(),
    ...saved,
    transcribe: { ...defaultSettings.transcribe, ...saved.transcribe },
    llm: { ...defaultSettings.llm, ...saved.llm },
  }
}

export async function saveSettings(value: SettingsData): Promise<void> {
  await db.settings.put({ key: 'app', value })
  setLang(value.lang)
}

/** All'avvio applica la lingua salvata (o quella del browser). */
export async function applySavedLanguage(): Promise<void> {
  const settings = await getSettings()
  setLang(settings.lang)
}

/**
 * La lingua si salva da sola appena scelta: senza questo, qualunque altro
 * salvataggio delle impostazioni (es. accettare il promemoria privacy)
 * riporterebbe l'interfaccia alla lingua ancora memorizzata.
 */
export async function saveLanguage(lang: SettingsData['lang']): Promise<void> {
  const settings = await getSettings()
  await db.settings.put({ key: 'app', value: { ...settings, lang } })
  setLang(lang)
}

/** Chiede al browser di non cancellare i dati (audio incluso) quando lo spazio scarseggia. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist) await navigator.storage.persist()
  } catch {
    // non supportato: pazienza
  }
}

/**
 * Recupera le registrazioni interrotte da un crash: le note rimaste in stato
 * 'recording' con almeno un chunk salvato diventano 'recovered', quelle senza
 * chunk vengono eliminate.
 */
export async function recoverInterruptedRecordings(): Promise<number> {
  const stuck = await db.notes.where('createdAt').above(0).filter((n) => n.status === 'recording').toArray()
  let recovered = 0
  for (const note of stuck) {
    const chunkCount = await db.chunks.where('noteId').equals(note.id).count()
    if (chunkCount === 0) {
      await db.notes.delete(note.id)
    } else {
      await db.notes.update(note.id, {
        status: 'recovered',
        durationSec: note.durationSec || chunkCount * 30,
      })
      recovered++
    }
  }
  return recovered
}

export async function deleteNoteCompletely(noteId: string): Promise<void> {
  await db.transaction('rw', [db.notes, db.chunks, db.chats], async () => {
    await db.chunks.where('noteId').equals(noteId).delete()
    await db.notes.delete(noteId)
    const threads = await db.chats.filter((c) => c.noteIds.includes(noteId)).toArray()
    for (const t of threads) await db.chats.delete(t.id)
  })
}
