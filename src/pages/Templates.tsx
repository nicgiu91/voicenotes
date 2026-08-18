import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import type { Template } from '../lib/types'
import { builtinTemplates } from '../lib/llm/prompts'
import { useT } from '../lib/i18n'

/** Elenco completo: predefiniti + personalizzati salvati in IndexedDB. */
export async function loadAllTemplates(): Promise<Template[]> {
  const custom = await db.templates.toArray()
  return [...builtinTemplates(), ...custom]
}

export default function Templates() {
  const { t } = useT()
  const [custom, setCustom] = useState<Template[]>([])
  const [editing, setEditing] = useState<Template | null>(null)
  const [viewing, setViewing] = useState<Template | null>(null)

  const reload = async () => setCustom(await db.templates.toArray())

  useEffect(() => {
    void reload()
  }, [])

  const startNew = () =>
    setEditing({ id: crypto.randomUUID(), name: '', prompt: t('templates.newPromptStart') })

  const save = async () => {
    if (!editing || !editing.name.trim() || !editing.prompt.trim()) return
    await db.templates.put({ ...editing, name: editing.name.trim() })
    setEditing(null)
    await reload()
  }

  const remove = async (tpl: Template) => {
    if (!confirm(t('templates.deleteConfirm', { name: tpl.name }))) return
    await db.templates.delete(tpl.id)
    await reload()
  }

  return (
    <div>
      <h1>{t('templates.title')}</h1>
      <p className="muted">{t('templates.intro')}</p>

      <h2>{t('templates.builtin')}</h2>
      {builtinTemplates().map((tpl) => (
        <div key={tpl.id} className="card">
          <div className="row">
            <strong>{tpl.name}</strong>
            <span className="spacer" />
            <button
              className="btn-ghost btn-small"
              onClick={() => setViewing(viewing?.id === tpl.id ? null : tpl)}
            >
              {viewing?.id === tpl.id ? t('templates.hide') : t('templates.viewPrompt')}
            </button>
          </div>
          {viewing?.id === tpl.id && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              {tpl.prompt}
            </pre>
          )}
        </div>
      ))}

      <h2>{t('templates.custom')}</h2>
      {custom.length === 0 && !editing && <p className="muted">{t('templates.none')}</p>}
      {custom.map((tpl) => (
        <div key={tpl.id} className="card">
          <div className="row">
            <strong>{tpl.name}</strong>
            <span className="spacer" />
            <button className="btn-ghost btn-small" onClick={() => setEditing(tpl)}>
              {t('common.edit')}
            </button>
            <button className="btn-danger btn-small" onClick={() => void remove(tpl)}>
              {t('common.delete')}
            </button>
          </div>
        </div>
      ))}

      {editing ? (
        <div className="card">
          <label className="field">
            <span>{t('templates.name')}</span>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder={t('templates.namePlaceholder')}
            />
          </label>
          <label className="field">
            <span>{t('templates.prompt')}</span>
            <textarea
              value={editing.prompt}
              onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
            />
          </label>
          <div className="row">
            <button className="btn-primary btn-small" onClick={() => void save()}>
              {t('templates.saveTemplate')}
            </button>
            <button className="btn-ghost btn-small" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost" onClick={startNew}>
          {t('templates.new')}
        </button>
      )}
    </div>
  )
}
