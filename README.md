# VoiceNotes

*[Leggi in italiano](README.it.md)*

An AI voice recorder for your phone — Plaud-style, but with no dedicated hardware. VoiceNotes
is a mobile-first web app (PWA) that records from your phone's microphone, transcribes,
summarizes, draws mind maps, and answers questions about your own notes. Everything stays on
your device: there is no backend of ours, and you choose the transcription and AI providers
yourself in Settings.

**Available in English and Italian** — switch anytime in Settings.

## Live app (installable on your phone)

**<https://nicgiu91.github.io/voicenotes/>**

Published automatically to GitHub Pages on every push to `master`. On iPhone open it in Safari
→ Share → "Add to Home Screen"; on Android in Chrome → ⋮ menu → "Install app".

## Features

- **Recording** — big start/stop button, timer, live level meter. Audio is written to
  IndexedDB in 30-second chunks, so a crash or a closed tab never loses a recording: on the
  next launch the note reappears as "recovered". You can also import existing audio files.
- **Transcription** — either on your device (Whisper via Transformers.js: free, private,
  works offline) or through any OpenAI-compatible API (OpenAI, Groq, or a whisper server on
  your own network). Long recordings are split into 10-minute segments and stitched back
  together with correct timestamps. Timestamps in the transcript are clickable and seek the
  audio.
- **AI** — summaries from four built-in templates (Meeting, Notes/Idea, Lecture/Training,
  Generic) plus your own custom templates; automatic titles and suggested tags; best-effort
  speaker separation; an interactive mind map (Markmap) with copyable Mermaid source; and
  **Ask**, a chat grounded in one or more of your selected notes.
- **Export** — a single note as Obsidian-ready Markdown (YAML frontmatter + summaries +
  mermaid mind map + timestamped transcript), the original audio, Web Share where available,
  and a full JSON backup of everything.

## Running it locally

Double-click **`avvia-voicenotes.bat`** (Windows), then:

- from the PC: <https://localhost:4000>
- from your phone (same Wi-Fi): `https://YOUR-PC-IP:4000` — the address appears in the console
  window after startup ("Network" line). The phone will warn about the certificate: choose
  "Advanced → Proceed". This is needed because microphone access requires a secure connection,
  and the PC's certificate is self-signed.

From a terminal: `npm install`, then `npm run dev` (plain HTTP, fine on localhost only).

## Configuring transcription

Settings → Transcription. Two modes:

**On this device (free, private, offline).** Whisper runs directly in the browser
(Transformers.js / WebAssembly): no API, no keys, and the audio never leaves the phone. The
model is downloaded on first use (Fast ~40 MB, Balanced ~80 MB, Accurate ~250 MB), and after
that it works offline too. It is slow — on a phone it can take longer than the audio itself —
so it suits short notes; long meetings are better served by the API mode.

**Online service (API).** Needs an **OpenAI-compatible** endpoint:

| Provider | Base URL | Notes |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | model `whisper-1`, API key required |
| Groq | `https://api.groq.com/openai/v1` | model `whisper-large-v3`, fast and cheap |
| whisper.cpp on your PC | `http://YOUR-PC-IP:8080/v1` | free, see CORS below |

## Configuring the AI

Settings → Artificial intelligence. Pick a provider, then pick a model from the dropdown —
each option states its speed/quality trade-off and its token cost:

| Model | Input / output per million tokens | Good for |
|---|---|---|
| Claude Haiku 4.5 | $1 / $5 | fast, cheap, everyday notes |
| Claude Sonnet 5 | $3 / $15 | balanced — the recommended default |
| Claude Opus 5 | $5 / $25 | top quality on demanding material |
| Claude Opus 4.8 | $5 / $25 | previous generation |
| Claude Fable 5 | $10 / $50 | most capable, and priced accordingly |

Choosing **OpenAI-compatible** instead lets you point at any local server (Ollama at
`http://YOUR-PC-IP:11434/v1`, LM Studio, llama.cpp) or another cloud provider; the dropdown
offers common local models, and "Other" accepts any model name you type.

API keys stay in the browser (IndexedDB) and are never sent anywhere else.

## Local servers: CORS and mixed content

The browser calls these APIs directly, so a server on your LAN must accept requests from the
PWA's origin (CORS):

- **whisper.cpp** (`llama-server` / `whisper-server`): usually already sends
  `Access-Control-Allow-Origin: *`; if not, put it behind a proxy that adds the header.
- **Ollama**: start it with `OLLAMA_ORIGINS=*`.
- **LM Studio**: enable the CORS option in the server settings.

**Mixed content:** if the app runs over HTTPS and the endpoint is `http://…`, the browser
blocks the request. Either use the app over HTTP from the PC (`npm run dev` on localhost), or
serve the local server over HTTPS (e.g. with Caddy or a tunnel).

## Known limits on iPhone (iOS Safari)

- **Format:** iOS does not support `audio/webm`; the app automatically falls back to
  `audio/mp4`.
- **Screen lock:** the app requests a wake lock to keep the screen on, but iOS may still
  suspend the page if you lock it or switch apps, which can stop the recording. Chunks already
  written (every 30 seconds) are never lost — the note comes back as "recovered" on the next
  launch. In practice: for long recordings, leave the screen on with the app in front.
- **PWA:** an installed PWA has fewer permissions than Safari on iOS; if the microphone will
  not start, try from a normal Safari tab.

## How data is stored

Everything lives in the browser's IndexedDB: audio (in 30-second chunks), transcripts,
summaries, mind maps, chats, templates, and settings. The app requests persistent storage to
reduce the risk of automatic eviction. For safety use **Settings → Export backup** (a single
JSON file with everything except API keys). Each note's `.md` export is Obsidian-ready
(YAML frontmatter + a `mermaid` mind map block).

## Development

- `npm run dev` — dev server on port 4000 (`VOICENOTES_HTTPS=1` serves it over HTTPS)
- `npm test` — unit tests (vitest): transcript merging, export, mind map, Ask context, i18n
- `npm run build` — static build in `dist/` (deployable anywhere; base `./`)

Layout: `src/lib` (audio, transcription, LLM, export, DB, i18n), `src/pages`,
`src/components`. Summary-template prompts are editable files under `src/lib/llm/prompts/`,
each exporting an Italian and an English version. UI strings live in
`src/lib/i18n/it.ts` and `src/lib/i18n/en.ts`; a test enforces that both files carry exactly
the same keys and placeholders.
