import { Fragment, useMemo } from 'react'
import type { ReactNode } from 'react'

/** Formattazione inline: **grassetto**, *corsivo*, `codice`. */
function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    if (m[2] !== undefined) out.push(<strong key={`${keyBase}-${k++}`}>{m[2]}</strong>)
    else if (m[3] !== undefined) out.push(<em key={`${keyBase}-${k++}`}>{m[3]}</em>)
    else if (m[4] !== undefined) out.push(<code key={`${keyBase}-${k++}`}>{m[4]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

/**
 * Renderer Markdown minimale per i testi generati dall'LLM
 * (titoli, elenchi, grassetto). Niente HTML: solo elementi React.
 */
export default function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => {
    const lines = text.replace(/\r\n/g, '\n').split('\n')
    const nodes: ReactNode[] = []
    let list: string[] = []
    let key = 0

    const flushList = () => {
      if (list.length === 0) return
      nodes.push(
        <ul key={`ul-${key++}`}>
          {list.map((item, i) => (
            <li key={i}>{inline(item, `li-${key}-${i}`)}</li>
          ))}
        </ul>,
      )
      list = []
    }

    for (const raw of lines) {
      const line = raw.trimEnd()
      const bullet = /^\s*[-*]\s+(.*)$/.exec(line)
      if (bullet) {
        list.push(bullet[1])
        continue
      }
      flushList()
      const heading = /^(#{1,4})\s+(.*)$/.exec(line)
      if (heading) {
        const level = heading[1].length
        const content = inline(heading[2], `h-${key}`)
        nodes.push(
          level <= 2 ? (
            <h3 key={`h-${key++}`}>{content}</h3>
          ) : (
            <h4 key={`h-${key++}`}>{content}</h4>
          ),
        )
        continue
      }
      if (line.trim() === '') continue
      nodes.push(<p key={`p-${key++}`}>{inline(line, `p-${key}`)}</p>)
    }
    flushList()
    return nodes
  }, [text])

  return (
    <div className="md">
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  )
}
