import { describe, expect, it } from 'vitest'
import { markdownToMermaidMindmap } from '../src/lib/llm/mindmap'

describe('markdownToMermaidMindmap', () => {
  it('converte la gerarchia in mermaid mindmap', () => {
    const md = ['# Progetto', '## Fase 1', '### Analisi', '- requisiti', '## Fase 2'].join('\n')
    expect(markdownToMermaidMindmap(md)).toBe(
      ['mindmap', '  root((Progetto))', '    Fase 1', '      Analisi', '        requisiti', '    Fase 2'].join('\n'),
    )
  })

  it('pulisce i caratteri che romperebbero mermaid', () => {
    const md = '# Titolo (con parentesi)\n## Ramo **grassetto**'
    const out = markdownToMermaidMindmap(md)
    expect(out).toContain('root((Titolo con parentesi))')
    expect(out).toContain('    Ramo grassetto')
  })

  it('gestisce input senza intestazioni', () => {
    expect(markdownToMermaidMindmap('solo testo')).toBe('mindmap\n  root((Mappa))')
  })
})
