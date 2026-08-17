import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, getSettings } from '../lib/db'
import type { ChatThread, Note } from '../lib/types'
import { chatLLM, llmConfigured, type LlmMessage } from '../lib/llm/client'
import { askSystemPrompt, buildContext } from '../lib/llm/context'
import Markdown from '../components/Markdown'

function threadKey(noteIds: string[]): string {
  return [...noteIds].sort().join('|')
}

export default function Ask() {
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [thread, setThread] = useState<ChatThread | null>(null)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void db.notes
      .orderBy('createdAt')
      .reverse()
      .toArray()
      .then((all) => setNotes(all.filter((n) => n.transcript?.text)))
  }, [])

  // carica (o azzera) la conversazione quando cambia la selezione
  useEffect(() => {
    if (selected.length === 0) {
      setThread(null)
      return
    }
    const key = threadKey(selected)
    void db.chats
      .toArray()
      .then((all) => setThread(all.find((t) => threadKey(t.noteIds) === key) ?? null))
  }, [selected])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread?.messages.length])

  const selectedNotes = useMemo(() => notes.filter((n) => selected.includes(n.id)), [notes, selected])

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const send = async () => {
    const question = input.trim()
    if (!question || selectedNotes.length === 0) return
    setError('')
    setBusy(true)
    setInput('')

    const current: ChatThread = thread ?? {
      id: crypto.randomUUID(),
      noteIds: [...selected],
      title: selectedNotes.map((n) => n.title).join(', ').slice(0, 80),
      messages: [],
      updatedAt: Date.now(),
    }
    const withQuestion: ChatThread = {
      ...current,
      messages: [...current.messages, { role: 'user' as const, content: question, at: Date.now() }],
      updatedAt: Date.now(),
    }
    setThread(withQuestion)
    await db.chats.put(withQuestion)

    try {
      const settings = await getSettings()
      if (!llmConfigured(settings.llm)) {
        throw new Error('Configura prima il provider AI nelle Impostazioni.')
      }
      const context = buildContext(
        selectedNotes.map((n) => ({ title: n.title, text: n.transcript?.text ?? '' })),
      )
      const system = `${askSystemPrompt}\n\n${context}`
      // manda solo gli ultimi scambi per non gonfiare il contesto
      const history: LlmMessage[] = withQuestion.messages
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }))
      const answer = await chatLLM(system, history, settings.llm)
      const done: ChatThread = {
        ...withQuestion,
        messages: [...withQuestion.messages, { role: 'assistant' as const, content: answer, at: Date.now() }],
        updatedAt: Date.now(),
      }
      setThread(done)
      await db.chats.put(done)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nella richiesta')
    } finally {
      setBusy(false)
    }
  }

  const clearChat = async () => {
    if (!thread) return
    if (!confirm('Cancellare questa conversazione?')) return
    await db.chats.delete(thread.id)
    setThread(null)
  }

  if (notes.length === 0) {
    return (
      <div>
        <h1>Ask</h1>
        <p className="muted">
          Qui potrai fare domande sulle tue note, ma prima serve almeno una nota trascritta.
        </p>
        <Link to="/">
          <button className="btn-ghost">Vai alle note</button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1>Ask</h1>
      <p className="muted">Scegli le note su cui vuoi fare domande:</p>
      <div className="row" style={{ marginBottom: 14 }}>
        {notes.map((n) => (
          <button
            key={n.id}
            className={`btn-small ${selected.includes(n.id) ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => toggle(n.id)}
          >
            {n.title.length > 34 ? `${n.title.slice(0, 34)}…` : n.title}
          </button>
        ))}
      </div>

      {selected.length > 0 && (
        <>
          <div className="chat-list">
            {(thread?.messages ?? []).map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'assistant' ? <Markdown text={m.content} /> : m.content}
              </div>
            ))}
            {busy && (
              <div className="chat-msg assistant">
                <span className="spin" />
                Sto pensando…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          {error && <div className="error-box">{error}</div>}
          <div className="row">
            <input
              type="text"
              placeholder="Fai una domanda sulle note selezionate…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send()
              }}
              style={{ flex: 1 }}
              disabled={busy}
            />
            <button className="btn-primary" onClick={() => void send()} disabled={busy || !input.trim()}>
              Invia
            </button>
          </div>
          {thread && thread.messages.length > 0 && (
            <button className="btn-ghost btn-small" style={{ marginTop: 10 }} onClick={() => void clearChat()}>
              Cancella conversazione
            </button>
          )}
        </>
      )}
    </div>
  )
}
