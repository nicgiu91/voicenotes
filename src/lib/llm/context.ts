import { t } from '../i18n'

export interface ContextNote {
  title: string
  text: string
}

/**
 * Costruisce il contesto per la chat "Ask" a partire dalle trascrizioni
 * selezionate. Se il testo supera il budget, tiene inizio e fine di ogni
 * nota (dove di solito stanno presentazioni e conclusioni) e segnala il
 * taglio. Funzione pura, testata in tests/context.test.ts.
 */
export function buildContext(notes: ContextNote[], maxChars = 24000): string {
  if (notes.length === 0) return ''
  const budget = Math.floor(maxChars / notes.length)
  const parts = notes.map((n) => {
    const header = `## ${t('context.note', { title: n.title })}\n`
    const room = Math.max(500, budget - header.length)
    let body = n.text.trim()
    if (body.length > room) {
      const head = Math.floor(room * 0.7)
      const tail = room - head
      body = `${body.slice(0, head)}\n${t('context.omitted')}\n${body.slice(body.length - tail)}`
    }
    return header + body
  })
  return parts.join('\n\n')
}

export const askSystemPrompt = {
  it: `Sei un assistente che risponde a domande sulle note vocali dell'utente.
Qui sotto trovi le trascrizioni delle note selezionate.
Rispondi in italiano basandoti SOLO sul loro contenuto: se l'informazione non c'è, dillo chiaramente.
Quando è utile, cita brevemente il passaggio su cui ti basi.`,

  en: `You are an assistant that answers questions about the user's voice notes.
Below you will find the transcripts of the selected notes.
Answer in English based ONLY on their content: if the information is not there, say so clearly.
Where useful, briefly quote the passage you are relying on.`,
}
