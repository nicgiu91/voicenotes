import type { LlmSettings } from '../types'
import { llmProvider } from '../providers'
import { t } from '../i18n'

export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Chiama l'LLM configurato nelle impostazioni e restituisce il testo della
 * risposta. Supporta Anthropic e qualunque endpoint OpenAI-compatible
 * (LM Studio, Ollama, llama.cpp server, OpenAI, Gemini, OpenRouter...).
 */
/**
 * Stesse impostazioni ma col modello leggero: per i lavori meccanici
 * (titolo automatico, diarizzazione) dove il modello migliore e' uno spreco.
 */
export function fastLlm(s: LlmSettings): LlmSettings {
  return s.fastModel ? { ...s, model: s.fastModel } : s
}

export async function chatLLM(system: string, messages: LlmMessage[], s: LlmSettings): Promise<string> {
  if (!s.baseUrl) throw new Error(t('err.llmEndpoint'))
  if (llmProvider(s.provider).api === 'anthropic') return chatAnthropic(system, messages, s)
  return chatOpenAI(system, messages, s)
}

async function chatAnthropic(system: string, messages: LlmMessage[], s: LlmSettings): Promise<string> {
  const url = `${s.baseUrl.replace(/\/+$/, '')}/v1/messages`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': s.apiKey,
      'anthropic-version': '2023-06-01',
      // necessario per chiamare l'API Anthropic direttamente dal browser
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: s.model,
      max_tokens: s.maxTokens || 4096,
      system,
      messages,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(t('err.llmUnreachable', { status: res.status, body: body.slice(0, 300) }))
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const text = (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
  if (!text) throw new Error(t('err.llmEmpty'))
  return text
}

async function chatOpenAI(system: string, messages: LlmMessage[], s: LlmSettings): Promise<string> {
  const url = `${s.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (s.apiKey) headers.Authorization = `Bearer ${s.apiKey}`

  const send = (limitField: 'max_tokens' | 'max_completion_tokens') =>
    fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: s.model,
        [limitField]: s.maxTokens || 4096,
        messages: [{ role: 'system', content: system }, ...messages],
      }),
    })

  let res = await send('max_tokens')
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // i modelli OpenAI più recenti rifiutano max_tokens e vogliono max_completion_tokens
    if (res.status === 400 && body.includes('max_completion_tokens')) {
      res = await send('max_completion_tokens')
    } else {
      throw new Error(t('err.llmUnreachable', { status: res.status, body: body.slice(0, 300) }))
    }
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(t('err.llmUnreachable', { status: res.status, body: body.slice(0, 300) }))
  }
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = (data.choices?.[0]?.message?.content ?? '').trim()
  if (!text) throw new Error(t('err.llmEmpty'))
  return text
}

export function llmConfigured(s: LlmSettings): boolean {
  return Boolean(s.baseUrl && s.model && (s.apiKey || !llmProvider(s.provider).keyRequired))
}
