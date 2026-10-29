// Test and benchmark helpers for the solver. Deliberately independent of
// solver.ts: the oracle below uses none of its pruning, ordering or tables.

import { applyMove, legalMoves, neighbors, squareCount, status } from '../game/rules'

/**
 * An 8x8 position the solver cannot decide quickly: it has no completion, but
 * proving that takes about 1.8 million search nodes, around 3 seconds (corner 0
 * is a forced end and the search backwards from it is long). The budget tests
 * need one; if a better solver ever decides it fast, replace it with another
 * slow position.
 */
export const SLOW_8X8_POSITION: readonly number[] = [19, 2, 17, 11, 26, 32, 49, 34, 51, 41]

/** Deterministic PRNG (mulberry32). */
export function prng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Why `tour` is not a full knight's tour of the board, or null if it is one. */
export function tourError(size: number, tour: readonly number[]): string | null {
  const n = squareCount(size)
  if (tour.length !== n) return `length ${tour.length}, expected ${n}`
  const seen = new Set<number>()
  for (const [i, s] of tour.entries()) {
    if (!Number.isInteger(s) || s < 0 || s >= n) return `move ${i + 1}: square ${s} is off the board`
    if (seen.has(s)) return `move ${i + 1}: square ${s} visited twice`
    seen.add(s)
    const prev = tour[i - 1]
    if (prev !== undefined && !neighbors(size, prev).includes(s)) return `move ${i + 1}: ${prev} -> ${s} is not a knight move`
  }
  return null
}

export function isClosedTour(size: number, tour: readonly number[]): boolean {
  const first = tour[0]
  const last = tour[tour.length - 1]
  return first !== undefined && last !== undefined && neighbors(size, last).includes(first)
}

/**
 * Plays random legal moves under the game's rules (the game ends on a win,
 * a dead end or an orphan) until `length` moves are made or the game ends.
 * Returns null if the game ended first.
 */
export function randomPlay(size: number, length: number, rand: () => number): number[] | null {
  let path: readonly number[] = []
  while (path.length < length) {
    if (status(size, path) !== 'playing') return null
    const options = legalMoves(size, path)
    const pick = options[Math.floor(rand() * options.length)]
    if (pick === undefined) return null
    path = applyMove(size, path, pick)
  }
  return [...path]
}

/**
 * Exhaustive search for a completion of `path`: plain depth-first search over
 * legal knight moves with a set of failed (visited set, square) states.
 * No pruning, no move ordering. Exact but exponential: boards up to 6x6 only.
 * Returns a full tour, or null when no completion exists. With `closed`, only
 * tours whose last square is a knight's move from the first count.
 */
export function oracleComplete(size: number, path: readonly number[], closed = false): number[] | null {
  if (size > 6) throw new RangeError('the oracle is for boards up to 6x6')
  const n = squareCount(size)
  if (path.length === 0) {
    for (let s = 0; s < n; s++) {
      const t = oracleComplete(size, [s], closed)
      if (t !== null) return t
    }
    return null
  }
  const route = [...path]
  const seen = new Uint8Array(n)
  // The visited set as a number (sum of 2^square): at most 2^36, exact in a double.
  let mask = 0
  for (const s of route) {
    seen[s] = 1
    mask += 2 ** s
  }
  const failed = new Set<number>()
  const first = route[0]!
  const dfs = (cur: number): boolean => {
    if (route.length === n) return !closed || neighbors(size, cur).includes(first)
    const key = mask * 64 + cur
    if (failed.has(key)) return false
    for (const t of neighbors(size, cur)) {
      if (seen[t] === 1) continue
      seen[t] = 1
      mask += 2 ** t
      route.push(t)
      if (dfs(t)) return true
      route.pop()
      mask -= 2 ** t
      seen[t] = 0
    }
    failed.add(key)
    return false
  }
  return dfs(route[route.length - 1]!) ? route : null
}
