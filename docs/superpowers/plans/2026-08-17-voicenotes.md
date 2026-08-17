# VoiceNotes — Piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA mobile-first (stile Plaud, senza hardware) per registrare audio dal telefono, trascriverlo via API configurabile, generare riepiloghi/mappe mentali/chat con LLM, ed esportare in formato Obsidian.

**Architecture:** App 100% client-side (Vite + React + TypeScript) installabile come PWA. Persistenza in IndexedDB via Dexie (audio a chunk da 30 s, note, impostazioni, template, chat). Le API esterne (trascrizione OpenAI-compatible, LLM Anthropic o OpenAI-compatible) sono chiamate direttamente dal browser con endpoint/chiavi configurabili nelle impostazioni. Nessun backend proprietario.

**Tech Stack:** Vite 7, React 19, TypeScript, Dexie 4, react-router-dom (HashRouter), vite-plugin-pwa, @vitejs/plugin-basic-ssl (HTTPS per uso da telefono in LAN), markmap-lib/markmap-view (mappa mentale interattiva), vitest (unit test della logica pura).

## Global Constraints

- UI interamente in **italiano**, dark mode di default, mobile-first.
- Porta dev: **4000**, `--host` attivo (accesso dal telefono in LAN), HTTPS self-signed via basic-ssl (necessario per microfono e PWA fuori da localhost).
- Nessun URL hardcoded per le API: tutto configurabile in Impostazioni.
- API key salvate solo in IndexedDB, mai loggate.
- Formato registrazione: `audio/webm;codecs=opus` se supportato, fallback `audio/mp4` (iOS Safari).
- Salvataggio a chunk ogni 30 s in IndexedDB durante la registrazione.
- Deployabile come sito statico (base `./`, HashRouter).
- Prompt dei template in file separati facilmente modificabili (`src/lib/llm/prompts/`).
- Commit per milestone (M1–M4). Test vitest solo sulla logica pura in `src/lib/` (no test UI).
- Tutti i file scritti con il tool Write (mai riscrivere file con accenti via PowerShell — corrompe l'UTF-8).

---

## Struttura file

```
voicenotes/
  avvia-voicenotes.bat        # avvio per l'utente (npm run dev, porta 4000)
  vite.config.ts              # react + pwa + basic-ssl, port 4000, base './'
  index.html
  src/
    main.tsx, App.tsx         # HashRouter, layout mobile con tab bar
    styles.css                # tema dark, variabili CSS
    lib/
      db.ts                   # schema Dexie: notes, chunks, settings, templates, chats
      types.ts                # tipi condivisi (Note, TranscriptSegment, Settings…)
      audio/recorder.ts       # MediaRecorder + chunk 30s→Dexie + wakeLock + livello
      audio/wav.ts            # decode→resample 16k mono→segmenti WAV (audio lungo)
      transcribe/client.ts    # POST /audio/transcriptions (verbose_json→segmenti)
      llm/client.ts           # chat() unificata: Anthropic o OpenAI-compatible
      llm/prompts/*.ts        # template riunione/appunti/lezione/generico/titolo/mindmap/diarizzazione
      export/markdown.ts      # nota→.md Obsidian (frontmatter YAML + mermaid)
      export/backup.ts        # backup/restore JSON+base64
      format.ts               # formatTime, formatDate, slugify
    components/               # Recorder, LevelMeter, NoteCard, TranscriptView,
                              # MindMapView, ChatView, TagEditor…
    pages/                    # Home, Record, NoteDetail, Ask, Settings, Templates
  tests/                      # vitest: format, markdown export, merge segmenti, backup
```

## Milestone M1 — Registratore (già utile da solo)

### Task 1: Scaffold + tema + navigazione
**Files:** package.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/styles.css, avvia-voicenotes.bat
- [ ] `npm create vite` (react-ts), dipendenze: dexie, react-router-dom, vite-plugin-pwa, markmap-lib, markmap-view, @vitejs/plugin-basic-ssl, vitest
- [ ] vite.config: porta 4000, host true, https (basic-ssl), base './', PWA manifest (nome "VoiceNotes", tema scuro, icone SVG inline generate)
- [ ] Layout: tab bar in basso (Note, Registra, Impostazioni), tema dark con variabili CSS
- [ ] Promemoria privacy al primo avvio (registrare solo col consenso dei presenti) salvato in settings
- [ ] Commit `feat(M1): scaffold, tema dark, navigazione`

### Task 2: Database Dexie
**Files:** src/lib/db.ts, src/lib/types.ts
**Produces:** `db.notes/chunks/settings/templates/chats`; `Note {id, title, createdAt, durationSec, mimeType, tags[], status, transcript?, summaries?, mindmap?}`; `getSettings()/saveSettings()`; `navigator.storage.persist()` richiesto all'avvio.
- [ ] Schema + helper CRUD + test su assemblaggio nota
- [ ] Commit

### Task 3: Registratore con chunk e wake lock
**Files:** src/lib/audio/recorder.ts, src/components/Recorder.tsx, src/components/LevelMeter.tsx, src/pages/Record.tsx
**Produces:** classe `ChunkedRecorder` — `start()`, `stop(): Promise<{noteId}>`, callback `onTick(sec)`, `onLevel(0..1)`. MediaRecorder con `timeslice=30000`, ogni chunk scritto subito in `db.chunks {noteId, index, blob}`. `pickMimeType()`: webm/opus → mp4. WakeLock con riacquisto su visibilitychange. AnalyserNode per il VU meter.
- [ ] Pulsante grande start/stop, timer, VU meter, salvataggio nota al termine
- [ ] Recupero registrazioni interrotte: all'avvio, note `status='recording'` → chiudile come recuperate coi chunk presenti
- [ ] Import file audio esistente (input file)
- [ ] Commit

### Task 4: Libreria e riproduzione
**Files:** src/pages/Home.tsx, src/pages/NoteDetail.tsx, src/components/NoteCard.tsx, src/lib/audio/assemble.ts
**Produces:** `assembleAudio(noteId): Promise<Blob>` (concat chunk in ordine), player `<audio>` con URL.createObjectURL, elenco note con data/durata, rinomina, elimina (con conferma), esporta audio.
- [ ] Commit `feat(M1): libreria e riproduzione` + tag milestone

## Milestone M2 — Trascrizione

### Task 5: Impostazioni provider
**Files:** src/pages/Settings.tsx
**Produces:** form trascrizione (baseUrl, apiKey, model, lingua auto/it) e LLM (provider anthropic|openai-compatible, baseUrl, apiKey, model, maxTokens). Avviso mixed-content per endpoint HTTP in LAN. Nulla di hardcoded.
- [ ] Commit

### Task 6: Client trascrizione + segmentazione audio lungo
**Files:** src/lib/transcribe/client.ts, src/lib/audio/wav.ts, tests/transcribe.test.ts
**Produces:** `transcribe(blob, settings, onProgress): Promise<{segments: {start,end,text}[], text}>`. multipart `file+model+language+response_format=verbose_json` (fallback `json` senza timestamp). Se durata > 10 min: `decodeAudioData` → OfflineAudioContext resample 16 kHz mono → slice WAV da 10 min → trascrizioni sequenziali → merge con offset timestamp (funzione pura `mergeSegments`, testata).
- [ ] Commit

### Task 7: UI trascrizione + titolo automatico
**Files:** src/components/TranscriptView.tsx, modifiche NoteDetail
**Produces:** timestamp cliccabili → seek audio; pulsante "Trascrivi"; dopo trascrizione, titolo generato dall'LLM se configurato (prompt `titolo.ts`).
- [ ] Commit + tag M2

## Milestone M3 — AI

### Task 8: Client LLM unificato + prompt
**Files:** src/lib/llm/client.ts, src/lib/llm/prompts/*.ts, tests/llm.test.ts
**Produces:** `chatLLM(messages, settings): Promise<string>` — Anthropic (`/v1/messages`, header `anthropic-dangerous-direct-browser-access`) o OpenAI-compatible (`/chat/completions`). Prompt integrati: riunione, appunti, lezione, generico, titolo, mindmap (output Markdown gerarchico + blocco mermaid mindmap), diarizzazione best-effort ("Parlante 1/2").
- [ ] Commit

### Task 9: Riepiloghi multi-template + template personalizzati
**Files:** src/pages/Templates.tsx, sezione riepiloghi in NoteDetail
**Produces:** selezione template (anche multipli), risultato salvato in `note.summaries[templateId]`, CRUD template personalizzati in `db.templates`.
- [ ] Commit

### Task 10: Mappa mentale
**Files:** src/components/MindMapView.tsx
**Produces:** rendering Markmap interattivo (zoom/pan) dal Markdown gerarchico; pulsanti "Copia Mermaid" e "Copia Markdown".
- [ ] Commit

### Task 11: Ask (chat sulle note)
**Files:** src/pages/Ask.tsx, src/components/ChatView.tsx
**Produces:** selezione di 1+ note, contesto = trascrizioni (troncate in modo intelligente se oltre ~24k caratteri: testa+coda per nota), cronologia in `db.chats` per nota/gruppo.
- [ ] Commit + tag M3

## Milestone M4 — Rifinitura

### Task 12: Export Obsidian + backup
**Files:** src/lib/export/markdown.ts, src/lib/export/backup.ts, tests/export.test.ts
**Produces:** `noteToMarkdown(note)` — frontmatter YAML (data, durata, tag) + trascrizione con timestamp + riepiloghi + blocco ```mermaid mindmap; `exportBackup()` / `importBackup(file)` JSON con audio base64. Web Share API se disponibile, altrimenti download.
- [ ] Commit

### Task 13: Ricerca, tag, PWA offline
**Files:** Home (ricerca full-text client-side su titoli+trascrizioni, filtro tag), TagEditor (tag manuali + suggeriti dall'AI), verifica precache offline
- [ ] Commit + tag M4

### Task 14: README + verifica finale
- [ ] README.md: setup, limiti iOS Safari (MediaRecorder mp4, wakeLock, PWA), configurazione CORS per whisper.cpp/Ollama/LM Studio, HTTPS/mixed content, uso da telefono
- [ ] `npm run build` pulito, `npx vitest run` verde, verifica in anteprima browser
- [ ] Commit finale
