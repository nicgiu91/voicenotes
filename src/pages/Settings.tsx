import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveLanguage, saveSettings } from '../lib/db'
import type { LocalWhisperSize, SettingsData } from '../lib/types'
import { exportBackup, importBackup } from '../lib/export/backup'
import { LOCAL_MODELS } from '../lib/transcribe/local'
import { isCustomModel, modelsFor } from '../lib/llm/models'
import { useT, type Lang } from '../lib/i18n'

export default function Settings() {
  const { t } = useT()
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

  const models = modelsFor(s.llm.provider)
  const customModel = isCustomModel(s.llm.provider, s.llm.model)

  return (
    <div>
      <h1>{t('settings.title')}</h1>

      <label className="field">
        <span>{t('settings.language')}</span>
        <select
          value={s.lang}
          onChange={(e) => {
            const lang = e.target.value as Lang
            setS({ ...s, lang })
            void saveLanguage(lang) // applicata e salvata subito, senza premere Salva
          }}
        >
          <option value="it">Italiano</option>
          <option value="en">English</option>
        </select>
      </label>

      <h2>{t('settings.transcription')}</h2>
      <label className="field">
        <span>{t('settings.howToTranscribe')}</span>
        <select
          value={s.transcribe.mode}
          onChange={(e) =>
            update({ transcribe: { ...s.transcribe, mode: e.target.value as 'api' | 'local' } })
          }
        >
          <option value="api">{t('settings.modeApi')}</option>
          <option value="local">{t('settings.modeLocal')}</option>
        </select>
      </label>

      {s.transcribe.mode === 'local' ? (
        <>
          <label className="field">
            <span>{t('settings.localModel')}</span>
            <select
              value={s.transcribe.localModel}
              onChange={(e) =>
                update({
                  transcribe: { ...s.transcribe, localModel: e.target.value as LocalWhisperSize },
                })
              }
            >
              {Object.entries(LOCAL_MODELS).map(([key, m]) => (
                <option key={key} value={key}>
                  {t(m.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <div className="info-box">{t('settings.localInfo')}</div>
        </>
      ) : (
        <>
          <p className="muted">{t('settings.apiInfo')}</p>
          <label className="field">
            <span>{t('settings.baseUrl')}</span>
            <input
              type="url"
              value={s.transcribe.baseUrl}
              onChange={(e) => update({ transcribe: { ...s.transcribe, baseUrl: e.target.value.trim() } })}
            />
          </label>
          <label className="field">
            <span>{t('settings.apiKeyOptional')}</span>
            <input
              type="password"
              value={s.transcribe.apiKey}
              autoComplete="off"
              onChange={(e) => update({ transcribe: { ...s.transcribe, apiKey: e.target.value.trim() } })}
            />
          </label>
        </>
      )}
      <div className="row">
        {s.transcribe.mode === 'api' && (
          <label className="field" style={{ flex: 1 }}>
            <span>{t('settings.transcribeModel')}</span>
            <input
              type="text"
              value={s.transcribe.model}
              onChange={(e) => update({ transcribe: { ...s.transcribe, model: e.target.value.trim() } })}
            />
          </label>
        )}
        <label className="field" style={{ width: 180 }}>
          <span>{t('settings.transcribeLang')}</span>
          <select
            value={s.transcribe.language}
            onChange={(e) => update({ transcribe: { ...s.transcribe, language: e.target.value } })}
          >
            <option value="it">{t('settings.langIt')}</option>
            <option value="en">{t('settings.langEn')}</option>
            <option value="">{t('settings.langAuto')}</option>
            <option value="fr">{t('settings.langFr')}</option>
            <option value="de">{t('settings.langDe')}</option>
            <option value="es">{t('settings.langEs')}</option>
          </select>
        </label>
      </div>

      <h2>{t('settings.ai')}</h2>
      <label className="field">
        <span>{t('settings.provider')}</span>
        <select
          value={s.llm.provider}
          onChange={(e) => {
            const provider = e.target.value as SettingsData['llm']['provider']
            const nextModels = modelsFor(provider)
            update({
              llm: {
                ...s.llm,
                provider,
                // il modello di un provider non ha senso sull'altro: si riparte dal consigliato
                model: provider === 'anthropic' ? 'claude-sonnet-5' : nextModels[0].id,
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
          <option value="anthropic">{t('settings.providerAnthropic')}</option>
          <option value="openai">{t('settings.providerOpenai')}</option>
        </select>
      </label>
      <label className="field">
        <span>
          {s.llm.provider === 'anthropic'
            ? t('settings.aiBaseUrlAnthropic')
            : t('settings.aiBaseUrlOpenai')}
        </span>
        <input
          type="url"
          value={s.llm.baseUrl}
          onChange={(e) => update({ llm: { ...s.llm, baseUrl: e.target.value.trim() } })}
        />
      </label>
      <label className="field">
        <span>{t('settings.apiKey')}</span>
        <input
          type="password"
          value={s.llm.apiKey}
          autoComplete="off"
          onChange={(e) => update({ llm: { ...s.llm, apiKey: e.target.value.trim() } })}
        />
      </label>
      <label className="field">
        <span>{t('settings.aiModel')}</span>
        <select
          value={customModel ? '__custom__' : s.llm.model}
          onChange={(e) => {
            const value = e.target.value
            update({ llm: { ...s.llm, model: value === '__custom__' ? '' : value } })
          }}
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {t(m.labelKey)}
            </option>
          ))}
          <option value="__custom__">{t('settings.customModel')}</option>
        </select>
      </label>
      <div className="row">
        {customModel && (
          <label className="field" style={{ flex: 1 }}>
            <span>{t('settings.customModelField')}</span>
            <input
              type="text"
              value={s.llm.model}
              autoFocus
              onChange={(e) => update({ llm: { ...s.llm, model: e.target.value.trim() } })}
            />
          </label>
        )}
        <label className="field" style={{ width: 140 }}>
          <span>{t('settings.maxTokens')}</span>
          <input
            type="number"
            value={s.llm.maxTokens}
            min={256}
            onChange={(e) => update({ llm: { ...s.llm, maxTokens: Number(e.target.value) || 4096 } })}
          />
        </label>
      </div>

      {mixedContentRisk && <div className="info-box">{t('settings.mixedContent')}</div>}

      <div className="row" style={{ marginTop: 16 }}>
        <button className="btn-primary" onClick={() => void save()}>
          {t('settings.saveSettings')}
        </button>
        {saved && <span style={{ color: 'var(--ok)' }}>{t('settings.saved')}</span>}
      </div>

      <h2>{t('settings.backup')}</h2>
      <p className="muted">{t('settings.backupInfo')}</p>
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
                setBackupMsg(t('settings.backupDownloaded'))
              })
              .catch(() => setBackupMsg(t('settings.backupError')))
              .finally(() => setBackupBusy(false))
          }}
        >
          {backupBusy ? t('settings.preparing') : t('settings.exportBackup')}
        </button>
        <button className="btn-ghost" disabled={backupBusy} onClick={() => importRef.current?.click()}>
          {t('settings.importBackup')}
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
              .then((r) => setBackupMsg(t('settings.backupImported', { n: r.note })))
              .catch((err: unknown) =>
                setBackupMsg(err instanceof Error ? err.message : t('settings.backupImportError')),
              )
              .finally(() => setBackupBusy(false))
          }}
        />
        {backupMsg && <span className="muted">{backupMsg}</span>}
      </div>

      <h2>{t('settings.templates')}</h2>
      <p className="muted">{t('settings.templatesInfo')}</p>
      <Link to="/template">
        <button className="btn-ghost">{t('settings.manageTemplates')}</button>
      </Link>

      <p className="muted" style={{ marginTop: 24 }}>
        {t('settings.keysNote')}
      </p>
    </div>
  )
}
