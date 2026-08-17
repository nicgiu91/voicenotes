/**
 * Converte il Markdown gerarchico della mappa mentale (prodotto dall'LLM)
 * in sorgente Mermaid `mindmap`, per la copia e per l'export Obsidian.
 * Funzione pura, testata in tests/mindmap.test.ts.
 */
export function markdownToMermaidMindmap(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = ['mindmap']
  let rootDone = false
  let lastHeadingLevel = 1

  const clean = (s: string) =>
    s
      .replace(/\*\*/g, '')
      .replace(/[`*_]/g, '')
      .replace(/[()[\]{}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

  for (const raw of lines) {
    const heading = /^(#{1,6})\s+(.*)$/.exec(raw)
    if (heading) {
      const level = heading[1].length
      const label = clean(heading[2])
      if (!label) continue
      if (!rootDone) {
        out.push(`  root((${label}))`)
        rootDone = true
        lastHeadingLevel = 1
        continue
      }
      const depth = Math.max(2, level)
      out.push(`${'  '.repeat(depth)}${label}`)
      lastHeadingLevel = depth
      continue
    }
    const bullet = /^\s*[-*]\s+(.*)$/.exec(raw)
    if (bullet && rootDone) {
      const label = clean(bullet[1])
      if (!label) continue
      out.push(`${'  '.repeat(lastHeadingLevel + 1)}${label}`)
    }
  }

  if (!rootDone) return `mindmap\n  root((Mappa))`
  return out.join('\n')
}
