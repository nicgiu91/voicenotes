import { describe, expect, it as test } from 'vitest'
import { describeApiError, describeNetworkError } from '../src/lib/apiError'
import { setLang } from '../src/lib/i18n'

setLang('it')

describe('errori dei servizi tradotti in italiano', () => {
  test('401 e 403 parlano della chiave', () => {
    for (const s of [401, 403]) {
      const m = describeApiError(s, '{"error":"invalid key"}', 'llm')
      expect(m).toContain('chiave API')
      expect(m).toContain('Impostazioni')
    }
  })

  test('429 dice di aspettare', () => {
    expect(describeApiError(429, '', 'llm')).toContain('Aspetta')
  })

  test('credito esaurito riconosciuto dallo stato e dal testo', () => {
    expect(describeApiError(402, '', 'llm')).toContain('credito')
    expect(describeApiError(400, 'insufficient_quota', 'llm')).toContain('credito')
  })

  // caso vero incontrato con OpenAI: risponde 429 anche quando il credito e'
  // finito, e dire "aspetta un minuto" manda l'utente fuori strada
  test('429 per credito finito parla di credito, non di attesa', () => {
    const vero =
      '{ "error": { "message": "You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/." } }'
    const m = describeApiError(429, vero, 'transcribe')
    expect(m).toContain('credito')
    expect(m).not.toContain('Aspetta un minuto')
  })

  test('429 per troppe richieste resta un invito ad aspettare', () => {
    const m = describeApiError(429, 'Rate limit reached for requests', 'llm')
    expect(m).toContain('Aspetta')
  })

  test('modello inesistente rimanda ad aggiornare l’elenco', () => {
    expect(describeApiError(404, '', 'llm')).toContain('elenco dei modelli')
    expect(describeApiError(400, 'The model `pippo` was not found', 'llm')).toContain(
      'elenco dei modelli',
    )
  })

  test('audio troppo grande e testo troppo lungo hanno consigli diversi', () => {
    expect(describeApiError(413, '', 'transcribe')).toContain('audio')
    expect(describeApiError(413, '', 'llm')).toContain('testo')
  })

  test('errore del servizio rassicura che non dipende dall’utente', () => {
    expect(describeApiError(503, '', 'llm')).toContain('Non dipende da te')
  })

  test('il dettaglio tecnico resta, ma corto e in coda', () => {
    const m = describeApiError(401, 'x'.repeat(1000), 'llm')
    expect(m).toContain('HTTP 401')
    expect(m.length).toBeLessThan(500)
    // la spiegazione viene prima del dettaglio
    expect(m.indexOf('chiave API')).toBeLessThan(m.indexOf('HTTP 401'))
  })

  test('senza corpo della risposta non si aggiunge una parentesi vuota', () => {
    expect(describeApiError(401, '   ', 'llm')).not.toContain('HTTP')
  })

  test('errore di rete distingue i due servizi e suggerisce cosa guardare', () => {
    expect(describeNetworkError('llm')).toContain('AI')
    expect(describeNetworkError('transcribe')).toContain('trascrizione')
    expect(describeNetworkError('llm')).toContain('Impostazioni')
  })

  test('nessun messaggio mostra JSON grezzo come prima frase', () => {
    for (const s of [401, 429, 402, 404, 500, 400]) {
      expect(describeApiError(s, '{"type":"error"}', 'llm').startsWith('{')).toBe(false)
    }
  })
})
