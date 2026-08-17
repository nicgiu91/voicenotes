import { describe, expect, it } from 'vitest'
import { buildContext } from '../src/lib/llm/context'

describe('buildContext', () => {
  it('include per intero le note corte', () => {
    const ctx = buildContext([{ title: 'Breve', text: 'poco testo' }])
    expect(ctx).toBe('## Nota: Breve\npoco testo')
  })

  it('tronca le note lunghe tenendo inizio e fine', () => {
    const text = 'A'.repeat(5000) + 'FINE'
    const ctx = buildContext([{ title: 'Lunga', text }], 2000)
    expect(ctx.length).toBeLessThan(2300)
    expect(ctx).toContain('omessa')
    expect(ctx.endsWith('FINE')).toBe(true)
  })

  it('divide il budget tra più note', () => {
    const notes = [
      { title: 'Uno', text: 'X'.repeat(3000) },
      { title: 'Due', text: 'Y'.repeat(3000) },
    ]
    const ctx = buildContext(notes, 4000)
    expect(ctx).toContain('## Nota: Uno')
    expect(ctx).toContain('## Nota: Due')
    expect(ctx.length).toBeLessThan(5000)
  })
})
