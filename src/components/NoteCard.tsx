import { Link } from 'react-router-dom'
import type { Note } from '../lib/types'
import type { Snippet } from '../lib/search'
import { formatDate, formatDuration } from '../lib/format'
import { useT } from '../lib/i18n'

export default function NoteCard({ note, snippet }: { note: Note; snippet?: Snippet }) {
  const { t } = useT()
  return (
    <Link to={`/nota/${note.id}`} className="card note-card">
      <div className="note-title">{note.title}</div>
      <div className="note-meta">
        <span>{formatDate(note.createdAt)}</span>
        {note.source === 'text' ? (
          <span className="badge">{t('home.badgeText')}</span>
        ) : (
          <span>{formatDuration(note.durationSec)}</span>
        )}
        {note.status === 'recovered' && <span className="badge warn">{t('home.badgeRecovered')}</span>}
        {note.transcript && <span className="badge accent">{t('home.badgeTranscribed')}</span>}
        {note.tags.map((tag) => (
          <span key={tag} className="badge">
            #{tag}
          </span>
        ))}
      </div>
      {snippet && (
        <div className="note-snippet">
          {snippet.before}
          <mark>{snippet.match}</mark>
          {snippet.after}
        </div>
      )}
    </Link>
  )
}
