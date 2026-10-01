import { describe, expect, it as test } from 'vitest'
import { checkModel, compareVersions, parseModelId } from '../src/lib/modelUpdates'

// elenchi come li restituiscono davvero i servizi (/v1/models), accorciati
const ANTHROPIC = [
  'claude-fable-5-1',
  'claude-opus-5-5',
  'claude-sonnet-5-5',
  'claude-fable-5',
  'claude-opus-5',
  'claude-sonnet-5',
  'claude-opus-4-8',
  'claude-haiku-4-5-20251001',
]
const OPENAI = [
  'gpt-6-astra',
  'gpt-6.1-sol',
  'gpt-6-luna',
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-transcribe',
  'text-embedding-3-large',
]
const GOOGLE = ['gemini-3.8-flash', 'gemini-3.7-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-pro-preview']
const XAI = ['grok-4.7', 'grok-4.6', 'grok-4.3', 'grok-4.20-0309-reasoning', 'grok-build-0.1']

describe('lettura del nome di un modello', () => {
  test('separa famiglia e versione', () => {
    expect(parseModelId('claude-sonnet-5-5')).toEqual({ family: 'claude-sonnet', version: [5, 5] })
    expect(parseModelId('gemini-3.5-flash-lite')).toEqual({ family: 'gemini-flash-lite', version: [3, 5] })
    expect(parseModelId('gpt-6.1-sol')).toEqual({ family: 'gpt-sol', version: [6, 1] })
  })

  test('ignora le date degli snapshot', () => {
    expect(parseModelId('claude-haiku-4-5-20251001')).toEqual({ family: 'claude-haiku', version: [4, 5] })
    expect(parseModelId('gpt-4o-mini-2024-07-18')).toBeNull()
    expect(parseModelId('grok-4.20-0309-reasoning')).toEqual({ family: 'grok-reasoning', version: [4, 20] })
  })

  test('alias e nomi senza versione non si confrontano', () => {
    expect(parseModelId('mistral-small-latest')).toBeNull()
    expect(parseModelId('deepseek-flash')).toBeNull()
    expect(parseModelId('gpt-4o-mini')).toBeNull()
  })

  test('confronto fra versioni', () => {
    expect(compareVersions([5, 5], [5])).toBeGreaterThan(0)
    expect(compareVersions([4, 7], [4, 20])).toBeLessThan(0)
    expect(compareVersions([3, 8], [3, 8])).toBe(0)
  })
})

describe('ricerca della versione più recente', () => {
  test('propone il successore nella stessa famiglia', () => {
    expect(checkModel('claude-sonnet-5', ANTHROPIC)).toEqual({ status: 'newer', next: 'claude-sonnet-5-5' })
    expect(checkModel('claude-opus-4-8', ANTHROPIC)).toEqual({ status: 'newer', next: 'claude-opus-5-5' })
    expect(checkModel('gemini-3.7-flash', GOOGLE)).toEqual({ status: 'newer', next: 'gemini-3.8-flash' })
  })

  test('non cambia mai famiglia: un Sonnet non diventa un Opus, un Flash-Lite non diventa Flash', () => {
    expect(checkModel('claude-sonnet-5-5', ANTHROPIC)).toEqual({ status: 'ok' })
    expect(checkModel('gemini-3.5-flash-lite', GOOGLE)).toEqual({ status: 'ok' })
    expect(checkModel('gpt-6-luna', OPENAI)).toEqual({ status: 'ok' })
  })

  test('l’alias senza data conta come presente', () => {
    expect(checkModel('claude-haiku-4-5', ANTHROPIC)).toEqual({ status: 'ok' })
  })

  test('grok 4.20 è un’altra famiglia, non “più nuovo” di 4.7', () => {
    expect(checkModel('grok-4.7', XAI)).toEqual({ status: 'ok' })
    expect(checkModel('grok-4.6', XAI)).toEqual({ status: 'newer', next: 'grok-4.7' })
  })

  test('segnala un modello sparito, con il successore se c’è', () => {
    expect(checkModel('gemini-2.5-flash', GOOGLE)).toEqual({ status: 'missing', next: 'gemini-3.8-flash' })
    expect(checkModel('gemini-2.5-pro', GOOGLE)).toEqual({ status: 'missing' })
    expect(checkModel('modello-inventato', OPENAI)).toEqual({ status: 'missing' })
  })

  test('gli alias che si aggiornano da soli non vengono toccati', () => {
    expect(checkModel('mistral-small-latest', ['mistral-small-latest', 'mistral-small-2603'])).toEqual({
      status: 'ok',
    })
  })

  test('senza elenco o senza modello non dice niente', () => {
    expect(checkModel('claude-sonnet-5-5', [])).toEqual({ status: 'ok' })
    expect(checkModel('', ANTHROPIC)).toEqual({ status: 'ok' })
  })
})
