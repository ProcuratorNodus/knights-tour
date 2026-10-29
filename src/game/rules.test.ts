import { describe, expect, it } from 'vitest'
import {
  applyMove, coords, findOrphan, futureCounts, legalMoves, neighbors, squareCount, status, undoMove,
} from './rules'

// A known open tour of the 8x8 board (the original's precomputed tour from square 0).
const TOUR_8 = [0,17,32,49,59,53,63,46,61,55,38,23,6,12,2,8,25,40,57,42,48,58,52,62,47,30,15,5,11,1,16,10,4,21,31,14,20,3,9,24,18,33,27,37,43,26,36,19,13,7,22,28,34,51,41,56,50,35,29,44,54,60,45,39]

describe('move rules', () => {
  it('gives corners 2 moves, centre 8, in-board only', () => {
    expect(neighbors(8, 0).sort((a, b) => a - b)).toEqual([10, 17])
    expect(neighbors(8, 27)).toHaveLength(8)
    expect(neighbors(8, 7).sort((a, b) => a - b)).toEqual([13, 22])
    for (let i = 0; i < 64; i++) for (const n of neighbors(8, i)) expect(neighbors(8, n)).toContain(i)
  })

  it('reports 1-based coordinates', () => {
    expect(coords(8, 0)).toEqual([1, 1])
    expect(coords(8, 63)).toEqual([8, 8])
    expect(coords(5, 7)).toEqual([2, 3])
  })

  it('allows starting anywhere, then only unvisited L-moves', () => {
    expect(legalMoves(8, [])).toHaveLength(64)
    expect(legalMoves(8, [0]).sort((a, b) => a - b)).toEqual([10, 17])
    expect(legalMoves(8, [0, 10])).not.toContain(0)
  })

  it('rejects illegal moves and keeps the path', () => {
    const p = [0]
    expect(applyMove(8, p, 1)).toBe(p)
    expect(applyMove(8, p, 0)).toBe(p)
    expect(applyMove(8, p, 17)).toEqual([0, 17])
  })

  it('undo removes the last move and is safe on empty', () => {
    expect(undoMove([0, 17])).toEqual([0])
    expect(undoMove([])).toEqual([])
  })
})

describe('tour and stuck detection', () => {
  it('the reference tour is legal and wins at move 64', () => {
    let p: readonly number[] = []
    for (const [i, sq] of TOUR_8.entries()) {
      expect(status(8, p)).toBe('playing')
      const next = applyMove(8, p, sq)
      expect(next, `move ${i}`).not.toBe(p)
      p = next
    }
    expect(p).toHaveLength(squareCount(8))
    expect(status(8, p)).toBe('won')
    expect(applyMove(8, p, 0)).toBe(p)
  })

  it('detects a dead end (no legal moves, board not full)', () => {
    const stuck = findPathWhere(5, (p) => status(5, p) === 'stuck')
    expect(stuck).not.toBeNull()
    expect(legalMoves(5, stuck!)).toHaveLength(0)
    expect(stuck!.length).toBeLessThan(25)
  })

  it('detects an orphan: an unvisited square with every neighbour visited', () => {
    const orphaned = findPathWhere(5, (p) => status(5, p) === 'orphan')
    expect(orphaned).not.toBeNull()
    const o = findOrphan(5, orphaned!)
    expect(o).toBeGreaterThanOrEqual(0)
    for (const n of neighbors(5, o)) expect(orphaned).toContain(n)
    expect(orphaned).not.toContain(o)
  })

  it('does not call a square an orphan while the knight stands next to it', () => {
    // corner 0 has neighbours 10 and 17; visit 17 earlier, knight now on 10.
    // Square 0 is reachable from 10, so it is not orphaned.
    expect(findOrphan(8, [17, 34, 51, 36, 19, 2, 12, 10])).not.toBe(0)
  })

  it('a full tour is winnable on 5x5', () => {
    const won = findPathWhere(5, (p) => status(5, p) === 'won')
    expect(won).toHaveLength(25)
  })
})

describe('hint counts', () => {
  it('counts onward moves excluding visited squares, the origin and itself', () => {
    const counts = futureCounts(8, [], 0)
    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([10, 17])
    expect(counts.get(10)).toBe(neighbors(8, 10).filter((k) => k !== 0).length)
    expect(futureCounts(8, [0, 10], 0).has(10)).toBe(false)
  })
})

function findPathWhere(size: number, pred: (p: readonly number[]) => boolean): readonly number[] | null {
  const start = Math.floor(squareCount(size) / 2)
  const dfs = (p: readonly number[]): readonly number[] | null => {
    if (pred(p)) return p
    if (status(size, p) !== 'playing') return null
    for (const m of legalMoves(size, p)) {
      const r = dfs([...p, m])
      if (r) return r
    }
    return null
  }
  for (const s of [start, 0, 1, 2, 6, 12]) {
    const r = dfs([s])
    if (r) return r
  }
  return null
}
