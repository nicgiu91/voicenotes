import type { LlmProvider } from '../types'
import type { TKey } from '../i18n'

export interface ModelOption {
  /** id esatto da inviare al provider */
  id: string
  /** chiave di traduzione con nome, prestazioni e costo per milione di token */
  labelKey: TKey
}

/**
 * Modelli proposti nel menu a tendina, dal più economico al più costoso.
 * I prezzi nelle etichette sono per milione di token (input/output).
 */
export const ANTHROPIC_MODELS: ModelOption[] = [
  { id: 'claude-haiku-4-5', labelKey: 'models.haiku45' },
  { id: 'claude-sonnet-5', labelKey: 'models.sonnet5' },
  { id: 'claude-opus-5', labelKey: 'models.opus5' },
  { id: 'claude-opus-4-8', labelKey: 'models.opus48' },
  { id: 'claude-fable-5', labelKey: 'models.fable5' },
]

/** Modelli comuni sui server OpenAI-compatible locali (Ollama, LM Studio). */
export const OPENAI_COMPATIBLE_MODELS: ModelOption[] = [
  { id: 'llama3.1', labelKey: 'models.llama31' },
  { id: 'qwen2.5', labelKey: 'models.qwen25' },
  { id: 'mistral', labelKey: 'models.mistral' },
]

export function modelsFor(provider: LlmProvider): ModelOption[] {
  return provider === 'anthropic' ? ANTHROPIC_MODELS : OPENAI_COMPATIBLE_MODELS
}

/** Vero se il modello configurato non è tra quelli proposti (scelta "Altro"). */
export function isCustomModel(provider: LlmProvider, model: string): boolean {
  return !modelsFor(provider).some((m) => m.id === model)
}
