// Pure Knight's Tour rules, ported from the original game.js. A game is a
// board size plus the ordered list of visited square indices (row-major).

export const BOARD_SIZES = [5, 6, 7, 8] as const
export const DEFAULT_SIZE = 8

export type Status = 'playing' | 'won' | 'stuck' | 'orphan'

// Same move order as the original FindMoves.
const OFFSETS: ReadonlyArray<readonly [number, number]> = [
  [-2, 1], [-2, -1], [2, 1], [2, -1], [1, 2], [-1, 2], [1, -2], [-1, -2],
]

export function squareCount(size: number): number {
  return size * size
}

/** 1-based [row, column], matching the original's location read-out. */
export function coords(size: number, index: number): [number, number] {
  return [Math.floor(index / size) + 1, (index % size) + 1]
}

export function label(size: number, index: number): string {
  const [r, c] = coords(size, index)
  return `${r},${c}`
}

export function isDark(size: number, index: number): boolean {
  const [r, c] = coords(size, index)
  return (r + c) % 2 === 0
}

export function neighbors(size: number, index: number): number[] {
  const row = Math.floor(index / size)
  const col = index % size
  const out: number[] = []
  for (const [dr, dc] of OFFSETS) {
    const r = row + dr
    const c = col + dc
    if (r >= 0 && r < size && c >= 0 && c < size) out.push(r * size + c)
  }
  return out
}

export function visitedSet(path: readonly number[]): Set<number> {
  return new Set(path)
}

export function current(path: readonly number[]): number | undefined {
  return path[path.length - 1]
}

/** Squares the knight may move to. On an empty board every square is legal ("start anywhere"). */
export function legalMoves(size: number, path: readonly number[]): number[] {
  const cur = current(path)
  if (cur === undefined) return Array.from({ length: squareCount(size) }, (_, i) => i)
  const seen = visitedSet(path)
  return neighbors(size, cur).filter((n) => !seen.has(n))
}

/**
 * First unvisited square whose every neighbour is already visited (and is not
 * the knight's current square, which could still step onto it), or -1.
 */
export function findOrphan(size: number, path: readonly number[]): number {
  const seen = visitedSet(path)
  const cur = current(path)
  for (let x = 0; x < squareCount(size); x++) {
    if (seen.has(x)) continue
    const ns = neighbors(size, x)
    if (ns.every((n) => seen.has(n) && n !== cur)) return x
  }
  return -1
}

export function status(size: number, path: readonly number[]): Status {
  if (path.length === 0) return 'playing'
  if (path.length === squareCount(size)) return 'won'
  if (legalMoves(size, path).length === 0) return 'stuck'
  if (findOrphan(size, path) !== -1) return 'orphan'
  return 'playing'
}

/**
 * Hint numbers: for each unvisited square reachable from `from`, how many
 * onward moves it would have (excluding visited squares, `from`, and itself).
 */
export function futureCounts(
  size: number,
  path: readonly number[],
  from: number,
): Map<number, number> {
  const seen = visitedSet(path)
  const out = new Map<number, number>()
  for (const c of neighbors(size, from)) {
    if (seen.has(c)) continue
    const count = neighbors(size, c).filter((k) => !seen.has(k) && k !== from && k !== c).length
    out.set(c, count)
  }
  return out
}

/** Returns the new path, or the same path if the move is illegal. */
export function applyMove(size: number, path: readonly number[], index: number): readonly number[] {
  if (status(size, path) !== 'playing') return path
  if (!legalMoves(size, path).includes(index)) return path
  return [...path, index]
}

export function undoMove(path: readonly number[]): readonly number[] {
  return path.slice(0, -1)
}
