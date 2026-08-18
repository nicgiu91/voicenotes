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

  if (transcript.segments.length === 0) {
    return <p className="muted">{t('transcript.empty')}</p>
  }

  return (
    <div className="transcript">
      {groups.map((group, i) => (
        <p key={i}>
          <span className="ts" onClick={() => onSeek(group[0].start)} title={t('transcript.seek')}>
            {formatTimestamp(group[0].start)}
          </span>
          {group.map((s) => s.text).join(' ')}
        </p>
      ))}
    </div>
  )
}
