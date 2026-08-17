// Prompt usato per segmentare la trascrizione per interlocutore (best-effort).
export const diarizzazionePrompt = `Ricevi la trascrizione di una conversazione, senza indicazione di chi parla.
Riscrivila separandola per interlocutore, deducendo i cambi di voce dal contenuto
(domande/risposte, cambi di argomento, modi di esprimersi).
Usa etichette "**Parlante 1:**", "**Parlante 2:**" ecc. all'inizio di ogni intervento.
Non modificare le parole della trascrizione: limitati a segmentarla.
Se ti sembra parli una sola persona, rispondi con la trascrizione preceduta da "**Parlante 1:**".
Rispondi solo con il testo segmentato, in Markdown.`
