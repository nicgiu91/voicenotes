import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveSettings } from '../lib/db'
import type { SettingsData } from '../lib/types'
import { exportBackup, importBackup } from '../lib/export/backup'

export default function Settings() {
  const [s, setS] = useState<SettingsData | null>(null)
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getSettings().then(setS)
  }, [])

  if (!s) return null

  const update = (patch: Partial<SettingsData>) => {
    setS({ ...s, ...patch })
    setSaved(false)
  }

  const save = async () => {
    await saveSettings(s)
    setSaved(true)
  }

  const mixedContentRisk =
    location.protocol === 'https:' &&
    (s.transcribe.baseUrl.startsWith('http://') || s.llm.baseUrl.startsWith('http://'))

  return (
    <div>
      <h1>Impostazioni</h1>

      <h2>Trascrizione (API OpenAI-compatible)</h2>
      <p className="muted">
        Funziona con OpenAI, Groq o un server whisper sulla tua rete (es. whisper.cpp sul PC).
      </p>
      <label className="field">
        <span>URL base (es. https://api.openai.com/v1 oppure http://192.168.1.10:8080/v1)</span>
        <input
          type="url"
          value={s.transcribe.baseUrl}
          onChange={(e) => update({ transcribe: { ...s.transcribe, baseUrl: e.target.value.trim() } })}
        />
      </label>
      <label className="field">
        <span>API key (lascia vuoto se il server locale non la richiede)</span>
        <input
          type="password"
          value={s.transcribe.apiKey}
          autoComplete="off"
          onChange={(e) => update({ transcribe: { ...s.transcribe, apiKey: e.target.value.trim() } })}
        />
      </label>
      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>Modello (es. whisper-1, whisper-large-v3)</span>
          <input
            type="text"
            value={s.transcribe.model}
            onChange={(e) => update({ transcribe: { ...s.transcribe, model: e.target.value.trim() } })}
          />
        </label>
        <label className="field" style={{ width: 140 }}>
          <span>Lingua</span>
          <select
            value={s.transcribe.language}
            onChange={(e) => update({ transcribe: { ...s.transcribe, language: e.target.value } })}
          >
            <option value="it">Italiano</option>
            <option value="">Auto</option>
            <option value="en">Inglese</option>
            <option value="fr">Francese</option>
            <option value="de">Tedesco</option>
            <option value="es">Spagnolo</option>
          </select>
        </label>
      </div>

      <h2>Intelligenza artificiale (riepiloghi, titoli, mappe, Ask)</h2>
      <label className="field">
        <span>Provider</span>
        <select
          value={s.llm.provider}
          onChange={(e) => {
            const provider = e.target.value as SettingsData['llm']['provider']
            update({
              llm: {
                ...s.llm,
                provider,
                baseUrl:
                  provider === 'anthropic'
                    ? 'https://api.anthropic.com'
                    : s.llm.baseUrl === 'https://api.anthropic.com'
                      ? 'http://localhost:11434/v1'
                      : s.llm.baseUrl,
              },
            })
          }}
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="openai">OpenAI-compatible (LM Studio, Ollama, OpenAI…)</option>
        </select>
      </label>
      <label className="field">
        <span>
          URL base{' '}
          {s.llm.provider === 'anthropic'
            ? '(https://api.anthropic.com)'
            : '(es. http://localhost:11434/v1 per Ollama sul PC)'}
        </span>
        <input
          type="url"
          value={s.llm.baseUrl}
          onChange={(e) => update({ llm: { ...s.llm, baseUrl: e.target.value.trim() } })}
        />
      </label>
      <label className="field">
        <span>API key</span>
        <input
          type="password"
          value={s.llm.apiKey}
          autoComplete="off"
          onChange={(e) => update({ llm: { ...s.llm, apiKey: e.target.value.trim() } })}
        />
      </label>
      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>Modello (es. claude-sonnet-5, llama3.1)</span>
          <input
            type="text"
            value={s.llm.model}
            onChange={(e) => update({ llm: { ...s.llm, model: e.target.value.trim() } })}
          />
        </label>
        <label className="field" style={{ width: 120 }}>
          <span>Max token</span>
          <input
            type="number"
            value={s.llm.maxTokens}
            min={256}
            onChange={(e) => update({ llm: { ...s.llm, maxTokens: Number(e.target.value) || 4096 } })}
          />
        </label>
      </div>

      {mixedContentRisk && (
        <div className="info-box">
          Attenzione: stai usando l'app in HTTPS con un endpoint http:// — il browser bloccherà la
          richiesta ("mixed content"). Soluzioni: esponi il server locale in HTTPS, oppure apri
          l'app in HTTP dal PC. I dettagli sono nel README del progetto.
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn-primary" onClick={() => void save()}>
          Salva impostazioni
        </button>
        {saved && <span style={{ color: 'var(--ok)' }}>Salvate ✓</span>}
      </div>

      <h2>Backup</h2>
      <p className="muted">
        Il backup contiene note, audio, template e conversazioni in un unico file. Le chiavi API
        non sono incluse: dopo un ripristino vanno reinserite qui.
      </p>
      <div className="row">
        <button
          className="btn-ghost"
          disabled={backupBusy}
          onClick={() => {
            setBackupBusy(true)
            setBackupMsg('')
            void exportBackup()
              .then((blob) => {
                const a = document.createElement('a')
                a.href = URL.createObjectURL(blob)
                const d = new Date()
                a.download = `voicenotes-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`
                a.click()
                setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
                setBackupMsg('Backup scaricato.')
              })
              .catch(() => setBackupMsg('Errore durante il backup.'))
              .finally(() => setBackupBusy(false))
          }}
        >
          {backupBusy ? 'Preparazione…' : 'Esporta backup'}
        </button>
        <button className="btn-ghost" disabled={backupBusy} onClick={() => importRef.current?.click()}>
          Importa backup
        </button>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBackupBusy(true)
            setBackupMsg('')
            void importBackup(file)
              .then((r) => setBackupMsg(`Importate ${r.note} note.`))
              .catch((err: unknown) =>
                setBackupMsg(err instanceof Error ? err.message : 'Errore durante l\'importazione.'),
              )
              .finally(() => setBackupBusy(false))
          }}
        />
        {backupMsg && <span className="muted">{backupMsg}</span>}
      </div>

      <h2>Template di riepilogo</h2>
      <p className="muted">Crea o modifica i template usati per i riepiloghi.</p>
      <Link to="/template">
        <button className="btn-ghost">Gestisci template</button>
      </Link>

      <p className="muted" style={{ marginTop: 24 }}>
        Le chiavi API restano salvate solo su questo dispositivo e non vengono mai inviate altrove:
        il browser chiama direttamente i provider che configuri qui.
      </p>
    </div>
  )
}
