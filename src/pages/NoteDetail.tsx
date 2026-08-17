import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, deleteNoteCompletely, getSettings } from '../lib/db'
import type { Note } from '../lib/types'
import { assembleAudio, audioExtension } from '../lib/audio/assemble'
import { formatDate, formatDuration, slugify } from '../lib/format'
import { transcribeNote } from '../lib/transcribe/client'
import { chatLLM, llmConfigured } from '../lib/llm/client'
import { diarizzazionePrompt, mindmapPrompt, titoloPrompt } from '../lib/llm/prompts'
import { markdownToMermaidMindmap } from '../lib/llm/mindmap'
import TranscriptView from '../components/TranscriptView'
import MindMapView from '../components/MindMapView'
import Markdown from '../components/Markdown'
import { loadAllTemplates } from './Templates'
import type { Template } from '../lib/types'
import { noteToMarkdown } from '../lib/export/markdown'
import TagEditor from '../components/TagEditor'

export default function NoteDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [note, setNote] = useState<Note | null>(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [audioError, setAudioError] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [transcribing, setTranscribing] = useState(false)
  const [progress, setProgress] = useState('')
  const [transcribeError, setTranscribeError] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [pickedTemplates, setPickedTemplates] = useState<string[]>([])
  const [aiBusy, setAiBusy] = useState('')
  const [aiError, setAiError] = useState('')
  const audioRef = useRef<HTMLAudioElement>(null)

  const reload = async () => {
    const n = await db.notes.get(id)
    setNote(n ?? null)
  }

  useEffect(() => {
    void loadAllTemplates().then(setTemplates)
  }, [])

  useEffect(() => {
    void reload()
    let url = ''
    assembleAudio(id)
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setAudioUrl(url)
      })
      .catch(() => setAudioError('Audio non disponibile per questa nota.'))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!note) return <p className="muted">Nota non trovata.</p>

  const saveTitle = async () => {
    const title = titleDraft.trim()
    if (title) await db.notes.update(note.id, { title })
    setEditingTitle(false)
    await reload()
  }

  const removeNote = async () => {
    if (!confirm(`Eliminare definitivamente "${note.title}"?\nAudio e trascrizione andranno persi.`)) return
    await deleteNoteCompletely(note.id)
    navigate('/')
  }

  const exportAudio = async () => {
    const blob = await assembleAudio(note.id)
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slugify(note.title)}.${audioExtension(note.mimeType)}`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  const templateNamesRecord = () =>
    Object.fromEntries(templates.map((t) => [t.id, t.name]))

  const exportMarkdown = () => {
    const md = noteToMarkdown(note, templateNamesRecord())
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${slugify(note.title)}.md`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  const shareNote = async () => {
    const md = noteToMarkdown(note, templateNamesRecord())
    const file = new File([md], `${slugify(note.title)}.md`, { type: 'text/markdown' })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: note.title })
      } else if (navigator.share) {
        await navigator.share({ title: note.title, text: md })
      }
    } catch {
      // condivisione annullata dall'utente
    }
  }

  const seekTo = (sec: number) => {
    const el = audioRef.current
    if (!el) return
    el.currentTime = sec
    void el.play()
  }

  const doTranscribe = async () => {
    setTranscribing(true)
    setTranscribeError('')
    try {
      const settings = await getSettings()
      const transcript = await transcribeNote(note.id, settings.transcribe, setProgress)
      // titolo automatico: solo se il titolo è ancora quello predefinito
      if (note.title.startsWith('Registrazione ') && llmConfigured(settings.llm) && transcript.text) {
        try {
          setProgress('Generazione del titolo…')
          const title = await chatLLM(
            titoloPrompt,
            [{ role: 'user', content: transcript.text.slice(0, 8000) }],
            settings.llm,
          )
          await db.notes.update(note.id, { title: title.replace(/^["']|["']$/g, '').slice(0, 120) })
        } catch {
          // il titolo automatico è un extra: se fallisce, pazienza
        }
      }
      await reload()
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : 'Errore di trascrizione')
    } finally {
      setTranscribing(false)
      setProgress('')
    }
  }

  const runLLM = async (busyLabel: string, fn: (llm: Awaited<ReturnType<typeof getSettings>>['llm']) => Promise<void>) => {
    setAiError('')
    setAiBusy(busyLabel)
    try {
      const settings = await getSettings()
      if (!llmConfigured(settings.llm)) {
        throw new Error('Configura prima il provider AI nelle Impostazioni.')
      }
      await fn(settings.llm)
      await reload()
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Errore del provider AI')
    } finally {
      setAiBusy('')
    }
  }

  const transcriptText = note.transcript?.text ?? ''

  const generateSummaries = () =>
    runLLM('riepiloghi', async (llm) => {
      const chosen = templates.filter((t) => pickedTemplates.includes(t.id))
      const summaries = { ...(note.summaries ?? {}) }
      for (const t of chosen) {
        const result = await chatLLM(t.prompt, [{ role: 'user', content: transcriptText }], llm)
        summaries[t.id] = result
      }
      await db.notes.update(note.id, { summaries })
      setPickedTemplates([])
    })

  const generateMindmap = () =>
    runLLM('mappa', async (llm) => {
      const markdown = await chatLLM(mindmapPrompt, [{ role: 'user', content: transcriptText }], llm)
      const cleaned = markdown.replace(/^```[a-z]*\n?|```\s*$/g, '').trim()
      await db.notes.update(note.id, {
        mindmap: { markdown: cleaned, mermaid: markdownToMermaidMindmap(cleaned) },
      })
    })

  const diarize = () =>
    runLLM('diarizzazione', async (llm) => {
      const result = await chatLLM(diarizzazionePrompt, [{ role: 'user', content: transcriptText }], llm)
      const summaries = { ...(note.summaries ?? {}), diarizzazione: result }
      await db.notes.update(note.id, { summaries })
    })

  const templateName = (id: string) =>
    id === 'diarizzazione'
      ? 'Trascrizione per interlocutore'
      : (templates.find((t) => t.id === id)?.name ?? id)

  const removeSummary = async (id: string) => {
    const summaries = { ...(note.summaries ?? {}) }
    delete summaries[id]
    await db.notes.update(note.id, { summaries })
    await reload()
  }

  return (
    <div>
      {editingTitle ? (
        <div className="row" style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
          />
          <button className="btn-primary btn-small" onClick={() => void saveTitle()}>
            Salva
          </button>
        </div>
      ) : (
        <h1 onClick={() => (setTitleDraft(note.title), setEditingTitle(true))} title="Tocca per rinominare">
          {note.title}
        </h1>
      )}
      <p className="muted">
        {formatDate(note.createdAt)} · {formatDuration(note.durationSec)}
        {note.status === 'recovered' && ' · recuperata dopo interruzione'}
      </p>

      {audioError && <div className="info-box">{audioError}</div>}
      {audioUrl && <audio ref={audioRef} src={audioUrl} controls preload="metadata" />}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn-ghost btn-small" onClick={() => void exportAudio()}>
          Esporta audio
        </button>
        <button className="btn-ghost btn-small" onClick={exportMarkdown}>
          Esporta .md
        </button>
        {'share' in navigator && (
          <button className="btn-ghost btn-small" onClick={() => void shareNote()}>
            Condividi
          </button>
        )}
        <span className="spacer" />
        <button className="btn-danger btn-small" onClick={() => void removeNote()}>
          Elimina
        </button>
      </div>

      <h2>Tag</h2>
      <TagEditor note={note} onChanged={() => void reload()} />

      <h2>Trascrizione</h2>
      {note.transcript ? (
        <>
          <TranscriptView transcript={note.transcript} onSeek={seekTo} />
          <button className="btn-ghost btn-small" onClick={() => void doTranscribe()} disabled={transcribing}>
            {transcribing ? 'Trascrizione in corso…' : 'Ritrascrivi'}
          </button>
        </>
      ) : (
        <button className="btn-primary" onClick={() => void doTranscribe()} disabled={transcribing}>
          {transcribing ? 'Trascrizione in corso…' : 'Trascrivi'}
        </button>
      )}
      {transcribing && progress && (
        <p className="muted">
          <span className="spin" />
          {progress}
        </p>
      )}
      {transcribeError && <div className="error-box">{transcribeError}</div>}

      {note.transcript && (
        <>
          <h2>Riepiloghi AI</h2>
          {Object.entries(note.summaries ?? {}).map(([id, text]) => (
            <div key={id} className="card">
              <div className="row">
                <strong>{templateName(id)}</strong>
                <span className="spacer" />
                <button className="btn-ghost btn-small" onClick={() => void removeSummary(id)}>
                  Rimuovi
                </button>
              </div>
              <Markdown text={text} />
            </div>
          ))}
          <div className="row" style={{ marginBottom: 8 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                className={`btn-small ${pickedTemplates.includes(t.id) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() =>
                  setPickedTemplates((cur) =>
                    cur.includes(t.id) ? cur.filter((x) => x !== t.id) : [...cur, t.id],
                  )
                }
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="row">
            <button
              className="btn-primary btn-small"
              onClick={() => void generateSummaries()}
              disabled={aiBusy !== '' || pickedTemplates.length === 0}
            >
              {aiBusy === 'riepiloghi' ? 'Generazione…' : 'Genera riepilogo'}
            </button>
            <button className="btn-ghost btn-small" onClick={() => void diarize()} disabled={aiBusy !== ''}>
              {aiBusy === 'diarizzazione' ? 'Analisi…' : 'Chi parla? (per interlocutore)'}
            </button>
          </div>

          <h2>Mappa mentale</h2>
          {note.mindmap ? (
            <>
              <MindMapView markdown={note.mindmap.markdown} mermaid={note.mindmap.mermaid} />
              <button
                className="btn-ghost btn-small"
                style={{ marginTop: 8 }}
                onClick={() => void generateMindmap()}
                disabled={aiBusy !== ''}
              >
                {aiBusy === 'mappa' ? 'Generazione…' : 'Rigenera mappa'}
              </button>
            </>
          ) : (
            <button className="btn-primary btn-small" onClick={() => void generateMindmap()} disabled={aiBusy !== ''}>
              {aiBusy === 'mappa' ? 'Generazione…' : 'Genera mappa mentale'}
            </button>
          )}
          {aiError && <div className="error-box">{aiError}</div>}
        </>
      )}
    </div>
  )
}
