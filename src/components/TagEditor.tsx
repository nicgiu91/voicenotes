import { useState } from 'react'
import { db, getSettings } from '../lib/db'
import type { Note } from '../lib/types'
import { chatLLM, llmConfigured } from '../lib/llm/client'
import { prompt, tagPrompt } from '../lib/llm/prompts'
import { useT } from '../lib/i18n'

interface Props {
  note: Note
  onChanged: () => void
}

/** Tag manuali + suggerimenti AI per una nota. */
export default function TagEditor({ note, onChanged }: Props) {
  const { t } = useT()
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
    setSuggested((cur) => cur.filter((x) => x !== clean))
    setDraft('')
  }

  const suggest = async () => {
    setError('')
    setSuggesting(true)
    try {
      const settings = await getSettings()
      if (!llmConfigured(settings.llm)) throw new Error(t('err.llmConfigure'))
      const text = note.transcript?.text ?? ''
      if (!text) throw new Error(t('tags.needTranscript'))
      const answer = await chatLLM(
        prompt(tagPrompt),
        [{ role: 'user', content: text.slice(0, 8000) }],
        settings.llm,
      )
      const tags = answer
        .split(/[,\n]/)
        .map((x) => x.trim().toLowerCase().replace(/^#/, ''))
        .filter((x) => x && x.length <= 30 && !note.tags.includes(x))
        .slice(0, 5)
      if (tags.length === 0) throw new Error(t('tags.noSuggestions'))
      setSuggested(tags)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('err.tagGeneric'))
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        {note.tags.map((tag) => (
          <span key={tag} className="tag-chip">
            #{tag}
            <button
              onClick={() => void saveTags(note.tags.filter((x) => x !== tag))}
              aria-label={t('tags.removeLabel', { tag })}
            >
              ✕
            </button>
          </span>
        ))}
        {note.tags.length === 0 && <span className="muted">{t('tags.none')}</span>}
      </div>
      <div className="row">
        <input
          type="text"
          placeholder={t('tags.new')}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addTag(draft)
          }}
          style={{ flex: 1, maxWidth: 220 }}
        />
        <button className="btn-ghost btn-small" onClick={() => void addTag(draft)} disabled={!draft.trim()}>
          {t('common.add')}
        </button>
        {note.transcript && (
          <button className="btn-ghost btn-small" onClick={() => void suggest()} disabled={suggesting}>
            {suggesting ? t('tags.suggesting') : t('tags.suggest')}
          </button>
        )}
      </div>
      {suggested.length > 0 && (
        <div className="row" style={{ marginTop: 8 }}>
          <span className="muted">{t('tags.suggested')}</span>
          {suggested.map((tag) => (
            <button key={tag} className="btn-ghost btn-small" onClick={() => void addTag(tag)}>
              + #{tag}
            </button>
          ))}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
    </div>
  )
}
