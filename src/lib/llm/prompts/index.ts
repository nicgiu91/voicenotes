import type { Template } from '../../types'
import { getLang, t } from '../../i18n'
import { riunionePrompt } from './riunione'
import { appuntiPrompt } from './appunti'
import { lezionePrompt } from './lezione'
import { genericoPrompt } from './generico'
import { ideaPrompt } from './idea'
import { sognoPrompt } from './sogno'
import { titoloPrompt } from './titolo'
import { mindmapPrompt } from './mindmap'
import { diarizzazionePrompt } from './diarizzazione'
import { tagPrompt } from './tag'

/** Ogni prompt esiste in italiano e inglese: qui si sceglie quello della lingua attiva. */
type LocalizedPrompt = { it: string; en: string }
export function prompt(p: LocalizedPrompt): string {
  return p[getLang()]
}

export { titoloPrompt, mindmapPrompt, diarizzazionePrompt, tagPrompt }

/** id dei template che un file importato può chiedere con "tipo:" nell'intestazione */
export const BUILTIN_TEMPLATE_IDS = ['riunione', 'appunti', 'lezione', 'generico', 'idea', 'sogno'] as const

/** Template di riepilogo predefiniti, nella lingua attiva. */
export function builtinTemplates(): Template[] {
  return [
    { id: 'riunione', name: t('templates.riunione'), prompt: prompt(riunionePrompt), builtin: true },
    { id: 'appunti', name: t('templates.appunti'), prompt: prompt(appuntiPrompt), builtin: true },
    { id: 'lezione', name: t('templates.lezione'), prompt: prompt(lezionePrompt), builtin: true },
    { id: 'generico', name: t('templates.generico'), prompt: prompt(genericoPrompt), builtin: true },
    { id: 'idea', name: t('templates.idea'), prompt: prompt(ideaPrompt), builtin: true },
    { id: 'sogno', name: t('templates.sogno'), prompt: prompt(sognoPrompt), builtin: true },
  ]
}
