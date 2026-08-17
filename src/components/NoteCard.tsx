import { Link } from 'react-router-dom'
import type { Note } from '../lib/types'
import { formatDate, formatDuration } from '../lib/format'

export default function NoteCard({ note }: { note: Note }) {
  return (
    <Link to={`/nota/${note.id}`} className="card note-card">
      <div className="note-title">{note.title}</div>
      <div className="note-meta">
        <span>{formatDate(note.createdAt)}</span>
        <span>{formatDuration(note.durationSec)}</span>
        {note.status === 'recovered' && <span className="badge warn">recuperata</span>}
        {note.transcript && <span className="badge accent">trascritta</span>}
        {note.tags.map((t) => (
          <span key={t} className="badge">
            #{t}
          </span>
        ))}
      </div>
    </Link>
  )
}
