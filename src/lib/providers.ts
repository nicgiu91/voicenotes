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
export type ApiKind = 'anthropic' | 'openai' | 'deepgram'

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
  /** indirizzo per l'elenco dei modelli, se il servizio non lo espone come gli altri */
  modelsUrl?: string
  /** modello economico proposto per i lavori meccanici (default: quello principale) */
  fastModel?: string
  /** cosa dichiara il servizio sui dati che gli mandi */
  privacyKey: TKey
  /** inizio tipico della chiave, per accorgersi di quelle di un altro servizio */
  keyPrefix?: string
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
    defaultModel: 'claude-sonnet-5-5',
    fastModel: 'claude-haiku-4-5',
    privacyKey: 'privacy.anthropic',
    keyPrefix: 'sk-ant-',
    models: [
      { id: 'claude-haiku-4-5', labelKey: 'models.haiku45' },
      { id: 'claude-sonnet-5-5', labelKey: 'models.sonnet55' },
      { id: 'claude-opus-5-5', labelKey: 'models.opus55' },
      { id: 'claude-fable-5-1', labelKey: 'models.fable51' },
    ],
  },
  {
    id: 'openai',
    labelKey: 'provider.openai',
    api: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyRequired: true,
    fastModel: 'gpt-4o-mini',
    privacyKey: 'privacy.openai',
    keyPrefix: 'sk-',
    models: [
      { id: 'gpt-6.1-sol', labelKey: 'models.gpt61Sol' },
      { id: 'gpt-6-luna', labelKey: 'models.gpt6Luna' },
      { id: 'gpt-6-astra', labelKey: 'models.gpt6Astra' },
      // non ragiona prima di rispondere: resta il piu' rapido per titoli ed etichette
      { id: 'gpt-4o-mini', labelKey: 'models.gpt4oMini' },
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
    // Gemini elenca i modelli fuori dal protocollo OpenAI-compatible
    modelsUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    fastModel: 'gemini-3.5-flash-lite',
    privacyKey: 'privacy.google',
    keyPrefix: 'AIza',
    models: [
      { id: 'gemini-3.8-flash', labelKey: 'models.gemini38Flash' },
      { id: 'gemini-3.5-flash-lite', labelKey: 'models.gemini35FlashLite' },
      { id: 'gemini-3.1-pro-preview', labelKey: 'models.gemini31ProPreview' },
    ],
  },
  {
    id: 'xai',
    labelKey: 'provider.xai',
    api: 'openai',
    baseUrl: 'https://api.x.ai/v1',
    keyUrl: 'https://console.x.ai',
    keyRequired: true,
    fastModel: 'grok-4.3',
    privacyKey: 'privacy.xai',
    keyPrefix: 'xai-',
    models: [
      { id: 'grok-4.7', labelKey: 'models.grok47' },
      { id: 'grok-4.6', labelKey: 'models.grok46' },
      { id: 'grok-4.3', labelKey: 'models.grok43' },
    ],
  },
  {
    id: 'openrouter',
    labelKey: 'provider.openrouter',
    api: 'openai',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyUrl: 'https://openrouter.ai/keys',
    keyRequired: true,
    privacyKey: 'privacy.openrouter',
    keyPrefix: 'sk-or-',
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
    fastModel: 'mistral-small-latest',
    privacyKey: 'privacy.mistral',
    models: [
      { id: 'mistral-medium-latest', labelKey: 'models.mistralMedium' },
      { id: 'mistral-small-latest', labelKey: 'models.mistralSmall' },
    ],
  },
  {
    id: 'deepseek',
    labelKey: 'provider.deepseek',
    api: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyRequired: true,
    fastModel: 'deepseek-flash',
    privacyKey: 'privacy.deepseek',
    models: [
      { id: 'deepseek-flash', labelKey: 'models.deepseekFlash' },
      { id: 'deepseek-v4-pro', labelKey: 'models.deepseekPro' },
    ],
  },
  {
    id: 'custom',
    labelKey: 'provider.custom',
    api: 'openai',
    baseUrl: 'http://localhost:11434/v1',
    keyRequired: false,
    ownUrl: true,
    privacyKey: 'privacy.custom',
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
    privacyKey: 'tprivacy.openai',
    keyPrefix: 'sk-',
    models: [
      { id: 'whisper-1', labelKey: 'tmodels.whisper1Openai' },
      { id: 'gpt-transcribe', labelKey: 'tmodels.gptTranscribe' },
    ],
  },
  {
    id: 'deepgram',
    labelKey: 'tprovider.deepgram',
    api: 'deepgram',
    baseUrl: 'https://api.deepgram.com/v1',
    keyUrl: 'https://console.deepgram.com/signup',
    keyRequired: true,
    privacyKey: 'tprivacy.deepgram',
    models: [
      { id: 'nova-3', labelKey: 'tmodels.nova3' },
      { id: 'nova-2', labelKey: 'tmodels.nova2' },
    ],
  },
  {
    id: 'custom',
    labelKey: 'tprovider.custom',
    api: 'openai',
    baseUrl: 'http://localhost:8080/v1',
    keyRequired: false,
    ownUrl: true,
    privacyKey: 'tprivacy.custom',
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

/**
 * Modello per i lavori meccanici. Se il servizio non ne propone uno piu'
 * economico si resta sul principale: nessuna sorpresa, stesso comportamento.
 */
export function fastModelFor(info: ProviderInfo<string>): string {
  return info.fastModel ?? defaultModelFor(info)
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
  info: ProviderInfo<string>,
  baseUrl: string,
  apiKey: string,
): Promise<ModelOption[]> {
  const base = baseUrl.replace(/\/+$/, '')
  const url = info.modelsUrl
    ? info.modelsUrl
    : info.api === 'anthropic'
      ? `${base}/v1/models?limit=100`
      : `${base}/models`
  const headers: Record<string, string> = info.modelsUrl
    ? { 'x-goog-api-key': apiKey }
    : info.api === 'anthropic'
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
  const data = (await res.json()) as {
    data?: { id?: string; display_name?: string }[]
    models?: { name?: string; displayName?: string }[]
  }
  const raw = data.models
    ? data.models.map((m) => ({ id: (m.name ?? '').replace(/^models\//, ''), label: m.displayName }))
    : (data.data ?? []).map((m) => ({ id: m.id ?? '', label: m.display_name }))
  const models = raw
    .filter((m) => m.id !== '')
    .map((m) => ({ id: m.id, label: m.label ?? m.id }))
  if (models.length === 0) throw new Error(t('err.modelsEmpty'))
  return models.sort((a, b) => a.id.localeCompare(b.id))
}

/**
 * Nomi di modello salvati che vanno sostituiti, per servizio. Due casi:
 * - non funzionano piu' (DeepSeek li ha ritirati, Google ha chiuso l'accesso
 *   ai Gemini 2.x): chi li aveva salvati riceverebbe solo un errore;
 * - Claude: c'e' un successore allo stesso prezzo o piu' basso, e quelli
 *   vecchi escono dal menu (verificato su platform.claude.com, 1 ott 2026).
 * Il secondo argomento dice se e' il modello leggero, che su Gemini ha un
 * sostituto diverso dal principale.
 */
const SOSTITUZIONI: Partial<Record<LlmProvider, (model: string, fast: boolean) => string>> = {
  deepseek: (m) =>
    ['deepseek-chat', 'deepseek-reasoner', 'deepseek-v4-flash'].includes(m) ? 'deepseek-flash' : m,
  google: (m, fast) =>
    m.startsWith('gemini-2') ? (fast ? 'gemini-3.5-flash-lite' : 'gemini-3.8-flash') : m,
  anthropic: (m) =>
    ({
      'claude-sonnet-5': 'claude-sonnet-5-5',
      'claude-opus-5': 'claude-opus-5-5',
      'claude-opus-4-8': 'claude-opus-5-5',
      'claude-fable-5': 'claude-fable-5-1',
    })[m] ?? m,
}

/**
 * Adatta le impostazioni salvate prima che i provider diventassero molti:
 * allora 'openai' voleva dire "un endpoint OpenAI-compatible qualsiasi", oggi
 * indica il servizio OpenAI vero e proprio e i server locali sono 'custom'.
 */
export function migrateSettings(saved: SettingsData): SettingsData {
  const llm = { ...saved.llm }
  if (llm.provider === 'openai' && !llm.baseUrl.includes('api.openai.com')) llm.provider = 'custom'
  // impostazioni salvate prima del modello leggero: si parte da quello del servizio
  if (!llm.fastModel) llm.fastModel = llmProvider(llm.provider).fastModel ?? llm.model
  const sost = SOSTITUZIONI[llm.provider]
  if (sost) {
    llm.model = sost(llm.model, false)
    llm.fastModel = sost(llm.fastModel, true)
  }
  // il vecchio tetto di 4096 tagliava a meta' le risposte lunghe (diarizzazione)
  if (llm.maxTokens === 4096) llm.maxTokens = 16000
  const transcribe = { ...saved.transcribe }
  // OpenAI spegne questi due il 26 febbraio 2027; il successore, come loro, non da' i tempi
  if (
    transcribe.provider === 'openai' &&
    ['gpt-4o-transcribe', 'gpt-4o-mini-transcribe'].includes(transcribe.model)
  ) {
    transcribe.model = 'gpt-transcribe'
  }
  if (!TRANSCRIBE_PROVIDERS.some((p) => p.id === transcribe.provider)) {
    const match = TRANSCRIBE_PROVIDERS.find(
      (p) => !p.ownUrl && transcribe.baseUrl.startsWith(p.baseUrl),
    )
    transcribe.provider = match?.id ?? 'custom'
  }
  return { ...saved, llm, transcribe }
}
