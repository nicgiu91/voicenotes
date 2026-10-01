# Idee e sogni dall'iPhone, con i Comandi Rapidi

Due comandi da costruire una volta sola nell'app **Comandi Rapidi** dell'iPhone:

- **Idea** — detti un'idea; dopo 10-20 secondi l'AI ti risponde con i punti deboli, le cose da
  verificare e un primo passo concreto.
- **Sogno** — parte da solo quando spegni la sveglia, ti ascolta, mette in ordine il sogno e
  ti fa due o tre domande per ricordare di più.

Non serve VoiceNotes aperta: il comando registra, chiede all'AI, ti mostra la risposta e salva
tutto in un file. VoiceNotes serve dopo, per rileggere, cercare e fare domande su più note insieme
(per esempio: "quali luoghi tornano nei miei sogni di questo mese?").

> **Prima di cominciare.** Non ho potuto provare questi passaggi su un iPhone vero. I nomi delle
> azioni possono cambiare leggermente fra una versione di iOS e l'altra: se una voce non si trova
> identica, cerca la più simile nella barra di ricerca delle azioni.

---

## Cosa serve

- La **chiave API di Anthropic** (la stessa delle Impostazioni di VoiceNotes).
- Una **cartella su iCloud Drive** dove salvare i file. Se usi Obsidian: dentro il tuo vault, per
  esempio `Obsidian/Note/Sogni` e `Obsidian/Note/Idee`. Altrimenti `iCloud Drive/VoiceNotes`.
- Il **prompt** da dare all'AI. Lo copi dall'app: VoiceNotes → menu → *Template* →
  *Idea: avvocato del diavolo* (o *Sogno*) → *Vedi prompt* → **Copia il prompt**.

---

## Comando "Idea"

Comandi Rapidi → **+** in alto a destra → chiamalo **Idea**. Poi aggiungi queste azioni, in ordine.

**1. Testo** — incolla la chiave API. Tocca il nome dell'azione e rinominala `Chiave`.

**2. Testo** — incolla il prompt copiato dall'app. Rinominala `Prompt`.

**3. Detta testo**
- Lingua: *Italiano*
- Interrompi ascolto: **Al tocco** (con "dopo una pausa" si ferma mentre stai ancora pensando)

**4. Ottieni contenuti dell'URL**
- URL: `https://api.anthropic.com/v1/messages`
- Tocca la freccia per aprire le opzioni:
  - Metodo: **POST**
  - Intestazioni (tre righe):
    - `x-api-key` → variabile **Chiave**
    - `anthropic-version` → `2023-06-01`
    - `content-type` → `application/json`
  - Corpo della richiesta: **JSON**, con questi campi:
    - `model` (Testo) → `claude-sonnet-5`
    - `max_tokens` (Numero) → `1500`
    - `system` (Testo) → variabile **Prompt**
    - `messages` (**Array**) → un elemento di tipo **Dizionario** con:
      - `role` (Testo) → `user`
      - `content` (Testo) → variabile **Testo dettato**

**5. Ottieni valore del dizionario** — chiave `content`, dal risultato dell'azione 4.

**6. Ottieni elemento dall'elenco** — *Primo elemento*.

**7. Ottieni valore del dizionario** — chiave `text`. Rinominala `Risposta`.

**8. Se** *Risposta* **non ha alcun valore** → dentro il "Se" metti **Mostra risultato** con i
*Contenuti dell'URL* (l'azione 4) e poi **Interrompi comando rapido**. Così, se la chiave è
sbagliata o il credito è finito, vedi il messaggio d'errore invece di una pagina vuota.

**9. Data corrente**, poi **Formatta data** → formato *Personalizzato* → `yyyy-MM-dd HH:mm`.
Rinominala `Data`.

**10. Formatta data** (di nuovo sulla *Data corrente*) → `yyyy-MM-dd HH.mm`. Rinominala
`DataFile`. Serve per il nome del file, che non può contenere i due punti.

