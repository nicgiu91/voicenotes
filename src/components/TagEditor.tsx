import { useState } from 'react'
import { db, getSettings } from '../lib/db'
import type { Note } from '../lib/types'
import { chatLLM, llmConfigured } from '../lib/llm/client'
import { tagPrompt } from '../lib/llm/prompts'

interface Props {
  note: Note
  onChanged: () => void
}

/** Tag manuali + suggerimenti AI per una nota. */
export default function TagEditor({ note, onChanged }: Props) {
  const [draft, setDraft] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const [suggested, setSuggested] = useState<string[]>([])
  const [error, setError] = useState('')

  const saveTags = async (tags: string[]) => {
    await db.notes.update(note.id, { tags: [...new Set(tags)].filter(Boolean) })
    onChanged()
  }

  const addTag = async (tag: string) => {
    const clean = tag.trim().toLowerCase().replace(/^#/, '')
    if (!clean) return
    await saveTags([...note.tags, clean])
    setSuggested((cur) => cur.filter((t) => t !== clean))
    setDraft('')
  }

  const suggest = async () => {
    setError('')
    setSuggesting(true)
    try {
      const settings = await getSettings()
      if (!llmConfigured(settings.llm)) throw new Error('Configura prima il provider AI nelle Impostazioni.')
      const text = note.transcript?.text ?? ''
      if (!text) throw new Error('Serve prima la trascrizione.')
      const answer = await chatLLM(tagPrompt, [{ role: 'user', content: text.slice(0, 8000) }], settings.llm)
      const tags = answer
        .split(/[,\n]/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter((t) => t && t.length <= 30 && !note.tags.includes(t))
        .slice(0, 5)
      if (tags.length === 0) throw new Error('Nessun tag suggerito.')
      setSuggested(tags)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore nel suggerimento tag')
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {note.tags.map((t) => (
          <span key={t} className="tag-chip">
            #{t}
            <button
              onClick={() => void saveTags(note.tags.filter((x) => x !== t))}
              aria-label={`Rimuovi tag ${t}`}
            >
              ✕
            </button>
          </span>
        ))}
        {note.tags.length === 0 && <span className="muted">Nessun tag.</span>}
      </div>
      <div className="row">
        <input
          type="text"
          placeholder="Nuovo tag…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addTag(draft)
          }}
          style={{ flex: 1, maxWidth: 220 }}
        />
        <button className="btn-ghost btn-small" onClick={() => void addTag(draft)} disabled={!draft.trim()}>
          Aggiungi
        </button>
        {note.transcript && (
          <button className="btn-ghost btn-small" onClick={() => void suggest()} disabled={suggesting}>
            {suggesting ? 'Suggerimento…' : 'Suggerisci con AI'}
          </button>
        )}
      </div>
      {suggested.length > 0 && (
        <div className="row" style={{ marginTop: 8 }}>
          <span className="muted">Suggeriti:</span>
          {suggested.map((t) => (
            <button key={t} className="btn-ghost btn-small" onClick={() => void addTag(t)}>
              + #{t}
            </button>
          ))}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
