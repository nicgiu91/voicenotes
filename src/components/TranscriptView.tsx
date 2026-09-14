import { useMemo } from 'react'
import type { Transcript } from '../lib/types'
import { groupSegments } from '../lib/transcribe/merge'
import { formatTimestamp } from '../lib/format'
import { useT } from '../lib/i18n'

interface Props {
  transcript: Transcript
  onSeek: (sec: number) => void
}

/** Trascrizione a paragrafi con timestamp cliccabili che fanno seek nell'audio. */
export default function TranscriptView({ transcript, onSeek }: Props) {
  const { t } = useT()
  const groups = useMemo(() => groupSegments(transcript.segments), [transcript])

  // testo importato o servizio senza tempi: si mostrano i paragrafi, senza minuti
  if (transcript.segments.length === 0) {
    const paragraphs = transcript.text.split(/\n\s*\n/).filter((p) => p.trim())
    if (paragraphs.length === 0) return <p className="muted">{t('transcript.empty')}</p>
    return (
      <div className="transcript">
        {paragraphs.map((p, i) => (
          <p key={i}>{p.trim()}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="transcript">
      {groups.map((group, i) => (
        <p key={i}>
          <span className="ts" onClick={() => onSeek(group[0].start)} title={t('transcript.seek')}>
            {formatTimestamp(group[0].start)}
          </span>
          {group[0].speaker !== undefined && (
            <span className="speaker">{t('transcript.speaker', { n: group[0].speaker + 1 })}</span>
          )}
          {group.map((s) => s.text).join(' ')}
        </p>
      ))}
    </div>
  )
}
