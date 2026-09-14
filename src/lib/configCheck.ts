import type { TKey } from './i18n'
import type { ProviderInfo } from './providers'

export interface ConfigWarning {
  key: TKey
  params?: Record<string, string | number>
}

/** Sotto questa lunghezza, per un servizio noto, la chiave è quasi certamente monca. */
const MIN_KEY = 20

/**
 * Inizi inconfondibili: servono a dire "questa è la chiave di un altro".
 * Solo prefissi specifici, non "sk-" che usano in tanti.
 */
const PREFISSI_NOTI: [string, string][] = [
  ['sk-ant-', 'Anthropic'],
  ['sk-or-', 'OpenRouter'],
  ['xai-', 'xAI'],
  ['AIza', 'Google'],
]

function hostOf(url: string): string {
  try {
    return new URL(url).host.toLowerCase()
  } catch {
    return ''
  }
}

/**
 * Controlli sulla configurazione di un servizio: non bloccano niente, avvisano
 * e basta. Nascono da errori veri — una chiave incollata nel campo sbagliato e
 * l'indirizzo di un servizio lasciato su un altro — che senza un avviso
 * costano mezz'ora di indagine su un errore incomprensibile.
 */
export function checkProviderConfig(
  info: ProviderInfo<string>,
  baseUrl: string,
  apiKey: string,
  serviceName: string,
): ConfigWarning[] {
  const avvisi: ConfigWarning[] = []
  const chiave = apiKey.trim()
  const chiaveEUnIndirizzo = /^https?:\/\//i.test(chiave)

  if (chiaveEUnIndirizzo) {
    avvisi.push({ key: 'warn.keyLooksLikeUrl' })
  } else if (chiave && /\s/.test(apiKey)) {
    avvisi.push({ key: 'warn.keyHasSpaces' })
  }

  // per "il tuo server" indirizzo e chiave li decide l'utente: niente da dire
  if (info.ownUrl) return avvisi

  const atteso = hostOf(info.baseUrl)
  const scritto = hostOf(baseUrl)
  if (scritto && atteso && scritto !== atteso) {
    avvisi.push({ key: 'warn.urlMismatch', params: { service: serviceName, host: atteso } })
  }

  if (chiave && !chiaveEUnIndirizzo) {
    // prima si guarda se la chiave e' riconoscibilmente di un altro servizio:
    // e' l'errore piu' comune, e dirlo per nome aiuta piu' di un prefisso
    const altro = PREFISSI_NOTI.find(
      ([pre]) => chiave.startsWith(pre) && pre !== info.keyPrefix,
    )
    if (altro) {
      avvisi.push({ key: 'warn.keyOtherService', params: { other: altro[1], service: serviceName } })
    } else if (info.keyPrefix && !chiave.startsWith(info.keyPrefix)) {
      avvisi.push({ key: 'warn.keyPrefix', params: { service: serviceName, prefix: info.keyPrefix } })
    } else if (chiave.length < MIN_KEY) {
      avvisi.push({ key: 'warn.keyTooShort' })
    }
  }

  return avvisi
}
