import type { LlmProvider, SettingsData, TranscribeProvider } from './types'
import { t, type TKey } from './i18n'

/**
 * Elenco dei servizi utilizzabili per l'AI e per la trascrizione.
 * Ci vanno solo servizi che accettano le chiamate diritte dal browser (CORS):
 * Groq per esempio le rifiuta, quindi si può usare solo dietro un proxy,
 * scegliendo "il tuo server" e scrivendone l'indirizzo.
 * È l'unico file da toccare per aggiungerne uno nuovo: scegliendo il provider
 * le Impostazioni riempiono da sole URL e modelli.
 */

export interface ModelOption {
  /** id esatto da inviare al servizio */
  id: string
  /** etichetta tradotta (modelli proposti da noi) */
  labelKey?: TKey
  /** etichetta già pronta (modelli letti dal servizio) */
  label?: string
}

export function modelLabel(m: ModelOption): string {
  return m.labelKey ? t(m.labelKey) : (m.label ?? m.id)
}

/** Formato delle richieste: Anthropic ha il suo, tutti gli altri sono OpenAI-compatible. */
export type ApiKind = 'anthropic' | 'openai'

export interface ProviderInfo<Id extends string> {
  id: Id
  labelKey: TKey
  api: ApiKind
  /** endpoint proposto quando si sceglie il provider */
  baseUrl: string
  /** pagina dove si crea la chiave (assente per i server locali) */
  keyUrl?: string
  /** la chiave è obbligatoria: i server locali di solito non la vogliono */
  keyRequired: boolean
  /** l'URL lo decide l'utente (server locale o servizio non in elenco) */
  ownUrl?: boolean
  models: ModelOption[]
  /** modello proposto scegliendo il provider (default: il primo dell'elenco) */
  defaultModel?: string
}

export type LlmProviderInfo = ProviderInfo<LlmProvider>
export type TranscribeProviderInfo = ProviderInfo<TranscribeProvider>

/**
 * Servizi AI. Solo per Claude indichiamo il prezzo esatto per milione di token:
 * per gli altri le etichette dicono a cosa serve il modello, e il link ai prezzi
 * del provider è nelle Impostazioni.
 */
export const LLM_PROVIDERS: LlmProviderInfo[] = [
  {
    id: 'anthropic',
    labelKey: 'provider.anthropic',
    api: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyRequired: true,
    defaultModel: 'claude-sonnet-5',
    models: [
      { id: 'claude-haiku-4-5', labelKey: 'models.haiku45' },
      { id: 'claude-sonnet-5', labelKey: 'models.sonnet5' },
      { id: 'claude-opus-5', labelKey: 'models.opus5' },
      { id: 'claude-opus-4-8', labelKey: 'models.opus48' },
      { id: 'claude-fable-5', labelKey: 'models.fable5' },
    ],
  },
  {
    id: 'openai',
    labelKey: 'provider.openai',
    api: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyRequired: true,
    models: [
      { id: 'gpt-4o-mini', labelKey: 'models.gpt4oMini' },
      { id: 'gpt-4.1-mini', labelKey: 'models.gpt41Mini' },
      { id: 'gpt-4o', labelKey: 'models.gpt4o' },
      { id: 'gpt-4.1', labelKey: 'models.gpt41' },
    ],
  },
  {
    id: 'google',
    labelKey: 'provider.google',
    api: 'openai',
    // Google espone i modelli Gemini anche in formato OpenAI-compatible
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyRequired: true,
    models: [
      { id: 'gemini-2.5-flash', labelKey: 'models.gemini25Flash' },
      { id: 'gemini-2.5-pro', labelKey: 'models.gemini25Pro' },
      { id: 'gemini-2.0-flash', labelKey: 'models.gemini20Flash' },
    ],
  },
  {
    id: 'openrouter',
    labelKey: 'provider.openrouter',
    api: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    keyRequired: true,
    // OpenRouter smista verso decine di modelli: conviene leggerli dal servizio
    models: [{ id: 'openrouter/auto', labelKey: 'models.openrouterAuto' }],
  },
  {
    id: 'mistral',
    labelKey: 'provider.mistral',
    api: 'openai',
    baseUrl: 'https://api.mistral.ai/v1',
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyRequired: true,
    models: [
      { id: 'mistral-small-latest', labelKey: 'models.mistralSmall' },
      { id: 'mistral-large-latest', labelKey: 'models.mistralLarge' },
    ],
  },
  {
    id: 'deepseek',
    labelKey: 'provider.deepseek',
    api: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyRequired: true,
    models: [
      { id: 'deepseek-chat', labelKey: 'models.deepseekChat' },
      { id: 'deepseek-reasoner', labelKey: 'models.deepseekReasoner' },
    ],
  },
  {
    id: 'custom',
    labelKey: 'provider.custom',
    api: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    keyRequired: false,
    ownUrl: true,
    models: [
      { id: 'llama3.1', labelKey: 'models.llama31' },
      { id: 'qwen2.5', labelKey: 'models.qwen25' },
      { id: 'mistral', labelKey: 'models.mistral' },
    ],
  },
]

