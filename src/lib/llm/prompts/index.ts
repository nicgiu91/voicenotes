import type { Template } from '../../types'
import { riunionePrompt } from './riunione'
import { appuntiPrompt } from './appunti'
import { lezionePrompt } from './lezione'
import { genericoPrompt } from './generico'

export { titoloPrompt } from './titolo'
export { tagPrompt } from './tag'
export { mindmapPrompt } from './mindmap'
export { diarizzazionePrompt } from './diarizzazione'

/** Template di riepilogo predefiniti. I prompt vivono in file separati in questa cartella. */
export const builtinTemplates: Template[] = [
  { id: 'riunione', name: 'Riunione', prompt: riunionePrompt, builtin: true },
  { id: 'appunti', name: 'Appunti / Idea', prompt: appuntiPrompt, builtin: true },
  { id: 'lezione', name: 'Lezione / Formazione', prompt: lezionePrompt, builtin: true },
  { id: 'generico', name: 'Generico', prompt: genericoPrompt, builtin: true },
]
