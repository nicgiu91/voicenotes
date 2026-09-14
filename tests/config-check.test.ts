import { describe, expect, it as test } from 'vitest'
import { checkProviderConfig } from '../src/lib/configCheck'
import { llmProvider, transcribeProvider } from '../src/lib/providers'

const chiavi = (info: Parameters<typeof checkProviderConfig>[0], url: string, key: string) =>
  checkProviderConfig(info, url, key, 'Servizio').map((w) => w.key)

const anthropic = llmProvider('anthropic')
const openai = llmProvider('openai')
const mio = llmProvider('custom')
const whisper = transcribeProvider('openai')

describe('avvisi sulla configurazione', () => {
  test('una configurazione corretta non dice niente', () => {
    expect(chiavi(anthropic, 'https://api.anthropic.com', `sk-ant-${'a'.repeat(100)}`)).toEqual([])
    expect(chiavi(openai, 'https://api.openai.com/v1', `sk-proj-${'a'.repeat(150)}`)).toEqual([])
    expect(chiavi(anthropic, 'https://api.anthropic.com', '')).toEqual([])
  })

  // il caso vero: un indirizzo incollato nel campo della chiave
  test('riconosce un indirizzo messo al posto della chiave', () => {
    const w = chiavi(whisper, 'https://api.openai.com/v1', 'https://api.anthropic.com')
    expect(w).toContain('warn.keyLooksLikeUrl')
  })

  // l'altra meta' dello stesso errore vero
  test('riconosce l’indirizzo di un altro servizio', () => {
    const w = chiavi(whisper, 'https://api.anthropic.com', `sk-${'a'.repeat(50)}`)
    expect(w).toContain('warn.urlMismatch')
  })

  test('l’avviso sull’indirizzo dice dove risponde davvero il servizio', () => {
    const w = checkProviderConfig(whisper, 'https://api.anthropic.com', '', 'OpenAI')
    expect(w[0].params?.host).toBe('api.openai.com')
    expect(w[0].params?.service).toBe('OpenAI')
  })

  test('una chiave riconoscibile di un altro servizio viene chiamata per nome', () => {
    const w = checkProviderConfig(
      openai,
      'https://api.openai.com/v1',
      `sk-ant-${'a'.repeat(100)}`,
      'OpenAI',
    )
    expect(w.map((x) => x.key)).toContain('warn.keyOtherService')
    expect(w[0].params?.other).toBe('Anthropic')
  })

  test('una chiave non riconoscibile ma dal prefisso sbagliato viene comunque segnalata', () => {
    expect(chiavi(anthropic, 'https://api.anthropic.com', `sk-proj-${'a'.repeat(100)}`)).toContain(
      'warn.keyPrefix',
    )
  })

  test('una chiave troppo corta viene segnalata', () => {
    expect(chiavi(anthropic, 'https://api.anthropic.com', 'sk-ant-corta')).toContain(
      'warn.keyTooShort',
    )
  })

  test('spazi e a capo nella chiave', () => {
    expect(chiavi(anthropic, 'https://api.anthropic.com', `sk-ant-aaa\nbbb${'c'.repeat(90)}`)).toContain(
      'warn.keyHasSpaces',
    )
  })

  test('con “il tuo server” non si giudicano indirizzo né chiave', () => {
    expect(chiavi(mio, 'http://192.168.1.50:1234/v1', 'qualunque-cosa')).toEqual([])
    expect(chiavi(mio, 'http://localhost:11434/v1', '')).toEqual([])
  })

  test('anche col proprio server, un indirizzo al posto della chiave resta un errore', () => {
    expect(chiavi(mio, 'http://localhost:11434/v1', 'http://localhost:11434')).toContain(
      'warn.keyLooksLikeUrl',
    )
  })

  test('un indirizzo scritto male non fa esplodere il controllo', () => {
    for (const url of ['', 'non-un-indirizzo', 'http://', '://', 'api.openai.com']) {
      expect(() => chiavi(openai, url, 'sk-aaaaaaaaaaaaaaaaaaaaaaaa')).not.toThrow()
    }
  })

  test('il porto e il percorso non contano, conta il dominio', () => {
    expect(chiavi(openai, 'https://api.openai.com/v1/', `sk-${'a'.repeat(50)}`)).toEqual([])
  })
})
