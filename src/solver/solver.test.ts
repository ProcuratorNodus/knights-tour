import { describe, expect, it } from 'vitest'
import { applyMove, BOARD_SIZES, isDark, legalMoves, neighbors, squareCount, status } from '../game/rules'
import { KNOWN_TOURS } from './knownTours'
import { solveTour, startColourOk, type SolveResult } from './solver'
import { isClosedTour, oracleComplete, prng, randomPlay, SLOW_8X8_POSITION, tourError } from './testing'

const PREFIXES = [1, 3, 5, 10, 20] as const
/** A node budget with no practical time limit, so every answer is deterministic. */
const BUDGET = { timeMs: 600_000, maxNodes: 30_000_000 }

function toursOf(size: number): readonly (readonly number[])[] {
  const tours = KNOWN_TOURS[size]
  if (tours === undefined) throw new Error(`no known tours for ${size}`)
  return tours
}

/** Asserts a solved result whose moves complete `path` to a full, legal tour. */
function expectCompletion(size: number, path: readonly number[], r: SolveResult): number[] {
  if (r.kind !== 'solved') throw new Error(`expected a completion of ${JSON.stringify(path)}, got ${r.kind}`)
  const tour = [...path, ...r.moves]
  expect(tourError(size, tour), JSON.stringify(path)).toBeNull()
  expect(r.closed).toBe(isClosedTour(size, tour))
  return tour
}

/** Random play under the game rules until the game ends; the final path if it was lost. */
function randomLoss(size: number, rand: () => number): number[] | null {
  let path: readonly number[] = []
  while (status(size, path) === 'playing') {
    const options = legalMoves(size, path)
    path = applyMove(size, path, options[Math.floor(rand() * options.length)]!)
  }
  const s = status(size, path)
  return s === 'stuck' || s === 'orphan' ? [...path] : null
}

describe('positions known to have a completion', () => {
  it('the fixture tours are real tours', () => {
    for (const size of BOARD_SIZES) {
      for (const tour of toursOf(size)) expect(tourError(size, tour)).toBeNull()
    }
    expect(toursOf(8)).toHaveLength(64)
    toursOf(8).forEach((tour, i) => expect(tour[0]).toBe(i))
  })

  for (const size of BOARD_SIZES) {
    it(`${size}x${size}: completes the empty board and every 1, 3, 5, 10 and 20 move prefix of the known tours`, () => {
      expectCompletion(size, [], solveTour(size, [], BUDGET))
      for (const tour of toursOf(size)) {
        for (const len of PREFIXES) {
          if (len >= squareCount(size)) continue
          const prefix = tour.slice(0, len)
          expectCompletion(size, prefix, solveTour(size, prefix, BUDGET))
        }
      }
    })
  }

  it('returns no moves for a finished tour', () => {
    const tour = toursOf(8)[0]!
    const r = solveTour(8, tour, BUDGET)
    expect(r).toMatchObject({ kind: 'solved', moves: [] })
  })

  it('finds a closed tour when asked on 6x6 and 8x8, and an open one on odd boards', () => {
    for (const size of [6, 8]) {
      for (const path of [[], [0], [1], [squareCount(size) - 1], toursOf(size)[1]!.slice(0, 1)]) {
        const tour = expectCompletion(size, path, solveTour(size, path, { ...BUDGET, prefer: 'closed' }))
        expect(isClosedTour(size, tour), JSON.stringify(path)).toBe(true)
      }
    }
    // Two colours and an odd number of squares: no closed tour exists, so any tour is returned.
    for (const size of [5, 7]) expectCompletion(size, [], solveTour(size, [], { ...BUDGET, prefer: 'closed' }))
  })

  it('a closed-tour preference never costs the answer: the closed attempt gets at most half the budget', () => {
    // An open completion is found in about 50 nodes here; proving that no closed
    // one exists takes about 23 000. With 20 000 nodes in all, the closed attempt
    // must stop at its half and leave the rest to the open search.
    const path = [63, 46, 31, 37, 27, 44, 34, 19, 25, 42, 52, 62, 45, 39]
    expect(solveTour(8, path, { ...BUDGET, walkBack: false }).nodes).toBeLessThan(1000)
    expect(solveTour(8, path, { ...BUDGET, prefer: 'closed', walkBack: false }).nodes).toBeGreaterThan(20_000)
    const r = solveTour(8, path, { maxNodes: 20_000, timeMs: 600_000, prefer: 'closed' })
    expectCompletion(8, path, r)
    expect(r.nodes).toBeGreaterThanOrEqual(10_000)
    expect(r.nodes).toBeLessThan(20_000)
  })

  it('gives the same answer for the same seed', () => {
    const path = toursOf(8)[20]!.slice(0, 5)
    expect(solveTour(8, path, { ...BUDGET, seed: 9 })).toMatchObject({
      moves: (solveTour(8, path, { ...BUDGET, seed: 9 }) as { moves: number[] }).moves,
    })
  })
})

