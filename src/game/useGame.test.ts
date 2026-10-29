import { describe, expect, it } from 'vitest'
import { fresh, reduce } from './useGame'

describe('game reducer: computer moves', () => {
  it('follow the same rules as the player and mark the run as solved by computer', () => {
    let s = reduce(fresh(5), { type: 'move', index: 0, now: 0 })
    expect(s.assisted).toBe(false)
    // Not a knight move: ignored, like a player's illegal click.
    expect(reduce(s, { type: 'move', index: 1, now: 1, by: 'computer' })).toBe(s)
    s = reduce(s, { type: 'move', index: 7, now: 2, by: 'computer' })
    expect(s.path).toEqual([0, 7])
    expect(s.assisted).toBe(true)
    expect(s.lastByComputer).toBe(true)
    // The player carries on: still a computer-assisted run, but the latest move is the player's.
    const carried = reduce(s, { type: 'move', index: 14, now: 3 })
    expect(carried.assisted).toBe(true)
    expect(carried.lastByComputer).toBe(false)
    // Undoing the computer's move does not make the run the player's own again.
    s = reduce(s, { type: 'undo', now: 3 })
    expect(s.assisted).toBe(true)
    // A new run starts clean.
    expect(reduce(s, { type: 'restart' }).assisted).toBe(false)
    expect(reduce(s, { type: 'size', size: 6 }).assisted).toBe(false)
  })
})
