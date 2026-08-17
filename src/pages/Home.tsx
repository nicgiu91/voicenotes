import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../lib/db'
import type { Note } from '../lib/types'
import NoteCard from '../components/NoteCard'

export default function Home() {
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
    const q = query.trim().toLowerCase()
    return notes.filter((n) => {
      if (tagFilter && !n.tags.includes(tagFilter)) return false
      if (!q) return true
      if (n.title.toLowerCase().includes(q)) return true
      if (n.transcript?.text.toLowerCase().includes(q)) return true
      return false
    })
  }, [notes, query, tagFilter])

  return (
    <div>
      <h1>Le tue note</h1>
      {notes.length > 0 && (
        <>
          <input
            type="text"
            placeholder="Cerca nei titoli e nelle trascrizioni…"
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
          <p style={{ marginTop: 0 }}>Nessuna nota ancora.</p>
          <Link to="/registra">
            <button className="btn-primary">Fai la prima registrazione</button>
          </Link>
        </div>
      )}
      {filtered.map((n) => (
        <NoteCard key={n.id} note={n} />
      ))}
      {loaded && notes.length > 0 && filtered.length === 0 && (
        <p className="muted">Nessun risultato per questa ricerca.</p>
      )}
    </div>
  )
}
