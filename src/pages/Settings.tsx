import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveLanguage, saveSettings } from '../lib/db'
import type { LlmProvider, LocalWhisperSize, SettingsData, TranscribeProvider } from '../lib/types'
import { exportBackup, importBackup } from '../lib/export/backup'
import { LOCAL_MODELS } from '../lib/transcribe/local'
import {
  LLM_PROVIDERS,
  TRANSCRIBE_PROVIDERS,
  defaultModelFor,
  fetchModels,
  isCustomModel,
  llmProvider,
  modelLabel,
  nextBaseUrl,
  transcribeProvider,
  type ModelOption,
  type ProviderInfo,
} from '../lib/providers'
import { useT, type Lang } from '../lib/i18n'

export default function Settings() {
  const { t } = useT()
  const [s, setS] = useState<SettingsData | null>(null)
  const [saved, setSaved] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupBusy, setBackupBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  // modelli letti dal servizio con "Aggiorna elenco": sostituiscono quelli proposti
  const [llmModels, setLlmModels] = useState<ModelOption[] | null>(null)
  const [trModels, setTrModels] = useState<ModelOption[] | null>(null)
  const [llmModelsMsg, setLlmModelsMsg] = useState('')
  const [trModelsMsg, setTrModelsMsg] = useState('')
  const [loadingModels, setLoadingModels] = useState<'llm' | 'transcribe' | null>(null)

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

  const llmInfo = llmProvider(s.llm.provider)
  const models = llmModels ?? llmInfo.models
  const customModel = isCustomModel(models, s.llm.model)

  const trInfo = transcribeProvider(s.transcribe.provider)
  const trModelList = trModels ?? trInfo.models
  const trCustomModel = isCustomModel(trModelList, s.transcribe.model)

  const loadModels = (kind: 'llm' | 'transcribe') => {
    const cfg = kind === 'llm' ? { info: llmInfo, ...s.llm } : { info: trInfo, ...s.transcribe }
    const setMsg = kind === 'llm' ? setLlmModelsMsg : setTrModelsMsg
    setLoadingModels(kind)
    setMsg('')
    void fetchModels(cfg.info.api, cfg.baseUrl, cfg.apiKey)
      .then((list) => {
        if (kind === 'llm') setLlmModels(list)
        else setTrModels(list)
        setMsg(t('settings.modelsLoaded', { n: list.length }))
      })
      .catch((err: unknown) => setMsg(err instanceof Error ? err.message : t('err.modelsEmpty')))
      .finally(() => setLoadingModels(null))
  }

  const keyLink = (info: ProviderInfo<string>) =>
    info.keyUrl ? (
      <a className="muted key-link" href={info.keyUrl} target="_blank" rel="noreferrer">
        {t('settings.getKey')}
      </a>
    ) : null

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
          <label className="field">
            <span>{t('settings.transcribeService')}</span>
            <select
              value={s.transcribe.provider}
              onChange={(e) => {
                const provider = e.target.value as TranscribeProvider
                const info = transcribeProvider(provider)
                setTrModels(null)
                setTrModelsMsg('')
                update({
                  transcribe: {
                    ...s.transcribe,
                    provider,
                    baseUrl: nextBaseUrl(info, s.transcribe.baseUrl, TRANSCRIBE_PROVIDERS),
                    model: defaultModelFor(info),
                  },
                })
              }}
            >
              {TRANSCRIBE_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {t(p.labelKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t('settings.baseUrl')}</span>
            <input
              type="url"
              value={s.transcribe.baseUrl}
              onChange={(e) => update({ transcribe: { ...s.transcribe, baseUrl: e.target.value.trim() } })}
            />
          </label>
          <label className="field">
            <span>{trInfo.keyRequired ? t('settings.apiKey') : t('settings.apiKeyOptional')}</span>
            <input
              type="password"
              value={s.transcribe.apiKey}
              autoComplete="off"
              onChange={(e) => update({ transcribe: { ...s.transcribe, apiKey: e.target.value.trim() } })}
            />
          </label>
          {keyLink(trInfo)}
          <label className="field">
            <span>{t('settings.transcribeModel')}</span>
            <select
              value={trCustomModel ? '__custom__' : s.transcribe.model}
              onChange={(e) => {
                const value = e.target.value
                update({
                  transcribe: { ...s.transcribe, model: value === '__custom__' ? '' : value },
                })
              }}
            >
              {trModelList.map((m) => (
                <option key={m.id} value={m.id}>
                  {modelLabel(m)}
                </option>
              ))}
              <option value="__custom__">{t('settings.customModel')}</option>
            </select>
          </label>
          {trCustomModel && (
            <label className="field">
              <span>{t('settings.customModelField')}</span>
              <input
                type="text"
                value={s.transcribe.model}
                onChange={(e) => update({ transcribe: { ...s.transcribe, model: e.target.value.trim() } })}
              />
            </label>
          )}
          <div className="row">
            <button
              className="btn-ghost"
              disabled={loadingModels !== null}
              onClick={() => loadModels('transcribe')}
            >
              {loadingModels === 'transcribe' ? t('settings.loadingModels') : t('settings.loadModels')}
            </button>
            {trModelsMsg && <span className="muted">{trModelsMsg}</span>}
          </div>
        </>
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

      <h2>{t('settings.ai')}</h2>
      <label className="field">
        <span>{t('settings.provider')}</span>
        <select
          value={s.llm.provider}
          onChange={(e) => {
            const provider = e.target.value as LlmProvider
            const info = llmProvider(provider)
            setLlmModels(null)
            setLlmModelsMsg('')
            update({
              llm: {
                ...s.llm,
                provider,
                // il modello di un provider non esiste sull'altro: si riparte dal consigliato
                model: defaultModelFor(info),
                baseUrl: nextBaseUrl(info, s.llm.baseUrl, LLM_PROVIDERS),
              },
            })
          }}
        >
          {LLM_PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {t(p.labelKey)}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{t('settings.aiBaseUrl')}</span>
        <input
          type="url"
          value={s.llm.baseUrl}
          onChange={(e) => update({ llm: { ...s.llm, baseUrl: e.target.value.trim() } })}
        />
      </label>
      <label className="field">
        <span>{llmInfo.keyRequired ? t('settings.apiKey') : t('settings.apiKeyOptional')}</span>
        <input
          type="password"
          value={s.llm.apiKey}
          autoComplete="off"
          onChange={(e) => update({ llm: { ...s.llm, apiKey: e.target.value.trim() } })}
        />
      </label>
      {keyLink(llmInfo)}
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
              {modelLabel(m)}
            </option>
          ))}
          <option value="__custom__">{t('settings.customModel')}</option>
        </select>
      </label>
      <p className="muted">{t('settings.pricesNote')}</p>
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
      <div className="row">
        <button className="btn-ghost" disabled={loadingModels !== null} onClick={() => loadModels('llm')}>
          {loadingModels === 'llm' ? t('settings.loadingModels') : t('settings.loadModels')}
        </button>
        {llmModelsMsg && <span className="muted">{llmModelsMsg}</span>}
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