/** Servizi di trascrizione (oltre a Whisper sul dispositivo). */
export const TRANSCRIBE_PROVIDERS: TranscribeProviderInfo[] = [
  {
    id: 'openai',
    labelKey: 'tprovider.openai',
    api: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyRequired: true,
    models: [
      { id: 'whisper-1', labelKey: 'tmodels.whisper1' },
      { id: 'gpt-4o-mini-transcribe', labelKey: 'tmodels.gpt4oMiniTranscribe' },
      { id: 'gpt-4o-transcribe', labelKey: 'tmodels.gpt4oTranscribe' },
    ],
  },
  {
    id: 'custom',
    labelKey: 'tprovider.custom',
    api: 'openai',
    baseUrl: 'http://localhost:8080/v1',
    keyRequired: false,
    ownUrl: true,
    models: [
      { id: 'whisper-1', labelKey: 'tmodels.whisper1' },
      { id: 'whisper-large-v3', labelKey: 'tmodels.largeV3' },
      { id: 'whisper-large-v3-turbo', labelKey: 'tmodels.largeV3Turbo' },
    ],
  },
]

/**
 * Sceglie l'URL da proporre cambiando provider: se il nuovo è "il tuo server"
 * si tiene quello già scritto dall'utente, altrimenti si usa quello ufficiale.
 */
export function nextBaseUrl(info: ProviderInfo<string>, current: string, all: ProviderInfo<string>[]): string {
  const wasPreset = all.some((p) => !p.ownUrl && current.startsWith(p.baseUrl))
  return info.ownUrl && !wasPreset && current ? current : info.baseUrl
}

export function defaultModelFor(info: ProviderInfo<string>): string {
  return info.defaultModel ?? info.models[0]?.id ?? ''
}

export function llmProvider(id: LlmProvider): LlmProviderInfo {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0]
}

export function transcribeProvider(id: TranscribeProvider): TranscribeProviderInfo {
  return TRANSCRIBE_PROVIDERS.find((p) => p.id === id) ?? TRANSCRIBE_PROVIDERS[0]
}

/** Vero se il modello configurato non è tra quelli proposti (scelta "Altro"). */
export function isCustomModel(models: ModelOption[], model: string): boolean {
  return !models.some((m) => m.id === model)
}

/**
 * Chiede al servizio l'elenco dei modelli davvero disponibili sulla chiave in
 * uso: così l'app resta aggiornata anche quando un provider ne pubblica di nuovi.
 */
export async function fetchModels(
  api: ApiKind,
  baseUrl: string,
  apiKey: string,
): Promise<ModelOption[]> {
  const base = baseUrl.replace(/\/+$/, '')
  const url = api === 'anthropic' ? `${base}/v1/models?limit=100` : `${base}/models`
  const headers: Record<string, string> =
    api === 'anthropic'
      ? {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        }
      : apiKey
        ? { Authorization: `Bearer ${apiKey}` }
        : {}
  let res: Response
  try {
    res = await fetch(url, { headers })
  } catch {
    // rete assente, URL sbagliato oppure CORS: il browser non dice altro
    throw new Error(t('err.modelsNetwork'))
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(t('err.modelsFetch', { status: res.status, body: body.slice(0, 200) }))
  }
  const data = (await res.json()) as { data?: { id?: string; display_name?: string }[] }
  const models = (data.data ?? [])
    .filter((m): m is { id: string; display_name?: string } => typeof m.id === 'string')
    .map((m) => ({ id: m.id, label: m.display_name ?? m.id }))
  if (models.length === 0) throw new Error(t('err.modelsEmpty'))
  return models.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Adatta le impostazioni salvate prima che i provider diventassero molti:
 * allora 'openai' voleva dire "un endpoint OpenAI-compatible qualsiasi", oggi
 * indica il servizio OpenAI vero e proprio e i server locali sono 'custom'.
 */
export function migrateSettings(saved: SettingsData): SettingsData {
  const llm = { ...saved.llm }
  if (llm.provider === 'openai' && !llm.baseUrl.includes('api.openai.com')) llm.provider = 'custom'
  const transcribe = { ...saved.transcribe }
  if (!TRANSCRIBE_PROVIDERS.some((p) => p.id === transcribe.provider)) {
    const match = TRANSCRIBE_PROVIDERS.find(
      (p) => !p.ownUrl && transcribe.baseUrl.startsWith(p.baseUrl),
    )
    transcribe.provider = match?.id ?? 'custom'
  }
  return { ...saved, llm, transcribe }
}
