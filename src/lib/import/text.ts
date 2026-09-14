import { db } from '../db'
import { defaultNoteTitle } from '../format'
import { t } from '../i18n'
import type { Note, Transcript } from '../types'

/** Titolo massimo ricavato dal testo: oltre diventa illeggibile nell'elenco. */
const MAX_TITLE = 80

/**
 * Prima riga utile del testo, ripulita dai segni del Markdown e dai due punti
 * finali: serve da titolo quando l'utente non ne scrive uno.
 */
export function titleFromText(text: string): string {
  const line = text
    .split('\n')
    .map((l) => l.replace(/^\s*[#>*\-\d.)\s]+/, '').trim())
    .find((l) => l.length > 0)
  if (!line) return ''
  const cut = line.length > MAX_TITLE ? `${line.slice(0, MAX_TITLE).trimEnd()}…` : line
  return cut.replace(/[:.\s]+$/, '')
}

/**
 * Crea una nota da una trascrizione già pronta (incollata o da file), senza
 * audio e senza passare dal servizio di trascrizione. Serve a chi ha già il
 * testo — per esempio dai Memo Vocali dell'iPhone, che trascrivono gratis.
 */
export async function importTranscriptText(text: string, title = ''): Promise<string> {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) throw new Error(t('err.importTextEmpty'))

  const createdAt = Date.now()
  const noteId = crypto.randomUUID()
  const transcript: Transcript = {
    text: clean,
    // niente tempi: il testo arriva già scritto, non c'è un audio da seguire
    segments: [],
    createdAt,
  }
  const note: Note = {
    id: noteId,
    title: title.trim() || titleFromText(clean) || defaultNoteTitle(createdAt),
    createdAt,
    durationSec: 0,
    mimeType: 'text/plain',
    tags: [],
    status: 'ready',
    source: 'text',
    transcript,
  }
  await db.notes.add(note)
  return noteId
}
