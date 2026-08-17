import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, deleteNoteCompletely } from '../lib/db'
import type { Note } from '../lib/types'
import { assembleAudio, audioExtension } from '../lib/audio/assemble'
import { formatDate, formatDuration, slugify } from '../lib/format'

export default function NoteDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioError, setAudioError] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const reload = async () => {
    const n = await db.notes.get(id)
    setNote(n ?? null)
  }

  useEffect(() => {
    void reload()
    let url = ''
    assembleAudio(id)
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setAudioUrl(url)
      })
      .catch(() => setAudioError('Audio non disponibile per questa nota.'))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!note) return <p className="muted">Nota non trovata.</p>

  const saveTitle = async () => {
    const title = titleDraft.trim()
    if (title) await db.notes.update(note.id, { title })
    setEditingTitle(false)
    await reload()
  }

  const removeNote = async () => {
    if (!confirm(`Eliminare definitivamente "${note.title}"?\nAudio e trascrizione andranno persi.`)) return
    await deleteNoteCompletely(note.id)
    navigate('/')
  }

  const exportAudio = async () => {
    const blob = await assembleAudio(note.id)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slugify(note.title)}.${audioExtension(note.mimeType)}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  const seekTo = (sec: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = sec
    void el.play()
  }
  void seekTo // usato dalla sezione trascrizione (M2)

  return (
    <div>
      {editingTitle ? (
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
          />
          <button className="btn-primary btn-small" onClick={() => void saveTitle()}>
            Salva
          </button>
        </div>
      ) : (
        <h1 onClick={() => (setTitleDraft(note.title), setEditingTitle(true))} title="Tocca per rinominare">
          {note.title}
        </h1>
      )}
      <p className="muted">
        {formatDate(note.createdAt)} · {formatDuration(note.durationSec)}
        {note.status === 'recovered' && ' · recuperata dopo interruzione'}
      </p>

      {audioError && <div className="info-box">{audioError}</div>}
      {audioUrl && <audio ref={audioRef} src={audioUrl} controls preload="metadata" />}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn-ghost btn-small" onClick={() => void exportAudio()}>
          Esporta audio
        </button>
        <span className="spacer" />
        <button className="btn-danger btn-small" onClick={() => void removeNote()}>
          Elimina
        </button>
      </div>
    </div>
  )
}
