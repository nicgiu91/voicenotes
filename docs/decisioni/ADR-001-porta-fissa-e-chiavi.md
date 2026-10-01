# ADR-001: Un solo indirizzo per VoiceNotes, e un modo per non perdere le chiavi

**Stato:** Proposta
**Data:** 16 settembre 2026
**Decide:** Nicola (unico utente e proprietario del progetto)

## Contesto

Le chiavi API, le note e l'audio vivono nel browser, dentro IndexedDB. Il browser tiene
questi dati separati per **origine**, cioè per la combinazione esatta di protocollo,
nome host e porta. `https://localhost:4000` e `https://localhost:4001` sono due archivi
diversi, senza alcun collegamento fra loro.

VoiceNotes viene però aperta da più origini:

| Origine | Quando |
|---|---|
| `https://localhost:4000` | dal PC, con `avvia-voicenotes.bat` |
| `https://192.168.x.x:4000` | dal telefono, in LAN |
| `http://localhost:4000` | dall'anteprima dell'app Claude, durante lo sviluppo |
| `https://nicgiu91.github.io/voicenotes/` | versione online |
| `https://localhost:4001` | quando la 4000 è occupata |

L'ultima riga è il problema, ed è già successa. Ricostruzione dai file e dai processi:

- **15 set, 00:18** — l'anteprima di sviluppo occupava la porta 4000. Il `.bat` l'ha
  trovata presa e, poiché Vite ha `strictPort: false`, è passato in silenzio alla 4001.
  Le chiavi sono state inserite lì (cartella Edge `https_localhost_4001`, creata alle
  00:18 e scritta fino alle 00:26).
- **15 set, 10:29** — la 4000 era libera, il `.bat` è partito lì. Stessa app, archivio
  diverso: nessuna chiave. Sembravano perse.
- **15 set, 10:34** — l'app Claude ha riavviato la sua anteprima sulla 4000, in HTTP.

Due fatti aggravanti:

1. **Una chiave API non è recuperabile.** OpenAI e Anthropic la mostrano una volta sola:
   se l'archivio sparisce e non c'è una copia, si deve generare una chiave nuova.
2. **Il browser interno dell'app Claude non salva su disco.** Le chiavi inserite lì
   spariscono da sole. Non va usato come browser d'uso quotidiano.

Vincoli che restano fermi: nessun server proprietario, le chiavi non escono dal
dispositivo, l'app deve restare un sito statico o `npm run dev`.

## Decisione

Rendere l'indirizzo **unico e prevedibile** (Opzione A), e in un secondo momento dare un
**backup esplicito** delle impostazioni (Opzione B). A elimina la causa; B limita il
danno nei casi che A non copre (cambio PC, pulizia del browser, telefono nuovo).

## Opzioni considerate

### Opzione A — Porta fissa e indirizzo dichiarato

`strictPort: true`, l'anteprima di sviluppo spostata sulla 4010, e nelle Impostazioni una
riga che dice a quale indirizzo appartengono le chiavi mostrate.

| Dimensione | Valutazione |
|---|---|
| Complessità | Bassa — una riga di configurazione, una di testo |
| Costo | Circa un'ora |
| Robustezza | Alta sulla causa vera; nulla sul resto |
| Familiarità | Totale, è codice già nostro |

**Pro:** toglie il cambio di porta silenzioso; se qualcosa non torna, il `.bat` si ferma
con un messaggio invece di aprire un'app vuota; l'avviso rende evidente il motivo.
**Contro:** non protegge da browser pulito, PC nuovo o IP del telefono che cambia.

### Opzione B — Esporta e importa le impostazioni

Un pulsante che salva le impostazioni in un file, e uno che le rilegge.

| Dimensione | Valutazione |
|---|---|
| Complessità | Bassa-media — serializzazione e lettura di un file |
| Costo | Mezza giornata |
| Robustezza | Alta: copre ogni caso, anche il cambio di dispositivo |
| Familiarità | Alta |

**Pro:** è l'unica opzione che risponde a "ho cambiato telefono"; utile anche per portare
la stessa configurazione su più dispositivi.
**Contro:** il file contiene le chiavi in chiaro. Sul PC la cartella utente è spesso
sincronizzata con OneDrive, quindi un salvataggio distratto finisce nel cloud. Mitigazione:
esportare **senza** chiavi per impostazione predefinita, con una casella da spuntare per
includerle e un avviso esplicito su dove salvare il file.

### Opzione C — Nome fisso tipo `voicenotes.local`

Voce nel file `hosts` del PC e sul telefono, così l'indirizzo non dipende dall'IP.

| Dimensione | Valutazione |
|---|---|
| Complessità | Media-alta — modifiche di sistema, certificato da rifare |
| Costo | Un giorno, più manutenzione |
| Robustezza | Risolve solo il caso dell'IP che cambia |
| Familiarità | Bassa: il telefono richiede il DNS locale o una app |

**Pro:** un unico indirizzo memorabile su tutti i dispositivi.
**Contro:** sul telefono il file `hosts` non si tocca senza root; servirebbe un DNS sul
router. Sproporzionato.

### Opzione D — Nessuna modifica, solo disciplina

Salvare l'indirizzo nei preferiti e usare sempre quello.

| Dimensione | Valutazione |
|---|---|
| Complessità | Nulla |
| Costo | Zero |
| Robustezza | Nulla: il preferito punta alla 4000 anche quando l'app è sulla 4001 |
| Familiarità | — |

**Pro:** niente da scrivere.
**Contro:** l'errore di ieri si ripete identico, perché non dipende da cosa apre l'utente
ma da quale porta trova libera il server.

## Analisi dei compromessi

Il nodo è che **la memoria dell'app è legata all'indirizzo, e l'indirizzo finora non era
garantito**. A rende l'indirizzo garantito; B toglie all'indirizzo il ruolo di unica copia
dei dati. Sono complementari, non alternative: fare solo B lascerebbe in piedi la trappola
della porta, fare solo A lascia il rischio di perdere chiavi non recuperabili.

Il costo vero di B non è il tempo, è la privacy: si crea un file con le chiavi in chiaro,
dove oggi esistono solo dentro il browser. Da qui la scelta di esportare senza chiavi per
impostazione predefinita — chi vuole il backup completo lo chiede in modo esplicito e legge
l'avviso.

C e D sono scartate: C risolve poco a caro prezzo, D non risolve niente.

## Conseguenze

**Diventa più facile:** l'app si apre sempre allo stesso indirizzo; una configurazione
fallita è rumorosa invece che silenziosa; con B, cambiare dispositivo non costa chiavi nuove.

**Diventa più difficile:** con la porta bloccata, avviare due copie dell'app è impossibile
(voluto, ma è un cambio di comportamento); con B esiste un file da custodire.

**Da rivedere:** l'IP del telefono resta variabile — se cambia spesso, torna in gioco una
forma di C. Se un giorno le note dovessero essere condivise fra dispositivi, questa
decisione va riaperta per intero, perché tocca il vincolo "nessun server".

## Azioni

1. [ ] `strictPort: true` in `vite.config.ts`, con messaggio chiaro quando la porta è occupata
2. [ ] Anteprima di sviluppo spostata sulla porta 4010 (`.claude/launch.json`, locale e globale)
3. [ ] Riga nelle Impostazioni: "Chiavi salvate solo per questo indirizzo: …"
4. [ ] Recupero delle chiavi attuali dall'archivio della porta 4001
5. [ ] Opzione B: esporta/importa impostazioni, senza chiavi in modo predefinito
6. [ ] Nota nel README: usare Edge, non il browser interno dell'app Claude
