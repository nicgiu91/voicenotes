import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import type { Note } from '../lib/types'
import NoteCard from '../components/NoteCard'
import { searchNotes } from '../lib/search'
import { useT } from '../lib/i18n'

export default function Home() {
  const { t } = useT()
  const [notes, setNotes] = useState<Note[]>([])
  const [query, setQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void db.notes
      .orderBy('createdAt')
      .reverse()
      .toArray()
      .then((n) => {
        setNotes(n)
        setLoaded(true)
      })
  }, [])

  const allTags = useMemo(() => {
    const s = new Set<string>()
    for (const n of notes) for (const t of n.tags) s.add(t)
    return [...s].sort()
  }, [notes])

  const filtered = useMemo(() => {
    const byTag = tagFilter ? notes.filter((n) => n.tags.includes(tagFilter)) : notes
    return searchNotes(byTag, query)
  }, [notes, query, tagFilter])

  const searching = query.trim().length > 0

  return (
    <div>
      <h1>{t('home.title')}</h1>
      {notes.length > 0 && (
        <>
          <input
            type="text"
            placeholder={t('home.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {allTags.length > 0 && (
            <div className="row" style={{ margin: '10px 0' }}>
              {allTags.map((t) => (
                <button
                  key={t}
                  className={`btn-small ${tagFilter === t ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
          <div style={{ height: 10 }} />
        </>
      )}
      {loaded && notes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 28 }}>
          <p style={{ marginTop: 0 }}>{t('home.empty')}</p>
          <Link to="/registra">
            <button className="btn-primary">{t('home.firstRecording')}</button>
          </Link>
        </div>
      )}
      {searching && (
        <p className="muted">
          {filtered.length === 0
            ? t('home.noResults')
            : filtered.length === 1
              ? t('home.resultsOne')
              : t('home.results', { n: String(filtered.length) })}
        </p>
      )}
      {filtered.map((m) => (
        <NoteCard key={m.note.id} note={m.note} snippet={searching ? m.snippet : undefined} />
      ))}
      {loaded && notes.length > 0 && filtered.length === 0 && (
        <p className="muted">{t('home.noResults')}</p>
      )}
    </div>
  )
}
