import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChunkedRecorder, importAudioFile, pickMimeType } from '../lib/audio/recorder'
import { formatDuration } from '../lib/format'
import LevelMeter from '../components/LevelMeter'
import { useT } from '../lib/i18n'

// Il registratore vive fuori dal componente: cambiare pagina non ferma la
// registrazione e tornando su "Registra" si ritrova il controllo.
let activeRecorder: ChunkedRecorder | null = null

export default function Record() {
  const { t } = useT()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(activeRecorder?.isRecording ?? false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setError('')
    try {
      const rec = new ChunkedRecorder({
        onTick: setElapsed,
        onLevel: setLevel,
        onError: setError,
      })
      await rec.start()
      activeRecorder = rec
      setElapsed(0)
      setRecording(true)
    } catch (e) {
      const needsHttps = location.protocol === 'http:' && location.hostname !== 'localhost'
      setError(needsHttps ? t('record.micErrorHttps') : t('record.micError'))
      console.warn(e)
    }
  }

  const stop = async () => {
    if (!activeRecorder) return
    setBusy(true)
    try {
      const noteId = await activeRecorder.stop()
      activeRecorder = null
      setRecording(false)
      navigate(`/nota/${noteId}`)
    } catch {
      setError(t('record.stopError'))
    } finally {
      setBusy(false)
    }
  }

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const noteId = await importAudioFile(file)
      navigate(`/nota/${noteId}`)
    } catch {
      setError(t('record.importError'))
    } finally {
      setBusy(false)
    }
  }

  // riattacca i callback se si torna sulla pagina a registrazione in corso
  if (activeRecorder && recording) {
    activeRecorder.setCallbacks({ onTick: setElapsed, onLevel: setLevel, onError: setError })
  }

  const format = pickMimeType()

  return (
    <div className="rec-page">
      <h1 style={{ margin: 0 }}>{recording ? t('record.recording') : t('record.title')}</h1>
      <div className="rec-timer">{formatDuration(elapsed)}</div>
      <LevelMeter level={recording ? level : 0} />
      <button
        className={`rec-button ${recording ? 'recording' : ''}`}
        onClick={() => void (recording ? stop() : start())}
        disabled={busy}
        aria-label={recording ? t('record.stop') : t('record.start')}
      >
        <span className="rec-icon" />
      </button>
      <p className="rec-hint">{recording ? t('record.hintRecording') : t('record.hintIdle')}</p>
      {error && <div className="error-box">{error}</div>}
      {!recording && (
        <>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            {t('record.import')}
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => void onImport(e)} />
          <p className="muted">
            {t('record.format', { format: format || t('record.formatDefault') })}
          </p>
        </>
      )}
    </div>
  )
}