describe('random play positions', () => {
  for (const size of BOARD_SIZES) {
    it(`${size}x${size}: always a legal completion or a proof that none exists`, () => {
      const rand = prng(1000 + size)
      const seen = { solved: 0, none: 0 }
      for (const len of PREFIXES) {
        if (len >= squareCount(size)) continue
        let made = 0
        for (let tries = 0; made < 40 && tries < 4000; tries++) {
          const path = randomPlay(size, len, rand)
          if (path === null) continue
          made++
          const r = solveTour(size, path, BUDGET)
          if (r.kind === 'unknown') throw new Error(`undecided: ${JSON.stringify(path)}`)
          seen[r.kind]++
          if (r.kind === 'solved') {
            expectCompletion(size, path, r)
            continue
          }
          // No completion: the walk-back names an earlier position that has one.
          expect(r.back).not.toBeNull()
          const back = r.back!
          expect(back.exact).toBe(true)
          expect(back.moves).toBeGreaterThanOrEqual(1)
          expect(back.moves).toBeLessThanOrEqual(len)
          const earlier = path.slice(0, len - back.moves)
          if (earlier.length > 0) expectCompletion(size, earlier, solveTour(size, earlier, BUDGET))
          if (back.moves > 1) {
            const later = path.slice(0, len - back.moves + 1)
            expect(solveTour(size, later, { ...BUDGET, walkBack: false }).kind).toBe('none')
          }
        }
        if (len <= 10) expect(made, `positions of ${len} moves`).toBeGreaterThan(0)
      }
      expect(seen.solved).toBeGreaterThan(0)
      expect(seen.none).toBeGreaterThan(0)
    }, 120_000)
  }

  it('lost positions (dead end or orphan) have no completion and point back to one that does', () => {
    const rand = prng(77)
    let checked = 0
    for (const size of BOARD_SIZES) {
      for (let k = 0; k < 6; k++) {
        const path = randomLoss(size, rand)
        if (path === null) continue
        checked++
        const r = solveTour(size, path, BUDGET)
        expect(r.kind, JSON.stringify(path)).toBe('none')
        if (r.kind !== 'none') continue
        expect(r.back?.exact).toBe(true)
        const earlier = path.slice(0, path.length - r.back!.moves)
        if (earlier.length > 0) expectCompletion(size, earlier, solveTour(size, earlier, BUDGET))
      }
    }
    expect(checked).toBeGreaterThan(10)
  }, 60_000)
})

