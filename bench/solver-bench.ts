// Solver benchmark: solve rates and times by board size and prefix length,
// against the original game.js solvers on 8x8.
//
//   bun bench/solver-bench.ts [path/to/original/game.js]
//
// Settings match the game: the game's budget per solve (SOLVE_BUDGET_MS), walk-back on, default seed.
// Positions:
//   known  - prefixes of known tours (so a completion always exists). 8x8: the
//            64 tours stored in the original game.js. 5x5-7x7: tours from a
//            randomised Warnsdorff walk written here (independent of the solver).
//   random - random legal play under the game rules (the game must still be on
//            when the prefix is reached; the last move may end it).

import { existsSync } from 'node:fs'
import { neighbors, squareCount } from '../src/game/rules'
import { SOLVE_BUDGET_MS } from '../src/solver/client'
import { KNOWN_TOURS } from '../src/solver/knownTours'
import { solveTour, type SolveResult } from '../src/solver/solver'
import { prng, randomPlay, tourError } from '../src/solver/testing'
import { loadOriginal } from './original-harness.mjs'

const BUDGET_MS = SOLVE_BUDGET_MS
const PREFIXES = [0, 1, 3, 5, 10, 20]
const PER_CELL = 200
const ORIGINAL = process.argv[2] ?? 'original/game.js'

function warnsdorffTour(size: number, rand: () => number): number[] | null {
  const n = squareCount(size)
  const path = [Math.floor(rand() * n)]
  const seen = new Set(path)
  while (path.length < n) {
    const cur = path[path.length - 1]!
    const options = neighbors(size, cur).filter((t) => !seen.has(t))
    if (options.length === 0) return null
    const onward = (t: number) => neighbors(size, t).filter((u) => !seen.has(u) && u !== t).length
    const best = Math.min(...options.map(onward))
    const ties = options.filter((t) => onward(t) === best)
    const next = ties[Math.floor(rand() * ties.length)]!
    path.push(next)
    seen.add(next)
  }
  return path
}

function knownTours(size: number, count: number, rand: () => number): number[][] {
  if (size === 8) return KNOWN_TOURS[8]!.map((t) => [...t])
  const out: number[][] = []
  for (let tries = 0; out.length < count && tries < 200_000; tries++) {
    const t = warnsdorffTour(size, rand)
    if (t !== null) out.push(t)
  }
  return out
}

const quantile = (xs: number[], q: number) => {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  return s[Math.min(s.length - 1, Math.floor(q * s.length))]!
}
const pct = (a: number, b: number) => (b === 0 ? '-' : `${((100 * a) / b).toFixed(1)}%`)
const ms = (x: number) => (Number.isNaN(x) ? '-' : x < 10 ? x.toFixed(2) : x.toFixed(0))

interface Row {
  size: number
  len: number
  source: string
  n: number
  solved: number
  none: number
  unknown: number
  backExact: number
  times: number[]
  firstAnswer: number[]
  orig?: { heuristic: number; table: number; solvable: number; heuristicTimes: number[] }
}

const original = existsSync(ORIGINAL) ? loadOriginal(ORIGINAL) : null
const rows: Row[] = []
const rand = prng(20261028)
let invalid = 0

for (const size of [5, 6, 7, 8]) {
  const tours = knownTours(size, PER_CELL, rand)
  for (const source of ['known', 'random'] as const) {
    for (const len of PREFIXES) {
      if (len >= squareCount(size)) continue
      if (len === 0 && source === 'random') continue
      const positions: number[][] = []
      if (source === 'known') {
        if (len === 0) positions.push([])
        else for (const t of tours) positions.push(t.slice(0, len))
      } else {
        for (let tries = 0; positions.length < PER_CELL && tries < 100_000; tries++) {
          const p = randomPlay(size, len, rand)
          if (p !== null) positions.push(p)
        }
      }
      const row: Row = { size, len, source, n: 0, solved: 0, none: 0, unknown: 0, backExact: 0, times: [], firstAnswer: [] }
      if (size === 8 && original !== null) row.orig = { heuristic: 0, table: 0, solvable: 0, heuristicTimes: [] }
      for (const p of positions) {
        row.n++
        const r: SolveResult = solveTour(size, p, { timeMs: BUDGET_MS })
        row.times.push(r.ms)
        const first = solveTour(size, p, { timeMs: BUDGET_MS, walkBack: false })
        row.firstAnswer.push(first.ms)
        if (r.kind === 'solved') {
          row.solved++
          if (tourError(size, [...p, ...r.moves]) !== null) invalid++
        } else if (r.kind === 'none') {
          row.none++
          if (r.back?.exact) row.backExact++
        } else {
          row.unknown++
          process.stderr.write(`undecided ${size}x${size}: ${JSON.stringify(p)}\n`)
        }
        if (row.orig && original && p.length > 0 && r.kind === 'solved') {
          row.orig.solvable++
          const t0 = performance.now()
          const h = original.heuristicSolve(p)
          row.orig.heuristicTimes.push(performance.now() - t0)
          if (!('error' in h) && h.kept === p.length && tourError(8, h.route) === null) row.orig.heuristic++
          const t = original.tableSolve(p)
          if ('route' in t && t.route.slice(0, p.length).every((s: number, i: number) => s === p[i])) row.orig.table++
        }
      }
      rows.push(row)
      process.stderr.write(`${size}x${size} ${source} ${len}: ${row.n} positions\n`)
    }
  }
}

console.log(`Budget ${BUDGET_MS} ms per solve (walk-back included), ${PER_CELL} positions per random cell.`)
console.log(`Invalid completions returned: ${invalid}\n`)
console.log('| Board | Positions | Moves made | n | Has completion | Solved | Proved none | Undecided | Walk-back exact | First answer median ms | Full answer median ms | p95 ms | max ms |')
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|')
for (const r of rows) {
  console.log(
    `| ${r.size}x${r.size} | ${r.source} | ${r.len} | ${r.n} | ${pct(r.solved, r.n)}${r.unknown ? '+' : ''} | ${r.solved} | ${r.none} | ${r.unknown} | ${r.none ? pct(r.backExact, r.none) : '-'} | ${ms(quantile(r.firstAnswer, 0.5))} | ${ms(quantile(r.times, 0.5))} | ${ms(quantile(r.times, 0.95))} | ${ms(Math.max(...r.times))} |`,
  )
}
if (original !== null) {
  console.log('\nOriginal game.js solvers on 8x8, counted on the positions the new solver completed (all of them, 100%):\n')
  console.log('| Positions | Moves made | With completion | AutoMagically2 (heuristic) | Stored-tour replay | AutoMagically2 median ms |')
  console.log('|---|---|---|---|---|---|')
  for (const r of rows) {
    if (!r.orig || r.len === 0) continue
    const o = r.orig
    console.log(`| ${r.source} | ${r.len} | ${o.solvable} | ${pct(o.heuristic, o.solvable)} | ${pct(o.table, o.solvable)} | ${ms(quantile(o.heuristicTimes, 0.5))} |`)
  }
}
