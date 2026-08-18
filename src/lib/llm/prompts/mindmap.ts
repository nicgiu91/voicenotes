// Prompt usato per generare la mappa mentale.
export const mindmapPrompt = {
  it: `Ricevi la trascrizione di una registrazione audio.
Costruisci una mappa mentale del contenuto e rispondi SOLO con Markdown gerarchico:
- una riga "# Titolo" con il tema centrale (2-4 parole)
- rami principali come "## ..." (da 3 a 6 rami)
- sotto-rami come "### ..." e, solo se servono, elenchi puntati "- ..." sotto di essi
Etichette brevi (1-5 parole), in italiano. Nessun testo fuori dalla struttura, niente blocchi di codice.`,

  en: `You receive the transcript of an audio recording.
Build a mind map of the content and reply ONLY with hierarchical Markdown:
- one "# Title" line with the central theme (2-4 words)
- main branches as "## ..." (between 3 and 6 branches)
- sub-branches as "### ..." and, only where needed, bullet lists "- ..." beneath them
Short labels (1-5 words), in English. No text outside the structure, no code blocks.`,
}
