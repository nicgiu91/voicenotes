import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChunkedRecorder, importAudioFile, pickMimeType } from '../lib/audio/recorder'
import { LiveTranscriber } from '../lib/transcribe/live'
import { db, getSettings } from '../lib/db'
import { formatDuration } from '../lib/format'
import LevelMeter from '../components/LevelMeter'
import { useT } from '../lib/i18n'

// Il registratore vive fuori dal componente: cambiare pagina non ferma la
// registrazione e tornando su "Registra" si ritrova il controllo.
let activeRecorder: ChunkedRecorder | null = null
// anche la trascrizione in diretta sopravvive al cambio di pagina
let activeLive: LiveTranscriber | null = null

export default function Record() {
  const { t } = useT()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [recording, setRecording] = useState(activeRecorder?.isRecording ?? false)
  const [elapsed, setElapsed] = useState(0)
  const [level, setLevel] = useState(0)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [liveWanted, setLiveWanted] = useState(false)
  const [liveAvailable, setLiveAvailable] = useState(false)
  const [liveText, setLiveText] = useState(activeLive?.text ?? '')
  const [liveWorking, setLiveWorking] = useState(false)
  const [liveError, setLiveError] = useState('')

  // la diretta ha senso solo con un servizio online: Whisper sul dispositivo
  // impiegherebbe piu' tempo dell'audio stesso
  useEffect(() => {
    void getSettings().then((s) => setLiveAvailable(s.transcribe.mode === 'api'))
  }, [])

  useEffect(() => {
    activeLive?.setOnUpdate((u) => {
      setLiveText(u.text)
      setLiveWorking(u.working)
      setLiveError(u.error ?? '')
    })
  }, [])

  const start = async () => {
    setError('')
    try {
      const rec = new ChunkedRecorder({
        onTick: setElapsed,
        onLevel: setLevel,
        onError: setError,
      })
      const noteId = await rec.start()
      activeRecorder = rec
      if (liveWanted && liveAvailable) {
        const s = await getSettings()
        const live = new LiveTranscriber(noteId, s.transcribe, (u) => {
          setLiveText(u.text)
          setLiveWorking(u.working)
          setLiveError(u.error ?? '')
        })
        live.start()
        activeLive = live
      }
      setLiveText('')
      setLiveError('')
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
      if (activeLive) {
        const live = activeLive
        activeLive = null
        const result = await live.stop()
        // quanto trascritto in diretta diventa la trascrizione della nota:
        // niente secondo passaggio, niente doppia spesa
        if (result.text) {
          await db.notes.update(noteId, {
            transcript: { ...result, createdAt: Date.now() },
          })
        }
      }
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
      {!recording && (
        <label className="live-toggle">
          <input
            type="checkbox"
            checked={liveWanted && liveAvailable}
            disabled={!liveAvailable}
            onChange={(e) => setLiveWanted(e.target.checked)}
          />
          <span>{t('record.live')}</span>
        </label>
      )}
      {!recording && (
        <p className="muted">{liveAvailable ? t('record.liveHint') : t('record.liveLocal')}</p>
      )}
      {recording && activeLive && (
        <div className="card live-box">
          <div className="row">
            <strong>{t('record.liveTitle')}</strong>
            <span className="spacer" />
            {liveWorking && <span className="spin" />}
          </div>
          <p className={liveText ? '' : 'muted'}>{liveText || t('record.liveWaiting')}</p>
          {liveError && <p className="muted">{liveError}</p>}
        </div>
      )}
      {error && <div className="error-box">{error}</div>}
      {!recording && (
        <>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            {t('record.import')}
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => void onImport(e)} />
          <Link to="/importa-testo">
            <button className="btn-ghost">{t('record.importText')}</button>
          </Link>
          <p className="muted">
            {t('record.format', { format: format || t('record.formatDefault') })}
          </p>
        </>
      )}
    </div>
  )
}
