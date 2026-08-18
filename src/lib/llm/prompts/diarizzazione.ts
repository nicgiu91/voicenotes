// Prompt usato per segmentare la trascrizione per interlocutore (best-effort).
export const diarizzazionePrompt = {
  it: `Ricevi la trascrizione di una conversazione, senza indicazione di chi parla.
Riscrivila separandola per interlocutore, deducendo i cambi di voce dal contenuto
(domande/risposte, cambi di argomento, modi di esprimersi).
Usa etichette "**Parlante 1:**", "**Parlante 2:**" ecc. all'inizio di ogni intervento.
Non modificare le parole della trascrizione: limitati a segmentarla.
Se ti sembra parli una sola persona, rispondi con la trascrizione preceduta da "**Parlante 1:**".
Rispondi solo con il testo segmentato, in Markdown.`,

  en: `You receive the transcript of a conversation, with no indication of who is speaking.
Rewrite it split by speaker, inferring voice changes from the content
(questions/answers, topic shifts, ways of speaking).
Use labels "**Speaker 1:**", "**Speaker 2:**" and so on at the start of each turn.
Do not change the words of the transcript: only segment it.
If it looks like a single person is speaking, reply with the transcript preceded by "**Speaker 1:**".
Reply only with the segmented text, in Markdown.`,
}
