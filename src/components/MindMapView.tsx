import { useEffect, useRef, useState } from 'react'
import { Transformer } from 'markmap-lib'
import { Markmap } from 'markmap-view'

const transformer = new Transformer()

/** Mappa mentale interattiva (zoom e trascinamento) renderizzata con Markmap. */
export default function MindMapView({ markdown, mermaid }: { markdown: string; mermaid: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)
  const [copied, setCopied] = useState('')

  useEffect(() => {
    if (!svgRef.current) return
    const { root } = transformer.transform(markdown)
    if (!mmRef.current) {
      mmRef.current = Markmap.create(svgRef.current, { autoFit: true }, root)
    } else {
      void mmRef.current.setData(root)
      void mmRef.current.fit()
    }
    return () => {
      mmRef.current?.destroy()
      mmRef.current = null
    }
  }, [markdown])

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(''), 2000)
    } catch {
      // clipboard non disponibile
    }
  }

  return (
    <div>
      <svg ref={svgRef} className="mindmap-svg" />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="btn-ghost btn-small" onClick={() => void copy('markdown', markdown)}>
          Copia Markdown
        </button>
        <button className="btn-ghost btn-small" onClick={() => void copy('mermaid', mermaid)}>
          Copia Mermaid
        </button>
        {copied && <span style={{ color: 'var(--ok)', fontSize: '0.85rem' }}>Copiato ({copied}) ✓</span>}
      </div>
    </div>
  )
}