**11. Testo** — scrivi esattamente così, inserendo le variabili dove indicato:

```
---
tipo: idea
data: [Data]
---
# Idea [Data]

[Testo dettato]

## Risposta

[Risposta]
```

La prima riga e la quarta sono tre trattini. Le parole `tipo`, `data` e `## Risposta` vanno
lasciate così: VoiceNotes le usa per riconoscere il file (vedi più sotto).

**12. Imposta nome** — sul testo dell'azione 11 → `[DataFile] Idea.md`.

**13. Salva file** — disattiva *Chiedi dove salvare*, scegli la cartella `Idee`. Disattiva
*Sovrascrivi se il file esiste*.

**14. Mostra risultato** → variabile **Risposta**.

### Come farlo partire

- **Siri**: "Ehi Siri, Idea".
- **Tasto Azione** (iPhone 15 Pro e successivi): Impostazioni → Tasto Azione → *Comando rapido* →
  Idea.
- **Tocco sul retro**: Impostazioni → Accessibilità → Tocco → Tocco sul retro → Doppio tocco →
  Idea.
- **Widget** sulla schermata di blocco o sulla Home.

---

## Comando "Sogno"

Duplica il comando *Idea* (tieni premuto → *Duplica*) e rinominalo **Sogno**. Poi cambia:

- **Azione 2**: il prompt del template *Sogno*.
- **Prima dell'azione 3** aggiungi **Pronuncia testo** → `Cosa hai sognato?`. Ti avvisa che
  sta ascoltando quando hai ancora gli occhi chiusi.
- **Azione 11**: `tipo: sogno` e `# Sogno [Data]`.
- **Azione 12**: `[DataFile] Sogno.md`.
- **Azione 13**: la cartella `Sogni`.

### Farlo partire da solo con la sveglia

Comandi Rapidi → scheda **Automazione** → **+** → **Sveglia** → *Viene interrotta* → scegli la
sveglia del mattino → **Esegui immediatamente** → azione **Esegui comando rapido** → *Sogno*.

Se il telefono è bloccato potrebbe chiederti Face ID prima di ascoltare: è normale.

---

## Portare i file in VoiceNotes

VoiceNotes → **Registra** → *Importa un testo già trascritto* → **Carica da file** → seleziona
**tutti** i file della cartella (anche quelli già importati).

L'app:
- usa la **data** scritta nel file, non quella dell'importazione;
- mette l'etichetta **sogno** o **idea**;
- mette la risposta dell'AI tra i **riepiloghi**, senza pagarla una seconda volta;
- **salta** i file già importati: puoi reimportare tutta la cartella ogni settimana senza
  creare doppioni.

Poi, in **Chiedi**, il pulsante **Tutte "sogno"** seleziona tutti i sogni in un tocco. Lì le
domande che valgono di più sono quelle sul tempo: *"quali persone tornano più spesso?"*,
*"in quali sogni compare l'acqua?"*. Con molte note l'app accorcia ciascuna per stare nei limiti:
con qualche decina di sogni brevi non te ne accorgi, con centinaia sì.

---

## Costi

Un'idea o un sogno di due minuti costano **meno di un centesimo**: la dettatura dell'iPhone è
gratuita, si paga solo la risposta dell'AI.

## Due avvertenze

**La chiave è dentro il comando.** Il comando si sincronizza su iCloud insieme agli altri, e
fin qui va bene. Ma **se condividi il comando con qualcuno, la chiave parte insieme a lui**.
Prima di condividerlo, svuota l'azione 1.

**La dettatura dell'iPhone sbaglia di più quando parli mezzo addormentato.** I prompt sono
scritti per tollerarlo (il sogno usa `[non chiaro]` invece di indovinare), ma se i sogni escono
troppo storpiati si può passare a Whisper di OpenAI: costa circa un centesimo in più a sogno ed è
più preciso sulle frasi spezzate. Chiedimelo e aggiungo qui i passaggi.
