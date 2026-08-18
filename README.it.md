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

**Servizio online (API).** Scegli il servizio dal menu a tendina: l'app riempie da sola
indirizzo e modelli, e il link "Dove prendo la chiave?" porta alla pagina dove quel servizio
rilascia le API key.

| Servizio | Modelli proposti | Note |
|---|---|---|
| OpenAI | `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe` | i modelli GPT-4o sono più precisi ma non danno i timestamp |
| Groq | `whisper-large-v3-turbo`, `whisper-large-v3` | velocissimo ed economico |
| Il tuo server o un altro servizio | quello che scrivi tu | whisper.cpp, faster-whisper, Speaches… vedi CORS più sotto |

Va bene qualunque endpoint OpenAI-compatible: scegli "Il tuo server", scrivi l'indirizzo e
seleziona (o scrivi) il modello.

## Configurare l'AI

Impostazioni → Intelligenza artificiale. Scegli il servizio e l'app riempie indirizzo e
modelli: a te resta solo la chiave, e il link "Dove prendo la chiave?" porta dritto alla
pagina che la rilascia.

| Servizio | Perché sceglierlo |
|---|---|
| Anthropic (Claude) | quello predefinito: i riepiloghi migliori in italiano e inglese |
| OpenAI (ChatGPT) | se hai già una chiave OpenAI |
| Google (Gemini) | piano gratuito generoso, modelli molto economici |
| Groq | le risposte più veloci, a costo quasi nullo |
| OpenRouter | decine di modelli (Claude e GPT compresi) con una chiave sola |
| Mistral AI | provider europeo |
| DeepSeek | tra i più economici |
| Il tuo server o un altro servizio | Ollama, LM Studio, llama.cpp: gratis, privato, senza chiave |

Tutti i servizi tranne Anthropic parlano il protocollo OpenAI-compatible, quindi funziona
qualunque servizio lo usi, anche se non è in elenco.

Ogni modello nel menu dice quanto è bravo e quanto consuma. I prezzi indicati valgono per
Claude:

| Modello | Costo per milione di token (input/output) | Adatto a |
|---|---|---|
| Claude Haiku 4.5 | $1 / $5 | veloce ed economico, uso quotidiano |
| Claude Sonnet 5 | $3 / $15 | equilibrato — la scelta consigliata |
| Claude Opus 5 | $5 / $25 | massima qualità su materiale impegnativo |
| Claude Opus 4.8 | $5 / $25 | generazione precedente |
| Claude Fable 5 | $10 / $50 | il più capace, e si paga |

Per gli altri servizi controlla il listino sul loro sito. Se il modello che cerchi non è in
elenco, **Aggiorna l'elenco dei modelli** chiede al servizio quali modelli la tua chiave può
davvero usare, e **Altro** ti lascia scrivere qualsiasi nome.

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
