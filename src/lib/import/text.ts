import { db } from '../db'
import { defaultNoteTitle } from '../format'
import { t } from '../i18n'
import { BUILTIN_TEMPLATE_IDS } from '../llm/prompts'
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

/** Testo importato già scomposto: quello che serve per creare la nota. */
export interface ParsedImport {
  text: string
  title?: string
  createdAt?: number
  tags: string[]
  /** risposta dell'AI già presente nel file, da salvare come riepilogo */
  reply?: { templateId: string; text: string }
}

/**
 * Data scritta a mano o da un Comando Rapido: "2026-10-01", "2026-10-01 07:12",
 * "2026-10-01T07.12", anche dentro un nome di file. Ora locale.
 */
export function parseLooseDate(s: string): number | undefined {
  const m = /(\d{4})-(\d{2})-(\d{2})(?:[ T_]+(\d{1,2})[:.\-](\d{2}))?/.exec(s)
  if (!m) return undefined
  const [y, mo, d, h = '0', mi = '0'] = m.slice(1).map((x) => x ?? '0')
  const date = new Date(+y, +mo - 1, +d, +h, +mi)
  // 2026-02-31 diventerebbe il 3 marzo: una data che non esiste non si accetta
  if (date.getFullYear() !== +y || date.getMonth() !== +mo - 1 || date.getDate() !== +d) return undefined
  if (+h > 23 || +mi > 59) return undefined
  return date.getTime()
}

/** Intestazione "--- chiave: valore ---" in cima al file, come in Obsidian. */
function frontMatter(text: string): { fields: Record<string, string>; body: string } | null {
  const m = /^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/.exec(text)
  if (!m) return null
  const fields: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const kv = /^\s*([\p{L}_]+)\s*:\s*(.*?)\s*$/u.exec(line)
    if (kv) fields[kv[1].toLowerCase()] = kv[2].replace(/^["']|["']$/g, '')
  }
  return { fields, body: text.slice(m[0].length) }
}

/**
 * Scompone un testo da importare. Un testo qualunque resta com'è; un file
 * scritto dai Comandi Rapidi dell'iPhone (docs/comandi-rapidi-iphone.md) ha
 * questa forma, leggibile anche in Obsidian:
 *
 *   ---
 *   tipo: sogno
 *   data: 2026-10-01 07:12
 *   ---
 *   # Sogno 2026-10-01 07:12
 *   (testo dettato)
 *   ## Risposta
 *   (quello che ha risposto l'AI)
 *
 * Il tipo diventa un'etichetta e, se è un template, la risposta finisce tra
 * i riepiloghi invece che dentro la trascrizione. Funzione pura, testata.
 */
export function parseImportedText(raw: string, fileName = '', lastModified?: number): ParsedImport {
  const text = raw.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '').trim()
  const fromName = parseLooseDate(fileName)
  const fm = frontMatter(text)
  if (!fm) return { text, createdAt: fromName ?? lastModified, tags: [] }

  const f = fm.fields
  const tipo = (f.tipo ?? f.type ?? '').trim().toLowerCase()
  let body = fm.body.trim()

  let title = (f.titolo ?? f.title ?? '').trim() || undefined
  const heading = /^#[ \t]+(.+)\n?/.exec(body)
  if (heading) {
    title ??= heading[1].trim()
    body = body.slice(heading[0].length).trim()
  }

  let reply: ParsedImport['reply']
  const cut = /^##[ \t]+(risposta|reply)[ \t]*$/im.exec(body)
  if (cut) {
    const answer = body.slice(cut.index + cut[0].length).trim()
    body = body.slice(0, cut.index).trim()
    if (answer) {
      const known = (BUILTIN_TEMPLATE_IDS as readonly string[]).includes(tipo)
      reply = { templateId: known ? tipo : 'generico', text: answer }
    }
  }

  return {
    text: body,
    title,
    createdAt: parseLooseDate(f.data ?? f.date ?? '') ?? fromName ?? lastModified,
    tags: tipo ? [tipo] : [],
    reply,
  }
}

/**
 * Crea una nota da una trascrizione già pronta (incollata o da file), senza
 * audio e senza passare dal servizio di trascrizione. Serve a chi ha già il
 * testo — per esempio dai Memo Vocali dell'iPhone, che trascrivono gratis.
 */
export async function importTranscriptText(text: string, title = ''): Promise<string> {
  const { id } = await importParsed({ text, tags: [] }, title)
  return id
}

/**
 * Crea la nota da un testo già scomposto. Se esiste già una nota di testo
 * con la stessa data e lo stesso contenuto non la duplica: chi reimporta la
 * cartella dei Comandi Rapidi ogni settimana ritrova solo le note nuove.
 */
export async function importParsed(
  parsed: ParsedImport,
  titleOverride = '',
): Promise<{ id: string; duplicate: boolean }> {
  const clean = parsed.text.trim()
  if (!clean) throw new Error(t('err.importTextEmpty'))

  const createdAt = parsed.createdAt ?? Date.now()
  if (parsed.createdAt !== undefined) {
    const same = await db.notes
      .where('createdAt')
      .equals(createdAt)
      .filter((n) => n.source === 'text' && n.transcript?.text === clean)
      .first()
    if (same) return { id: same.id, duplicate: true }
  }

  const transcript: Transcript = {
    text: clean,
    // niente tempi: il testo arriva già scritto, non c'è un audio da seguire
    segments: [],
    createdAt,
  }
  const note: Note = {
    id: crypto.randomUUID(),
    title: titleOverride.trim() || parsed.title || titleFromText(clean) || defaultNoteTitle(createdAt),
    createdAt,
    durationSec: 0,
    mimeType: 'text/plain',
    tags: parsed.tags,
    status: 'ready',
    source: 'text',
    transcript,
    ...(parsed.reply ? { summaries: { [parsed.reply.templateId]: parsed.reply.text } } : {}),
  }
  await db.notes.add(note)
  return { id: note.id, duplicate: false }
}
