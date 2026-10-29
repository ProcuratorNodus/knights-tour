import { describe, expect, it } from 'vitest'
import { ART_KEY, loadArt, saveArt } from './artSets'

function memory(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    data,
    getItem: (k: string) => (k in data ? data[k]! : null),
    setItem: (k: string, v: string) => { data[k] = v },
  }
}

describe('art set choice', () => {
  it('defaults to the new set', () => {
    expect(loadArt(memory())).toBe('new')
    expect(loadArt(null)).toBe('new')
  })
  it('remembers classic', () => {
    const s = memory()
    saveArt('classic', s)
    expect(s.data[ART_KEY]).toBe('classic')
    expect(loadArt(s)).toBe('classic')
  })
  it('ignores junk and survives a throwing store', () => {
    expect(loadArt(memory({ [ART_KEY]: 'neon' }))).toBe('new')
    const bad = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('full') } }
    expect(loadArt(bad)).toBe('new')
    expect(() => saveArt('classic', bad)).not.toThrow()
  })
})
