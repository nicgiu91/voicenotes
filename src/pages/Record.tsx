import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChunkedRecorder, importAudioFile, pickMimeType } from '../lib/audio/recorder'
import { formatDuration } from '../lib/format'
import LevelMeter from '../components/LevelMeter'

// Il registratore vive fuori dal componente: cambiare pagina non ferma la
// registrazione e tornando su "Registra" si ritrova il controllo.
let activeRecorder: ChunkedRecorder | null = null

export default function Record() {
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
      setError(
        'Microfono non disponibile. Controlla i permessi del browser' +
          (location.protocol === 'http:' && location.hostname !== 'localhost'
            ? ' (su rete locale serve HTTPS per usare il microfono)'
            : '') +
          '.',
      )
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
      setError('Errore nel completamento della registrazione')
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
      setError('Importazione non riuscita')
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
      <h1 style={{ margin: 0 }}>{recording ? 'Sto registrando…' : 'Registra'}</h1>
      <div className="rec-timer">{formatDuration(elapsed)}</div>
      <LevelMeter level={recording ? level : 0} />
      <button
        className={`rec-button ${recording ? 'recording' : ''}`}
        onClick={() => void (recording ? stop() : start())}
        disabled={busy}
        aria-label={recording ? 'Ferma la registrazione' : 'Avvia la registrazione'}
      >
        <span className="rec-icon" />
      </button>
      <p className="rec-hint">
        {recording
          ? 'La registrazione viene salvata ogni 30 secondi: anche in caso di crash non perdi nulla.'
          : 'Tocca per iniziare. Tieni lo schermo acceso durante la registrazione: l’app prova a impedire il blocco, ma su iPhone conviene non bloccare lo schermo.'}
      </p>
      {error && <div className="error-box">{error}</div>}
      {!recording && (
        <>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={busy}>
            Importa file audio
          </button>
          <input ref={fileRef} type="file" accept="audio/*" hidden onChange={(e) => void onImport(e)} />
          <p className="muted">Formato registrazione: {format || 'predefinito del browser'}</p>
        </>
      )}
    </div>
  )
}
