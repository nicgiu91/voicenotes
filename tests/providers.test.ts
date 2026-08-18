import { afterEach, describe, expect, it as test, vi } from 'vitest'
import {
  LLM_PROVIDERS,
  TRANSCRIBE_PROVIDERS,
  defaultModelFor,
  fetchModels,
  isCustomModel,
  llmProvider,
  migrateSettings,
  modelLabel,
  nextBaseUrl,
  transcribeProvider,
} from '../src/lib/providers'
import { it as dictIt } from '../src/lib/i18n/it'
import { defaultSettings } from '../src/lib/db'
import type { SettingsData } from '../src/lib/types'

const all = [...LLM_PROVIDERS, ...TRANSCRIBE_PROVIDERS]

describe('elenco dei servizi', () => {
  test('ogni servizio ha etichetta tradotta, almeno un modello e id unici', () => {
    expect(LLM_PROVIDERS.length).toBeGreaterThanOrEqual(4)
    for (const p of all) {
      expect(dictIt[p.labelKey], `manca la traduzione di ${p.labelKey}`).toBeTruthy()
      expect(p.models.length, `${p.id} non propone modelli`).toBeGreaterThan(0)
      const ids = p.models.map((m) => m.id)
      expect(new Set(ids).size, `modelli doppi in ${p.id}`).toBe(ids.length)
      for (const m of p.models) {
        expect(m.labelKey && dictIt[m.labelKey], `manca la traduzione di ${m.labelKey}`).toBeTruthy()
      }
    }
  })

  test('gli id dei servizi non si ripetono', () => {
    for (const list of [LLM_PROVIDERS, TRANSCRIBE_PROVIDERS]) {
      const ids = list.map((p) => p.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  test('solo i servizi con URL proprio possono fare a meno della chiave', () => {
    for (const p of all) {
      if (!p.keyRequired) expect(p.ownUrl, `${p.id} senza chiave ma con URL fisso`).toBe(true)
      else expect(p.keyUrl, `${p.id} non dice dove prendere la chiave`).toBeTruthy()
    }
  })

  test('il modello proposto appartiene al servizio', () => {
    for (const p of all) {
      expect(p.models.some((m) => m.id === defaultModelFor(p))).toBe(true)
    }
  })

  test('i servizi sconosciuti ricadono sul primo dell’elenco', () => {
    expect(llmProvider('mai-visto' as never).id).toBe('anthropic')
    expect(transcribeProvider('mai-visto' as never).id).toBe('openai')
  })
})

describe('URL proposto cambiando servizio', () => {
  const url = (to: string, current: string) =>
    nextBaseUrl(llmProvider(to as never), current, LLM_PROVIDERS)

  test('scegliendo un servizio noto si usa il suo indirizzo', () => {
    expect(url('google', 'https://api.anthropic.com')).toBe(
      'https://generativelanguage.googleapis.com/v1beta/openai',
    )
  })

  test('passando al proprio server si tiene l’indirizzo già scritto', () => {
    expect(url('custom', 'http://192.168.1.10:1234/v1')).toBe('http://192.168.1.10:1234/v1')
  })

  test('passando al proprio server da un servizio noto si propone Ollama', () => {
    expect(url('custom', 'https://api.openai.com/v1')).toBe('http://localhost:11434/v1')
  })
})

describe('modelli', () => {
  test('modelLabel usa la traduzione, l’etichetta o l’id', () => {
    expect(modelLabel({ id: 'claude-sonnet-5', labelKey: 'models.sonnet5' })).toContain('Sonnet')
    expect(modelLabel({ id: 'x', label: 'Etichetta' })).toBe('Etichetta')
    expect(modelLabel({ id: 'solo-id' })).toBe('solo-id')
  })

  test('isCustomModel riconosce un modello fuori elenco', () => {
    const models = llmProvider('anthropic').models
    expect(isCustomModel(models, 'claude-sonnet-5')).toBe(false)
    expect(isCustomModel(models, 'un-modello-mio')).toBe(true)
  })
})

describe('fetchModels', () => {
  afterEach(() => vi.unstubAllGlobals())

  const stub = (ok: boolean, body: unknown) =>
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 401,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })

  test('legge gli id dai servizi OpenAI-compatible e li ordina', async () => {
    const fetchMock = stub(true, { data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1' }] })
    vi.stubGlobal('fetch', fetchMock)
    const models = await fetchModels(llmProvider('openai'), 'https://api.openai.com/v1/', 'sk-test')
    expect(models.map((m) => m.id)).toEqual(['gpt-4.1', 'gpt-4o'])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.openai.com/v1/models')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
  })

  test('per Anthropic usa /v1/models e l’header x-api-key', async () => {
    const fetchMock = stub(true, { data: [{ id: 'claude-sonnet-5', display_name: 'Claude Sonnet 5' }] })
    vi.stubGlobal('fetch', fetchMock)
    const models = await fetchModels(llmProvider('anthropic'), 'https://api.anthropic.com', 'sk-ant')
    expect(models[0].label).toBe('Claude Sonnet 5')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('https://api.anthropic.com/v1/models')
    expect(init.headers['x-api-key']).toBe('sk-ant')
  })

  test('per Gemini usa l’indirizzo di Google e la sua risposta', async () => {
    const fetchMock = stub(true, {
      models: [{ name: 'models/gemini-2.5-flash', displayName: 'Gemini 2.5 Flash' }],
    })
    vi.stubGlobal('fetch', fetchMock)
    const models = await fetchModels(llmProvider('google'), 'https://esempio.invalido', 'chiave')
    expect(models).toEqual([{ id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }])
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models')
    expect(init.headers['x-goog-api-key']).toBe('chiave')
  })

  test('segnala l’errore quando il servizio rifiuta la chiave', async () => {
    vi.stubGlobal('fetch', stub(false, { error: 'invalid key' }))
    await expect(fetchModels(llmProvider('openai'), 'https://api.openai.com/v1', 'sbagliata')).rejects.toThrow('401')
  })

  test('segnala quando non arriva nessun modello', async () => {
    vi.stubGlobal('fetch', stub(true, { data: [] }))
    await expect(fetchModels(llmProvider('openai'), 'https://api.openai.com/v1', 'k')).rejects.toThrow()
  })
})

describe('impostazioni salvate prima dei nuovi servizi', () => {
  const saved = (llm: Partial<SettingsData['llm']>, tr: Partial<SettingsData['transcribe']> = {}) =>
    migrateSettings({
      ...structuredClone(defaultSettings),
      llm: { ...defaultSettings.llm, ...llm },
      transcribe: { ...defaultSettings.transcribe, ...tr },
    })

  test('il vecchio “openai” su un server locale diventa “il tuo server”', () => {
    expect(saved({ provider: 'openai', baseUrl: 'http://localhost:11434/v1' }).llm.provider).toBe('custom')
  })

  test('il vecchio “openai” su OpenAI resta OpenAI', () => {
    expect(saved({ provider: 'openai', baseUrl: 'https://api.openai.com/v1' }).llm.provider).toBe('openai')
  })

  test('Anthropic non viene toccato', () => {
    expect(saved({ provider: 'anthropic' }).llm.provider).toBe('anthropic')
  })

  test('la trascrizione senza servizio lo deduce dall’URL salvato', () => {
    expect(
      saved({}, { provider: undefined as never, baseUrl: 'https://api.openai.com/v1' }).transcribe
        .provider,
    ).toBe('openai')
    expect(
      saved({}, { provider: undefined as never, baseUrl: 'http://192.168.1.10:8080/v1' }).transcribe
        .provider,
    ).toBe('custom')
  })
})
