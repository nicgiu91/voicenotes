import { useMemo } from 'react'
import type { Transcript } from '../lib/types'
import { groupSegments } from '../lib/transcribe/merge'
import { formatTimestamp } from '../lib/format'

interface Props {
  transcript: Transcript
  onSeek: (sec: number) => void
}

/** Trascrizione a paragrafi con timestamp cliccabili che fanno seek nell'audio. */
export default function TranscriptView({ transcript, onSeek }: Props) {
  const groups = useMemo(() => groupSegments(transcript.segments), [transcript])

  if (transcript.segments.length === 0) {
    return <p className="muted">Trascrizione vuota.</p>
  }

  return (
    <div className="transcript">
      {groups.map((group, i) => (
        <p key={i}>
          <span className="ts" onClick={() => onSeek(group[0].start)} title="Vai a questo punto dell'audio">
            {formatTimestamp(group[0].start)}
          </span>
          {group.map((s) => s.text).join(' ')}
        </p>
      ))}
    </div>
  )
}