describe('agrees with plain exhaustive search on small boards', () => {
  it('5x5: tours start only on the 13 dark squares, corners and centre included', () => {
    const starts: number[] = []
    for (let sq = 0; sq < 25; sq++) {
      const exists = oracleComplete(5, [sq]) !== null
      const r = solveTour(5, [sq], BUDGET)
      expect(r.kind === 'solved', `square ${sq}`).toBe(exists)
      if (exists) {
        starts.push(sq)
        expectCompletion(5, [sq], r)
      } else {
        // A light square: no tour can start there, so the answer is "start again".
        expect(r).toMatchObject({ kind: 'none', reason: 'parity', back: { moves: 1, exact: true } })
      }
      expect(startColourOk(5, sq)).toBe(isDark(5, sq))
    }
    expect(starts).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24])
    expect(starts).toContain(0) // corner
    expect(starts).toContain(12) // centre
    expect(solveTour(5, [1], BUDGET)).toMatchObject({ kind: 'none', reason: 'parity' })
  }, 60_000)

  it('5x5: from the corner, the centre and an edge square, every second move is solvable exactly when the oracle says so', () => {
    for (const start of [0, 12, 2]) {
      for (const second of neighbors(5, start)) {
        const path = [start, second]
        const exists = oracleComplete(5, path) !== null
        const r = solveTour(5, path, BUDGET)
        expect(r.kind === 'solved', JSON.stringify(path)).toBe(exists)
        if (exists) expectCompletion(5, path, r)
      }
    }
  })

  it('5x5 and 6x6 random positions: a completion is found exactly when one exists, and the walk-back matches', () => {
    const rand = prng(4242)
    const cases: Array<[number, number, number]> = [[5, 3, 25], [5, 5, 25], [5, 10, 25], [5, 15, 10], [6, 10, 15], [6, 14, 20], [6, 20, 15]]
    let compared = 0
    for (const [size, len, count] of cases) {
      for (let made = 0, tries = 0; made < count && tries < 5000; tries++) {
        const path = randomPlay(size, len, rand)
        if (path === null) continue
        made++
        compared++
        const exists = oracleComplete(size, path) !== null
        const r = solveTour(size, path, BUDGET)
        expect(r.kind === 'solved' ? true : r.kind === 'none' ? false : 'unknown', JSON.stringify(path)).toBe(exists)
        if (r.kind === 'solved') expectCompletion(size, path, r)
        if (r.kind === 'none' && size === 5) {
          // The oracle's own walk back: the longest prefix that still has a completion.
          let longest = 0
          for (let k = path.length - 1; k >= 1; k--) {
            if (oracleComplete(size, path.slice(0, k)) !== null) {
              longest = k
              break
            }
          }
          expect(r.back, JSON.stringify(path)).toEqual({ moves: path.length - longest, exact: true })
        }
      }
    }
    expect(compared).toBeGreaterThan(100)
  }, 120_000)
})

describe('input and budget', () => {
  it('rejects boards and paths the game cannot produce', () => {
    expect(() => solveTour(4, [])).toThrow(RangeError)
    expect(() => solveTour(9, [])).toThrow(RangeError)
    expect(() => solveTour(8, [64])).toThrow(RangeError)
    expect(() => solveTour(8, [0, 17, 0])).toThrow(RangeError)
    expect(() => solveTour(8, [0, 1])).toThrow(RangeError)
  })

  it('stops at its node budget and answers "unknown", never a guess', () => {
    const r = solveTour(8, SLOW_8X8_POSITION, { maxNodes: 20_000, timeMs: 600_000 })
    expect(r.kind).toBe('unknown')
    expect(r.nodes).toBeLessThanOrEqual(20_000)
  })

  it('stops at its time budget (checked against an injected clock)', () => {
    let clock = 0
    const progress: number[] = []
    const r = solveTour(8, SLOW_8X8_POSITION, { timeMs: 500, now: () => (clock += 1), onProgress: (p) => progress.push(p.ms) })
    expect(r.kind).toBe('unknown')
    expect(r.ms).toBeGreaterThanOrEqual(500)
    expect(r.ms).toBeLessThan(505)
    expect(progress.length).toBeGreaterThan(0)
  })

  it('without a walk-back, a no-completion answer carries no back information', () => {
    const r = solveTour(5, [0, 7, 4], { ...BUDGET, walkBack: false })
    if (r.kind === 'none') expect(r.back).toBeNull()
    else expect(r.kind).toBe('solved')
  })
})
