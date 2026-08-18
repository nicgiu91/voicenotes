# VoiceNotes

*[Read in English](README.md)*

Registratore AI per smartphone, in stile Plaud ma senza hardware dedicato: una web app (PWA)
che registra dal microfono del telefono, trascrive, riassume, disegna mappe mentali e risponde
a domande sulle tue note. Tutto resta sul dispositivo: nessun server proprietario, le API di
trascrizione e AI le scegli tu nelle Impostazioni.

**Disponibile in italiano e in inglese** — si cambia quando vuoi dalle Impostazioni.

## App online (installabile su telefono)

**<https://nicgiu91.github.io/voicenotes/>**

Pubblicata automaticamente su GitHub Pages a ogni push su `master`. Su iPhone aprila con
Safari → Condividi → "Aggiungi a Home"; su Android con Chrome → menu ⋮ → "Installa app".

## Avvio rapido (sul PC)

Doppio clic su **`avvia-voicenotes.bat`**, poi:

- dal PC: apri <https://localhost:4000>
- dal telefono (stessa rete Wi-Fi): apri `https://IP-DEL-PC:4000` — l'indirizzo compare
  nella finestra nera dopo l'avvio (riga "Network"). Al primo accesso il telefono mostra un
  avviso sul certificato: scegli "Avanzate → Procedi". Serve perché il microfono funziona
  solo su connessioni sicure (HTTPS).

In alternativa, da terminale: `npm install` e poi `npm run dev` (HTTP semplice, va bene solo
su localhost).

## Installare come app (PWA)

- **Android (Chrome):** menu ⋮ → "Aggiungi a schermata Home" / "Installa app".
- **iPhone (Safari):** pulsante Condividi → "Aggiungi a Home".

## Configurare la trascrizione

Impostazioni → Trascrizione. Due modalità:

**Sul dispositivo (gratis, privato, offline).** Whisper gira direttamente nel browser
(Transformers.js/WebAssembly): niente API, niente chiavi, l'audio non lascia mai il telefono.
Alla prima trascrizione scarica il modello (Veloce ~40 MB, Equilibrato ~80 MB, Preciso
~250 MB), poi funziona anche offline. È lenta — sul telefono può servire più tempo della
durata dell'audio stesso — quindi è adatta a note brevi; per le riunioni lunghe conviene la
modalità API.

**Servizio online (API).** Serve un endpoint **OpenAI-compatible**:

| Provider | URL base | Note |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | modello `whisper-1`, serve API key |
| Groq | `https://api.groq.com/openai/v1` | modello `whisper-large-v3`, veloce ed economico |
| whisper.cpp sul PC | `http://IP-DEL-PC:8080/v1` | gratuito, vedi CORS più sotto |

## Configurare l'AI

Impostazioni → Intelligenza artificiale. Scegli il provider, poi il modello dal menu a
tendina: ogni voce indica prestazioni e consumo di token.

| Modello | Costo per milione di token (input/output) | Adatto a |
|---|---|---|
| Claude Haiku 4.5 | $1 / $5 | veloce ed economico, uso quotidiano |
| Claude Sonnet 5 | $3 / $15 | equilibrato — la scelta consigliata |
| Claude Opus 5 | $5 / $25 | massima qualità su materiale impegnativo |
| Claude Opus 4.8 | $5 / $25 | generazione precedente |
| Claude Fable 5 | $10 / $50 | il più capace, e si paga |

Scegliendo **OpenAI-compatible** puoi puntare a un server locale (Ollama su
`http://IP-DEL-PC:11434/v1`, LM Studio, llama.cpp) o a un altro provider cloud; il menu
propone i modelli locali più comuni e la voce "Altro" accetta qualsiasi nome tu scriva.

Le chiavi API restano solo nel browser (IndexedDB) e non vengono mai inviate altrove.

## Server locali: CORS e mixed content

Il browser chiama le API direttamente, quindi il server sulla LAN deve accettare richieste
dall'origine della PWA (CORS):

- **whisper.cpp (`llama-server`/`whisper-server`):** di solito già invia
  `Access-Control-Allow-Origin: *`; se no, avvialo dietro un proxy che lo aggiunga.
- **Ollama:** avvia con `OLLAMA_ORIGINS=*` (variabile d'ambiente).
- **LM Studio:** nelle impostazioni del server attiva l'opzione CORS.

**Mixed content:** se l'app gira in HTTPS e l'endpoint è `http://…`, il browser blocca la
richiesta. Soluzioni: usare l'app in HTTP dal PC (`npm run dev` su localhost), oppure esporre
il server locale in HTTPS (es. con Caddy o un tunnel).

## Limiti noti su iPhone (iOS Safari)

- **Formato:** iOS non supporta `audio/webm`; l'app usa automaticamente `audio/mp4`.
- **Blocco schermo:** l'app chiede il "wake lock" per tenere lo schermo acceso, ma iOS può
  comunque sospendere la pagina se la blocchi o cambi app: la registrazione può fermarsi.
  I pezzi già salvati (ogni 30 secondi) non si perdono mai: al riavvio la nota compare come
  "recuperata". Consiglio pratico: durante registrazioni lunghe lascia lo schermo acceso
  sull'app.
- **PWA:** su iOS l'app installata ha meno permessi di Safari; se il microfono non parte,
  prova dalla scheda Safari normale.

## Come sono salvati i dati

Tutto in IndexedDB del browser: audio (a blocchi da 30 s), trascrizioni, riepiloghi, mappe,
chat, template e impostazioni. L'app chiede lo "storage persistente" per ridurre il rischio
di pulizia automatica. Per sicurezza usa **Impostazioni → Esporta backup** (file JSON con
tutto dentro, chiavi API escluse). L'export `.md` di ogni nota è pronto per Obsidian
(frontmatter YAML + mappa in blocco `mermaid`).

## Sviluppo

- `npm run dev` — server di sviluppo (porta 4000; con `VOICENOTES_HTTPS=1` usa HTTPS)
- `npm test` — unit test (vitest): merge trascrizioni, export, mappa, contesto Ask, traduzioni
- `npm run build` — build statica in `dist/` (deployabile ovunque, base `./`)

Struttura: `src/lib` (audio, trascrizione, LLM, export, DB, i18n), `src/pages`,
`src/components`. I prompt dei template sono file modificabili in `src/lib/llm/prompts/`,
ognuno con la versione italiana e quella inglese. I testi dell'interfaccia stanno in
`src/lib/i18n/it.ts` e `src/lib/i18n/en.ts`; un test verifica che i due file abbiano
esattamente le stesse chiavi e gli stessi segnaposto.
