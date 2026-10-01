import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { importParsed, parseImportedText, titleFromText } from '../lib/import/text'
import { useT } from '../lib/i18n'

/**
 * Nota creata da un testo già trascritto: chi ha la trascrizione gratuita del
 * telefono la incolla qui e usa l'app solo per riepiloghi, mappe e domande.
 * Accetta anche più file insieme, come quelli salvati dai Comandi Rapidi.
 */
export default function ImportText() {
  const { t } = useT()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  // nome e data del file caricato: servono a ricavare la data della nota
  const [fileMeta, setFileMeta] = useState<{ name: string; lastModified: number } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [batch, setBatch] = useState<{ created: number; skipped: number; failed: string[] } | null>(null)

  const parsed = parseImportedText(text, fileMeta?.name, fileMeta?.lastModified)
  const words = parsed.text ? parsed.text.split(/\s+/).length : 0

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    setError('')
    setBatch(null)

    // un file solo: si mostra, così si può controllare prima di creare la nota
    if (files.length === 1) {
      const file = files[0]
      try {
        setText(await file.text())
        setFileMeta({ name: file.name, lastModified: file.lastModified })
      } catch {
        setError(t('importText.fileError'))
      }
      return
    }

    // più file: si importano tutti, in ordine di data, saltando i già presenti
    setBusy(true)
    let created = 0
    let skipped = 0
    const failed: string[] = []
    for (const file of files) {
      try {
        const p = parseImportedText(await file.text(), file.name, file.lastModified)
        const res = await importParsed({
          ...p,
          title: p.title ?? (titleFromText(p.text) || file.name.replace(/\.[^.]+$/, '')),
        })
        if (res.duplicate) skipped++
        else created++
      } catch {
        failed.push(file.name)
      }
    }
    setBatch({ created, skipped, failed })
    setBusy(false)
  }

  const create = async () => {
    setBusy(true)
    setError('')
    try {
      const fallbackTitle = fileMeta ? fileMeta.name.replace(/\.[^.]+$/, '') : ''
      const res = await importParsed(
        { ...parsed, title: parsed.title ?? (titleFromText(parsed.text) || fallbackTitle || undefined) },
        title,
      )
      navigate(`/nota/${res.id}`)
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
          placeholder={
            parsed.title ||
            titleFromText(parsed.text) ||
            fileMeta?.name.replace(/\.[^.]+$/, '') ||
            t('importText.titlePlaceholder')
          }
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
          multiple
          hidden
          onChange={(e) => void onFiles(e)}
        />
        <span className="spacer" />
        {words > 0 && <span className="muted">{t('importText.words', { n: String(words) })}</span>}
      </div>

      {(parsed.tags.length > 0 || parsed.reply) && (
        <div className="info-box">
          {parsed.tags.length > 0 && t('importText.detectedTag', { tag: parsed.tags.join(', ') })}
          {parsed.reply && ` ${t('importText.detectedReply')}`}
        </div>
      )}

      {batch && (
        <div className="info-box">
          {t('importText.batchDone', { created: String(batch.created), skipped: String(batch.skipped) })}
          {batch.failed.length > 0 && ` ${t('importText.batchFailed', { files: batch.failed.join(', ') })}`}{' '}
          <Link to="/">{t('importText.goToNotes')}</Link>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      <button
        className="btn-primary"
        style={{ width: '100%', marginTop: 14 }}
        disabled={busy || !parsed.text}
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
