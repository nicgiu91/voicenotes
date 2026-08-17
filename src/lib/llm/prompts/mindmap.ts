// Prompt usato per generare la mappa mentale.
export const mindmapPrompt = `Ricevi la trascrizione di una registrazione audio.
Costruisci una mappa mentale del contenuto e rispondi SOLO con Markdown gerarchico:
- una riga "# Titolo" con il tema centrale (2-4 parole)
- rami principali come "## ..." (da 3 a 6 rami)
- sotto-rami come "### ..." e, solo se servono, elenchi puntati "- ..." sotto di essi
Etichette brevi (1-5 parole), in italiano. Nessun testo fuori dalla struttura, niente blocchi di codice.`
