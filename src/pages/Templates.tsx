import { useEffect, useState } from 'react'
import { db } from '../lib/db'
import type { Template } from '../lib/types'
import { builtinTemplates } from '../lib/llm/prompts'

/** Elenco completo: predefiniti + personalizzati salvati in IndexedDB. */
export async function loadAllTemplates(): Promise<Template[]> {
  const custom = await db.templates.toArray()
  return [...builtinTemplates, ...custom]
}

export default function Templates() {
  const [custom, setCustom] = useState<Template[]>([])
  const [editing, setEditing] = useState<Template | null>(null)
  const [viewing, setViewing] = useState<Template | null>(null)

  const reload = async () => setCustom(await db.templates.toArray())

  useEffect(() => {
    void reload()
  }, [])

  const startNew = () =>
    setEditing({ id: crypto.randomUUID(), name: '', prompt: 'Sei un assistente che riassume registrazioni in italiano.\n\n' })

  const save = async () => {
    if (!editing || !editing.name.trim() || !editing.prompt.trim()) return
    await db.templates.put({ ...editing, name: editing.name.trim() })
    setEditing(null)
    await reload()
  }

  const remove = async (t: Template) => {
    if (!confirm(`Eliminare il template "${t.name}"?`)) return
    await db.templates.delete(t.id)
    await reload()
  }

  return (
    <div>
      <h1>Template di riepilogo</h1>
      <p className="muted">
        Ogni template è un prompt: descrive all'AI come riassumere la trascrizione. Quelli
        predefiniti non si possono modificare, ma puoi crearne di tuoi.
      </p>

      <h2>Predefiniti</h2>
      {builtinTemplates.map((t) => (
        <div key={t.id} className="card">
          <div className="row">
            <strong>{t.name}</strong>
            <span className="spacer" />
            <button
              className="btn-ghost btn-small"
              onClick={() => setViewing(viewing?.id === t.id ? null : t)}
            >
              {viewing?.id === t.id ? 'Nascondi' : 'Vedi prompt'}
            </button>
          </div>
          {viewing?.id === t.id && (
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              {t.prompt}
            </pre>
          )}
        </div>
      ))}

      <h2>Personalizzati</h2>
      {custom.length === 0 && !editing && <p className="muted">Nessun template personalizzato.</p>}
      {custom.map((t) => (
        <div key={t.id} className="card">
          <div className="row">
            <strong>{t.name}</strong>
            <span className="spacer" />
            <button className="btn-ghost btn-small" onClick={() => setEditing(t)}>
              Modifica
            </button>
            <button className="btn-danger btn-small" onClick={() => void remove(t)}>
              Elimina
            </button>
          </div>
        </div>
      ))}

      {editing ? (
        <div className="card">
          <label className="field">
            <span>Nome del template</span>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              placeholder="es. Consulto / Colloquio"
            />
          </label>
          <label className="field">
            <span>Prompt (istruzioni per l'AI)</span>
            <textarea
              value={editing.prompt}
              onChange={(e) => setEditing({ ...editing, prompt: e.target.value })}
            />
          </label>
          <div className="row">
            <button className="btn-primary btn-small" onClick={() => void save()}>
              Salva template
            </button>
            <button className="btn-ghost btn-small" onClick={() => setEditing(null)}>
              Annulla
            </button>
          </div>
        </div>
      ) : (
        <button className="btn-ghost" onClick={startNew}>
          + Nuovo template
        </button>
      )}
    </div>
  )
}
