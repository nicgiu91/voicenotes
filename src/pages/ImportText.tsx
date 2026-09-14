import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { importTranscriptText, titleFromText } from '../lib/import/text'
import { useT } from '../lib/i18n'

/**
 * Nota creata da un testo già trascritto: chi ha la trascrizione gratuita del
 * telefono la incolla qui e usa l'app solo per riepiloghi, mappe e domande.
 */
export default function ImportText() {
  const { t } = useT()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const words = text.trim() ? text.trim().split(/\s+/).length : 0

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const content = await file.text()
      setText(content)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    } catch {
      setError(t('importText.fileError'))
    }
  }

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const noteId = await importTranscriptText(text, title)
      navigate(`/nota/${noteId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : t('importText.error'))
      setBusy(false)
    }
  }

  return (
    <div>
      <h1>{t('importText.title')}</h1>
      <p className="muted">{t('importText.intro')}</p>

      <label className="field">
        <span>{t('importText.noteTitle')}</span>
        <input
          type="text"
          value={title}
          placeholder={titleFromText(text) || t('importText.titlePlaceholder')}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>

      <label className="field">
        <span>{t('importText.text')}</span>
        <textarea
          rows={12}
          value={text}
          placeholder={t('importText.textPlaceholder')}
          onChange={(e) => setText(e.target.value)}
        />
      </label>

      <div className="row">
        <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
          {t('importText.fromFile')}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          hidden
          onChange={(e) => void onFile(e)}
        />
        <span className="spacer" />
        {words > 0 && <span className="muted">{t('importText.words', { n: String(words) })}</span>}
      </div>

      {error && <div className="error-box">{error}</div>}

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 14 }}
        disabled={busy || !text.trim()}
        onClick={() => void create()}
      >
        {busy ? t('importText.creating') : t('importText.create')}
      </button>

      <p className="muted" style={{ marginTop: 18 }}>
        {t('importText.hint')}
      </p>
    </div>
  )
}
