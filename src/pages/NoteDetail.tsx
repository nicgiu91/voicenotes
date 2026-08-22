import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { db, deleteNoteCompletely, getSettings } from '../lib/db'
import type { Note, Template } from '../lib/types'
import { assembleAudio, audioExtension } from '../lib/audio/assemble'
import { formatDate, formatDuration, isDefaultNoteTitle, slugify } from '../lib/format'
import { transcribeNote } from '../lib/transcribe/client'
import { chatLLM, fastLlm, llmConfigured } from '../lib/llm/client'
import { diarizzazionePrompt, mindmapPrompt, prompt, titoloPrompt } from '../lib/llm/prompts'
import { markdownToMermaidMindmap } from '../lib/llm/mindmap'
import TranscriptView from '../components/TranscriptView'
import MindMapView from '../components/MindMapView'
import Markdown from '../components/Markdown'
import { loadAllTemplates } from './Templates'
import { noteToMarkdown } from '../lib/export/markdown'
import TagEditor from '../components/TagEditor'
import { useT } from '../lib/i18n'

export default function NoteDetail() {
  const { t } = useT()
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
      .catch(() => setAudioError(t('note.audioUnavailable')))
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!note) return <p className="muted">{t('note.notFound')}</p>

  const saveTitle = async () => {
    const title = titleDraft.trim()
    if (title) await db.notes.update(note.id, { title })
    setEditingTitle(false)
    await reload()
  }

  const removeNote = async () => {
    if (!confirm(t('note.deleteConfirm', { title: note.title }))) return
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

  const templateNamesRecord = () => Object.fromEntries(templates.map((x) => [x.id, x.name]))

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
      if (isDefaultNoteTitle(note.title) && llmConfigured(settings.llm) && transcript.text) {
        try {
          setProgress(t('transcribe.titleGenerating'))
          const title = await chatLLM(
            prompt(titoloPrompt),
            [{ role: 'user', content: transcript.text.slice(0, 8000) }],
            fastLlm(settings.llm),
          )
          await db.notes.update(note.id, { title: title.replace(/^["']|["']$/g, '').slice(0, 120) })
        } catch {
          // il titolo automatico è un extra: se fallisce, pazienza
        }
      }
      await reload()
    } catch (e) {
      setTranscribeError(e instanceof Error ? e.message : t('err.transcribeGeneric'))
    } finally {
      setTranscribing(false)
      setProgress('')
    }
  }

  const runLLM = async (
    busyLabel: string,
    fn: (llm: Awaited<ReturnType<typeof getSettings>>['llm']) => Promise<void>,
  ) => {
    setAiError('')
    setAiBusy(busyLabel)
    try {
      const settings = await getSettings()
      if (!llmConfigured(settings.llm)) throw new Error(t('err.llmConfigure'))
      await fn(settings.llm)
      await reload()
    } catch (e) {
      setAiError(e instanceof Error ? e.message : t('err.llmGeneric'))
    } finally {
      setAiBusy('')
    }
  }

  const transcriptText = note.transcript?.text ?? ''

  const generateSummaries = () =>
    runLLM('riepiloghi', async (llm) => {
      const chosen = templates.filter((x) => pickedTemplates.includes(x.id))
      const summaries = { ...(note.summaries ?? {}) }
      for (const tpl of chosen) {
        summaries[tpl.id] = await chatLLM(
          tpl.prompt,
          [{ role: 'user', content: transcriptText }],
          llm,
        )
      }
      await db.notes.update(note.id, { summaries })
      setPickedTemplates([])
    })

  const generateMindmap = () =>
    runLLM('mappa', async (llm) => {
      const markdown = await chatLLM(
        prompt(mindmapPrompt),
        [{ role: 'user', content: transcriptText }],
        llm,
      )
      const cleaned = markdown.replace(/^```[a-z]*\n?|```\s*$/g, '').trim()
      await db.notes.update(note.id, {
        mindmap: { markdown: cleaned, mermaid: markdownToMermaidMindmap(cleaned) },
      })
    })

  const diarize = () =>
    runLLM('diarizzazione', async (llm) => {
      const result = await chatLLM(
        prompt(diarizzazionePrompt),
        [{ role: 'user', content: transcriptText }],
        fastLlm(llm),
      )
      const summaries = { ...(note.summaries ?? {}), diarizzazione: result }
      await db.notes.update(note.id, { summaries })
    })

  const templateName = (templateId: string) =>
    templateId === 'diarizzazione'
      ? t('note.diarizationName')
      : (templates.find((x) => x.id === templateId)?.name ?? templateId)

  const removeSummary = async (templateId: string) => {
    const summaries = { ...(note.summaries ?? {}) }
    delete summaries[templateId]
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
            {t('common.save')}
          </button>
        </div>
      ) : (
        <h1
          onClick={() => (setTitleDraft(note.title), setEditingTitle(true))}
          title={t('note.renameHint')}
        >
          {note.title}
        </h1>
      )}
      <p className="muted">
        {formatDate(note.createdAt)} · {formatDuration(note.durationSec)}
        {note.status === 'recovered' && ` · ${t('note.recovered')}`}
      </p>

      {audioError && <div className="info-box">{audioError}</div>}
      {audioUrl && <audio ref={audioRef} src={audioUrl} controls preload="metadata" />}

      <div className="row" style={{ marginTop: 10 }}>
        <button className="btn-ghost btn-small" onClick={() => void exportAudio()}>
          {t('note.exportAudio')}
        </button>
        <button className="btn-ghost btn-small" onClick={exportMarkdown}>
          {t('note.exportMd')}
        </button>
        {'share' in navigator && (
          <button className="btn-ghost btn-small" onClick={() => void shareNote()}>
            {t('note.share')}
          </button>
        )}
        <span className="spacer" />
        <button className="btn-danger btn-small" onClick={() => void removeNote()}>
          {t('common.delete')}
        </button>
      </div>

      <h2>{t('note.tags')}</h2>
      <TagEditor note={note} onChanged={() => void reload()} />

      <h2>{t('note.transcription')}</h2>
      {note.transcript ? (
        <>
          <TranscriptView transcript={note.transcript} onSeek={seekTo} />
          <button className="btn-ghost btn-small" onClick={() => void doTranscribe()} disabled={transcribing}>
            {transcribing ? t('note.transcribing') : t('note.retranscribe')}
          </button>
        </>
      ) : (
        <button className="btn-primary" onClick={() => void doTranscribe()} disabled={transcribing}>
          {transcribing ? t('note.transcribing') : t('note.transcribe')}
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
          <h2>{t('note.summaries')}</h2>
          {Object.entries(note.summaries ?? {}).map(([templateId, text]) => (
            <div key={templateId} className="card">
              <div className="row">
                <strong>{templateName(templateId)}</strong>
                <span className="spacer" />
                <button className="btn-ghost btn-small" onClick={() => void removeSummary(templateId)}>
                  {t('common.remove')}
                </button>
              </div>
              <Markdown text={text} />
            </div>
          ))}
          <div className="row" style={{ marginBottom: 8 }}>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                className={`btn-small ${pickedTemplates.includes(tpl.id) ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() =>
                  setPickedTemplates((cur) =>
                    cur.includes(tpl.id) ? cur.filter((x) => x !== tpl.id) : [...cur, tpl.id],
                  )
                }
              >
                {tpl.name}
              </button>
            ))}
          </div>
          <div className="row">
            <button
              className="btn-primary btn-small"
              onClick={() => void generateSummaries()}
              disabled={aiBusy !== '' || pickedTemplates.length === 0}
            >
              {aiBusy === 'riepiloghi' ? t('note.generating') : t('note.generateSummary')}
            </button>
            <button className="btn-ghost btn-small" onClick={() => void diarize()} disabled={aiBusy !== ''}>
              {aiBusy === 'diarizzazione' ? t('note.analyzing') : t('note.diarize')}
            </button>
          </div>

          <h2>{t('note.mindmap')}</h2>
          {note.mindmap ? (
            <>
              <MindMapView markdown={note.mindmap.markdown} mermaid={note.mindmap.mermaid} />
              <button
                className="btn-ghost btn-small"
                style={{ marginTop: 8 }}
                onClick={() => void generateMindmap()}
                disabled={aiBusy !== ''}
              >
                {aiBusy === 'mappa' ? t('note.generating') : t('note.regenerateMindmap')}
              </button>
            </>
          ) : (
            <button className="btn-primary btn-small" onClick={() => void generateMindmap()} disabled={aiBusy !== ''}>
              {aiBusy === 'mappa' ? t('note.generating') : t('note.generateMindmap')}
            </button>
          )}
          {aiError && <div className="error-box">{aiError}</div>}
        </>
      )}
    </div>
  )
}
