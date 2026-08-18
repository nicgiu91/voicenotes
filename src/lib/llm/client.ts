import type { LlmSettings } from '../types'
import { t } from '../i18n'

export interface LlmMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * Chiama l'LLM configurato nelle impostazioni e restituisce il testo della
 * risposta. Supporta Anthropic e qualunque endpoint OpenAI-compatible
 * (LM Studio, Ollama, llama.cpp server, OpenAI, Groq...).
 */
export async function chatLLM(system: string, messages: LlmMessage[], s: LlmSettings): Promise<string> {
  if (!s.baseUrl) throw new Error(t('err.llmEndpoint'))
  if (s.provider === 'anthropic') return chatAnthropic(system, messages, s)
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
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: s.model,
      max_tokens: s.maxTokens || 4096,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
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
  return Boolean(s.baseUrl && s.model && (s.apiKey || s.provider === 'openai'))
}
