// Knight's tour completion solver.
//
// Given a board size and the moves already made, either finds a completion
// (every remaining square visited exactly once by knight moves) or proves that
// none exists. Pure and synchronous; the UI runs it in a Web Worker.
//
// Method:
// - Depth-first search ordered by Warnsdorff's rule (fewest onward moves first).
//   The first run breaks ties by distance from the board centre (farthest
//   first, Roth's rule) and then the fixed move order; restarts break ties at
//   random.
// - Sound pruning after every move. Each check is a necessary condition for a
//   completion to exist, so pruning never loses a solution:
//     * the knight has a way in to the unvisited squares;
//     * while more than one square is left, every unvisited square still has
//       an unvisited neighbour;
//     * at most one unvisited square is a dead end (one way in): only the last
//       square of a tour can be, and it must be the colour the last square has
//       to be (knight moves alternate colours, so that colour is fixed);
//     * the unvisited squares are all connected to the knight;
//     * for a closed tour (or the reversed search below), every unvisited square
//       needs two ways in, counting the square the path must finish next to;
//     * forced edges: a square with exactly two ways in must use both (only the
//       last square of an open tour may leave one unused). No square can take
//       more path edges than it has room for (two; one for the knight's square
//       and for the square the path must finish next to), forced edges cannot
//       close a loop, and they cannot join the knight to the finishing square
//       before the chain covers every square. In an open search the end of the
//       tour may break one such conflict, so it must be one of the squares
//       involved.
// - Forced end: once the possible end squares are known (a dead end, or the
//   forced-edge rule above), every completion must finish on one of them, so
//   the rest is searched backwards, from each candidate end to the knight.
//   This turns a hard "reach this exact square last" search into the much
//   easier "finish next to the knight" one (the same shape as a closed tour).
// - A table of positions already proved to have no completion, so the same
//   sub-problem (visited squares + knight square) is never searched twice.
// - Restarts with doubling node caps and randomized tie-breaks, so one bad early
//   choice cannot trap the search in a huge hopeless subtree. Every run is a
//   complete search cut off at its cap; a run that ends inside its cap is
//   exhaustive, so a "none" answer is a proof.
// - A colour (parity) check: on odd boards a tour has to start on the majority
//   (corner) colour.
// - Budget: wall-clock time and/or node count. When it runs out the answer is
//   "unknown", never a guess.

import { neighbors, squareCount } from '../game/rules'

export type TourPreference = 'any' | 'closed'

export interface SolveOptions {
  /** Wall-clock budget in milliseconds (default 3000). */
  timeMs?: number
  /** Search-node budget (default unlimited). */
  maxNodes?: number
  /** 'closed': look for a tour that ends a knight's move from its start first, then any tour. */
  prefer?: TourPreference
  /** Seed for the randomized restarts. With a node budget (or a time budget never reached) the same seed gives the same answer. */
  seed?: number
  /** After proving no completion, find how many moves back the last solvable position was (default true). */
  walkBack?: boolean
  onProgress?: (progress: SolveProgress) => void
  /** Clock in milliseconds, injectable for tests (default performance.now). */
  now?: () => number
}

export interface SolveProgress {
  nodes: number
  ms: number
  stage: 'search' | 'walk-back'
}

/** How far back the last position that still had a completion was. */
export interface BackInfo {
  /** Moves to undo. Equals the number of moves made when only a fresh start works. */
  moves: number
  /** False when the budget ran out first; the true answer is then at least `moves`. */
  exact: boolean
}

interface Stats {
  nodes: number
  ms: number
}

export type SolveResult =
  | ({ kind: 'solved'; moves: number[]; closed: boolean } & Stats)
  | ({ kind: 'none'; reason: 'parity' | 'search'; back: BackInfo | null } & Stats)
  | ({ kind: 'unknown' } & Stats)

/** Square the solver starts from on an empty board: a corner (the majority colour on odd boards). */
export const EMPTY_BOARD_START = 0

const FIRST_RUN_CAP = 4000

class Abort {
  constructor(readonly global: boolean) {}
}

// ---------------------------------------------------------------------------
// Table of positions proved to have no completion: open addressing over shared
// typed arrays. Each table instance has its own generation tag, so instances
// never see each other's entries; an entry overwritten by another instance only
// costs a re-search, never a wrong answer.

// 2^21 slots of 12 bytes (24 MB): the hardest positions seen fill a 2^20 table.
const MEMO_CAP = 1 << 21
const MEMO_MASK = MEMO_CAP - 1
const MEMO_LIMIT = Math.floor(MEMO_CAP * 0.6)
const KEY_BITS = 13
const MAX_GEN = (1 << (31 - KEY_BITS)) - 1
let memoLo: Int32Array | null = null
let memoHi: Int32Array | null = null
let memoTag: Int32Array | null = null
let memoGen = 0

class FailMemo {
  private readonly gen: number
  private count = 0
  private readonly lo: Int32Array
  private readonly hi: Int32Array
  private readonly tag: Int32Array

  constructor() {
    if (memoLo === null || memoHi === null || memoTag === null || memoGen >= MAX_GEN) {
      memoLo = new Int32Array(MEMO_CAP)
      memoHi = new Int32Array(MEMO_CAP)
      memoTag = new Int32Array(MEMO_CAP)
      memoGen = 0
    }
    this.lo = memoLo
    this.hi = memoHi
    this.tag = memoTag
    this.gen = ++memoGen
  }

  private static home(lo: number, hi: number, key: number): number {
    let h = Math.imul(lo, 0x9e3779b1) ^ Math.imul(hi ^ Math.imul(key, 0x27d4eb2f), 0x85ebca77)
    h ^= h >>> 15
    h = Math.imul(h, 0x2c1b3c6d)
    h ^= h >>> 12
    return h & MEMO_MASK
  }

  has(lo: number, hi: number, key: number): boolean {
    const want = (this.gen << KEY_BITS) | key
    for (let s = FailMemo.home(lo, hi, key); ; s = (s + 1) & MEMO_MASK) {
      const t = this.tag[s]!
      if (t >> KEY_BITS !== this.gen) return false
      if (t === want && this.lo[s] === lo && this.hi[s] === hi) return true
    }
  }

  add(lo: number, hi: number, key: number): void {
    if (this.count >= MEMO_LIMIT) return
    for (let s = FailMemo.home(lo, hi, key); ; s = (s + 1) & MEMO_MASK) {
      if (this.tag[s]! >> KEY_BITS !== this.gen) {
        this.tag[s] = (this.gen << KEY_BITS) | key
        this.lo[s] = lo
        this.hi[s] = hi
        this.count++
        return
      }
    }
  }
}

// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Outcome = 'found' | 'none' | 'budget'

interface EngineOptions {
  timeMs: number
  maxNodes: number
  now: () => number
  onProgress: ((p: SolveProgress) => void) | undefined
}

class Engine {
  readonly count: number
  /** Neighbour table: square * 8 + k. */
  private readonly nb: Int8Array
  private readonly nc: Uint8Array
  /** Squared distance from the centre, times 4 so it is an integer. */
  private readonly roth: Int32Array
  /** Square colour, 0 or 1. */
  private readonly colour: Uint8Array
  private readonly maxRoth: number
  private readonly visited: Uint8Array
  /** Unvisited neighbours of each square. */
  private readonly deg: Uint8Array
  /** Visit order. From `reverseAt` on, the squares are the reversed tail of the tour. */
  readonly path: Int8Array
  len = 0
  private remaining: number
  // Visited squares as a 64-bit mask (squares 0-31 and 32-63).
  private lo = 0
  private hi = 0
  // Unvisited squares as a doubly linked list; the head sentinel is `count`.
  private readonly next: Int16Array
  private readonly prev: Int16Array
  private readonly mark: Int32Array
  private stamp = 0
  private readonly queue: Int8Array
  private readonly cands: Int8Array
  private readonly keys: Float64Array

  /** Square the path has to finish next to (-1: none), and its neighbours. */
  private sink = -1
  private readonly sinkAdj: Uint8Array
  /** Forward search only: the tour must end next to its start square. */
  private closed = false
  /** Index in `path` where the reversed search began (-1: searching forwards). */
  private reverseAt = -1
  /** Possible end squares found by the last feasible() call (forward search only). */
  private readonly endBuf: Int8Array
  private endCount = 0
  /** Forced next move found by the last feasible() call (-1: none). */
  private forcedNext = -1
  /** Ways in of each unvisited square, as computed by the last feasible() call. */
  private readonly ways: Uint8Array
  /** Union-find over forced edges, and forced-edge counts (forcedEdges). */
  private readonly uf: Int16Array
  private readonly ufSize: Int16Array
  private readonly ufMark: Int32Array
  private ufStamp = 0
  private readonly edgeCount: Uint8Array
  private readonly edgeMark: Int32Array

  memo: FailMemo | null = null
  private random: (() => number) | null = null
  nodes = 0
  private runLimit = 0
  private readonly maxNodes: number
  // Budget of the current run() call: all that is left, or a share of it.
  private runMaxNodes = 0
  private runDeadline = 0
  private readonly deadline: number
  private readonly clock: () => number
  private readonly startedAt: number
  private lastProgress: number
  private readonly onProgress: ((p: SolveProgress) => void) | undefined
  stage: SolveProgress['stage'] = 'search'

  constructor(size: number, opts: EngineOptions) {
    const n = squareCount(size)
    this.count = n
    this.nb = new Int8Array(n * 8)
    this.nc = new Uint8Array(n)
    this.roth = new Int32Array(n)
    this.colour = new Uint8Array(n)
    this.visited = new Uint8Array(n)
    this.deg = new Uint8Array(n)
    this.path = new Int8Array(n)
    this.next = new Int16Array(n + 1)
    this.prev = new Int16Array(n + 1)
    this.mark = new Int32Array(n)
    this.queue = new Int8Array(n)
    this.cands = new Int8Array((n + 1) * 8)
    this.keys = new Float64Array(8)
    this.sinkAdj = new Uint8Array(n)
    this.endBuf = new Int8Array(n)
    this.uf = new Int16Array(n)
    this.ufSize = new Int16Array(n)
    this.ufMark = new Int32Array(n)
    this.edgeCount = new Uint8Array(n)
    this.edgeMark = new Int32Array(n)
    this.ways = new Uint8Array(n)
    let maxRoth = 0
    for (let s = 0; s < n; s++) {
      const ns = neighbors(size, s)
      this.nc[s] = ns.length
      this.deg[s] = ns.length
      ns.forEach((t, k) => { this.nb[s * 8 + k] = t })
      const dr = 2 * Math.floor(s / size) - (size - 1)
      const dc = 2 * (s % size) - (size - 1)
      this.roth[s] = dr * dr + dc * dc
      this.colour[s] = (Math.floor(s / size) + (s % size)) & 1
      maxRoth = Math.max(maxRoth, this.roth[s]!)
    }
    this.maxRoth = maxRoth
    // head (= n) -> 0 -> 1 -> ... -> n-1 -> head
    for (let s = 0; s < n; s++) {
      this.next[s] = s + 1
      this.prev[s] = s === 0 ? n : s - 1
    }
    this.next[n] = 0
    this.prev[n] = n - 1
    this.remaining = n
    this.maxNodes = opts.maxNodes
    this.clock = opts.now
    this.startedAt = opts.now()
    this.deadline = this.startedAt + opts.timeMs
    this.lastProgress = this.startedAt
    this.onProgress = opts.onProgress
  }

  elapsed(): number {
    return this.clock() - this.startedAt
  }

  adjacent(a: number, b: number): boolean {
    for (let k = 0; k < this.nc[a]!; k++) if (this.nb[a * 8 + k] === b) return true
    return false
  }

  visit(s: number): void {
    this.visited[s] = 1
    const base = s * 8
    for (let k = 0; k < this.nc[s]!; k++) this.deg[this.nb[base + k]!]!--
    this.next[this.prev[s]!] = this.next[s]!
    this.prev[this.next[s]!] = this.prev[s]!
    this.remaining--
    this.path[this.len++] = s
    if (s < 32) this.lo ^= 1 << s
    else this.hi ^= 1 << (s - 32)
  }

  unvisit(): void {
    const s = this.path[--this.len]!
    this.visited[s] = 0
    const base = s * 8
    for (let k = 0; k < this.nc[s]!; k++) this.deg[this.nb[base + k]!]!++
    // Dancing-links reinsert: valid because squares come back in reverse order.
    this.next[this.prev[s]!] = s
    this.prev[this.next[s]!] = s
    this.remaining++
    if (s < 32) this.lo ^= 1 << s
    else this.hi ^= 1 << (s - 32)
  }

  private setSink(square: number): void {
    this.sinkAdj.fill(0)
    this.sink = square
    if (square < 0) return
    for (let k = 0; k < this.nc[square]!; k++) this.sinkAdj[this.nb[square * 8 + k]!] = 1
  }

  /** Forward search mode: closed (end next to the start square) or any tour. */
  setClosed(closed: boolean): void {
    this.closed = closed
    this.reverseAt = -1
    this.setSink(closed ? this.path[0]! : -1)
  }

  /** The finished tour in playing order. */
  tour(): number[] {
    const all = Array.from(this.path.subarray(0, this.len))
    if (this.reverseAt < 0) return all
    return [...all.slice(0, this.reverseAt), ...all.slice(this.reverseAt).reverse()]
  }

  /**
   * Necessary conditions for the position to have a completion (see the file
   * header). Also records the possible end squares and any forced next move.
   */
  feasible(): boolean {
    this.endCount = 0
    this.forcedNext = -1
    const u = this.remaining
    const cur = this.path[this.len - 1]!
    const sink = this.sink
    if (u === 0) return sink < 0 || this.adjacent(cur, sink)
    const head = this.count
    const stamp = ++this.stamp
    const mark = this.mark
    const base = cur * 8
    for (let k = 0; k < this.nc[cur]!; k++) mark[this.nb[base + k]!] = stamp
    // The u squares left alternate colours starting with the opposite of cur's.
    const lastColour = this.colour[cur]! ^ (u & 1)
    let ends = 0
    let entry = false
    let exit = false
    for (let s = this.next[head]!; s !== head; s = this.next[s]!) {
      const d = this.deg[s]!
      if (d === 0 && u > 1) return false
      let ways = d
      if (mark[s] === stamp) {
        entry = true
        ways++
      }
      if (ways <= 1) {
        if (this.colour[s] !== lastColour || ++ends > 1) return false
        this.endBuf[0] = s
        this.endCount = 1
      }
      if (sink >= 0) {
        if (this.sinkAdj[s] === 1) {
          exit = true
          ways++
        }
        if (ways < 2) return false
      }
      this.ways[s] = ways
    }
    if (!entry) return false
    if (sink >= 0 && !exit) return false
    if (u <= 2) return true
    // Every unvisited square must be reachable from the knight.
    const seen = ++this.stamp
    const queue = this.queue
    let qh = 0
    let qt = 0
    for (let k = 0; k < this.nc[cur]!; k++) {
      const t = this.nb[base + k]!
      if (this.visited[t] === 0) {
        mark[t] = seen
        queue[qt++] = t
      }
    }
    while (qh < qt) {
      const s = queue[qh++]!
      const sb = s * 8
      for (let k = 0; k < this.nc[s]!; k++) {
        const t = this.nb[sb + k]!
        if (this.visited[t] === 0 && mark[t] !== seen) {
          mark[t] = seen
          queue[qt++] = t
        }
      }
    }
    if (qt !== u) return false
    return sink === cur || this.forcedEdges(cur, lastColour, ends === 1)
  }

  /** The forced-edge rule (see the file header); part of feasible(). */
  private forcedEdges(cur: number, lastColour: number, endKnown: boolean): boolean {
    const head = this.count
    const sink = this.sink
    // Open search with the end still free: the end may leave one forced edge unused.
    const strict = sink >= 0 || endKnown
    const stamp = ++this.stamp
    this.ufStamp = stamp
    const count = this.edgeCount
    const counted = this.edgeMark
    const uf = this.uf
    const size = this.ufSize
    let over = -1 // the one square with a forced edge too many (open search only)
    let loop = -1 // a square on the one loop of forced edges (open search only)
    let atCur = 0
    let curForcer = -1
    let atSink = 0
    for (let s = this.next[head]!; s !== head; s = this.next[s]!) {
      if (this.ways[s] !== 2) continue
      const base = s * 8
      for (let k = 0; k < this.nc[s]!; k++) {
        const t = this.nb[base + k]!
        const open = this.visited[t] === 0
        if (!open && t !== cur && t !== sink) continue
        // Room for forced edges: two at an unvisited square, one at the knight and at the sink.
        if (t === cur) {
          curForcer = s
          if (++atCur > 1) {
            if (strict || atCur > 2 || (over >= 0 && over !== cur)) return false
            over = cur
          }
        } else if (t === sink) {
          if (++atSink > 1) return false
        } else {
          const c = counted[t] === stamp ? count[t]! + 1 : 1
          counted[t] = stamp
          count[t] = c
          if (c > 2) {
            if (strict || c > 3 || (over >= 0 && over !== t)) return false
            over = t
          }
        }
        // Forced edges must not close a loop (a path has none).
        if (open && this.ways[t] === 2 && t < s) continue // the same edge, forced from t's side
        const a = this.find(s)
        const b = this.find(t)
        if (a === b) {
          if (strict || loop >= 0) return false
          loop = s
        } else if (size[a]! < size[b]!) {
          uf[a] = b
          size[b] = size[b]! + size[a]!
        } else {
          uf[b] = a
          size[a] = size[a]! + size[b]!
        }
      }
    }
    if (sink >= 0) {
      // A forced chain from the knight to the sink must cover every square.
      const root = this.find(cur)
      if (root === this.find(sink) && size[root]! < this.remaining + 2) return false
      if (atCur === 1) this.forcedNext = curForcer
      return true
    }
    if (over < 0 && loop < 0) return true
    // The end must break the over-full square and/or the loop: it is a square with
    // two ways in, forcing `over` and on the loop, of the last square's colour.
    const loopRoot = loop < 0 ? -1 : this.find(loop)
    let c = 0
    for (let s = this.next[head]!; s !== head; s = this.next[s]!) {
      if (this.ways[s] !== 2 || this.colour[s] !== lastColour) continue
      if (over >= 0 && !this.adjacent(s, over)) continue
      if (loopRoot >= 0 && this.find(s) !== loopRoot) continue
      this.endBuf[c++] = s
    }
    this.endCount = c
    return c > 0
  }

  /** Union-find root, with lazy reset per forcedEdges() call. */
  private find(v: number): number {
    const uf = this.uf
    if (this.ufMark[v] !== this.ufStamp) {
      this.ufMark[v] = this.ufStamp
      uf[v] = v
      this.ufSize[v] = 1
      return v
    }
    while (uf[v] !== v) {
      uf[v] = uf[uf[v]!]!
      v = uf[v]!
    }
    return v
  }

  private tick(): void {
    if (this.nodes >= this.runLimit) throw new Abort(this.nodes >= this.runMaxNodes)
    if ((this.nodes & 1023) === 0) {
      const now = this.clock()
      if (now >= this.runDeadline) throw new Abort(true)
      if (this.onProgress !== undefined && now - this.lastProgress >= 100) {
        this.lastProgress = now
        this.onProgress({ nodes: this.nodes, ms: now - this.startedAt, stage: this.stage })
      }
    }
  }

  budgetLeft(): boolean {
    return this.nodes < this.maxNodes && this.clock() < this.deadline
  }

  /** Call only straight after a feasible() that returned true for this position. */
  private search(): boolean {
    if (this.remaining === 0) return true
    const cur = this.path[this.len - 1]!
    const memo = this.memo
    // A reversed sub-problem also depends on the square it must finish next to.
    const key = this.reverseAt < 0 ? cur : (this.sink + 1) * 64 + cur
    if (memo !== null && memo.has(this.lo, this.hi, key)) return false

    if (this.reverseAt < 0 && this.endCount > 0 && this.remaining > 2) {
      // Every completion ends on one of these squares: search from each back to the knight.
      const ends = Array.from(this.endBuf.subarray(0, this.endCount))
      const savedSink = this.sink
      for (const end of ends) {
        this.reverseAt = this.len
        this.setSink(cur)
        this.nodes++
        this.tick()
        this.visit(end)
        if (this.feasible() && this.search()) return true
        this.unvisit()
      }
      this.reverseAt = -1
      this.setSink(savedSink)
      if (memo !== null) memo.add(this.lo, this.hi, key)
      return false
    }
    const forced = this.forcedNext

    // Candidate moves, ordered by Warnsdorff's rule and then the tie-break.
    const base = this.len * 8
    const cands = this.cands
    const keys = this.keys
    const rand = this.random
    let m = 0
    const nbase = cur * 8
    for (let k = 0; k < this.nc[cur]!; k++) {
      const t = this.nb[nbase + k]!
      if (this.visited[t] === 1 || (forced >= 0 && t !== forced)) continue
      const tie = rand === null ? (this.maxRoth - this.roth[t]!) * 16 + k : rand() * 4000
      const order = this.deg[t]! * 4096 + tie
      let i = m++
      while (i > 0 && keys[i - 1]! > order) {
        keys[i] = keys[i - 1]!
        cands[base + i] = cands[base + i - 1]!
        i--
      }
      keys[i] = order
      cands[base + i] = t
    }
    for (let i = 0; i < m; i++) {
      this.nodes++
      this.tick()
      this.visit(cands[base + i]!)
      if (this.feasible() && this.search()) return true
      this.unvisit()
    }
    if (memo !== null) memo.add(this.lo, this.hi, key)
    return false
  }

  /**
   * Search from the current position. Restarts with doubling node caps until a
   * run either finds a completion or finishes (a proof that there is none), or
   * the budget ends. `share` is the fraction of the remaining budget this call
   * may use. On 'found' the tour is left in place (see tour()); otherwise the
   * position is restored.
   */
  run(seed: number, share = 1): Outcome {
    const rootLen = this.len
    const now = this.clock()
    this.runDeadline = now + (this.deadline - now) * share
    this.runMaxNodes = this.nodes + (this.maxNodes - this.nodes) * share
    const closed = this.closed
    this.setClosed(closed)
    if (!this.feasible()) return 'none'
    let cap = FIRST_RUN_CAP
    const rng = mulberry32(seed)
    for (let attempt = 0; ; attempt++) {
      this.random = attempt === 0 ? null : rng
      this.runLimit = Math.min(this.runMaxNodes, this.nodes + cap)
      try {
        return this.search() ? 'found' : 'none'
      } catch (e) {
        if (!(e instanceof Abort)) throw e
        while (this.len > rootLen) this.unvisit()
        this.setClosed(closed)
        if (e.global || this.nodes >= this.runMaxNodes || this.clock() >= this.runDeadline) return 'budget'
        this.feasible()
        cap *= 2
      }
    }
  }
}

function checkPath(size: number, path: readonly number[]): void {
  if (!Number.isInteger(size) || size < 5 || size > 8) throw new RangeError(`unsupported board size ${size}`)
  const n = squareCount(size)
  const seen = new Set<number>()
  path.forEach((s, i) => {
    if (!Number.isInteger(s) || s < 0 || s >= n) throw new RangeError(`square ${s} is off the board`)
    if (seen.has(s)) throw new RangeError(`square ${s} is visited twice`)
    const prev = path[i - 1]
    if (prev !== undefined && !neighbors(size, prev).includes(s)) throw new RangeError(`move ${i + 1} is not a knight move`)
    seen.add(s)
  })
}

/** True when a tour may start on `square`: on odd boards only the majority (corner) colour can. */
export function startColourOk(size: number, square: number): boolean {
  if (size % 2 === 0) return true
  return (Math.floor(square / size) + (square % size)) % 2 === 0
}

/**
 * Complete the tour from `path` (the moves made so far, any length), or prove
 * that no completion exists. In a solved result `moves` are the squares to add
 * to `path`, in order (on an empty board this includes the start square).
 */
export function solveTour(size: number, path: readonly number[], options: SolveOptions = {}): SolveResult {
  checkPath(size, path)
  const engine = new Engine(size, {
    timeMs: options.timeMs ?? 3000,
    maxNodes: options.maxNodes ?? Number.POSITIVE_INFINITY,
    now: options.now ?? (() => performance.now()),
    onProgress: options.onProgress,
  })
  const seed = options.seed ?? 1
  const stats = (): Stats => ({ nodes: engine.nodes, ms: engine.elapsed() })
  const n = engine.count
  const root = path.length === 0 ? [EMPTY_BOARD_START] : path
  for (const s of root) engine.visit(s)
  const solved = (): SolveResult => {
    const tour = engine.tour()
    const closed = engine.adjacent(tour[n - 1]!, tour[0]!)
    return { kind: 'solved', moves: tour.slice(path.length), closed, ...stats() }
  }

  if (path.length === n) return solved()
  if (!startColourOk(size, root[0]!)) {
    return { kind: 'none', reason: 'parity', back: { moves: path.length, exact: true }, ...stats() }
  }

  // Closed tours do not exist on odd boards (two colours, odd number of squares).
  // The closed attempt gets at most half the budget, so any tour can still be found.
  if (options.prefer === 'closed' && size % 2 === 0) {
    engine.setClosed(true)
    engine.memo = new FailMemo()
    if (engine.run(seed, 0.5) === 'found') return solved()
    engine.setClosed(false)
  }

  engine.memo = new FailMemo()
  const outcome = engine.run(seed)
  if (outcome === 'found') return solved()
  if (outcome === 'budget') return { kind: 'unknown', ...stats() }

  // No completion from here. Walk back through the earlier positions to find
  // the last one that still had a completion, while the budget lasts.
  let back: BackInfo | null = null
  if (options.walkBack !== false) {
    engine.stage = 'walk-back'
    back = { moves: path.length, exact: true }
    while (engine.len > 1) {
      engine.unvisit()
      const prefix = engine.len
      const r = engine.budgetLeft() ? engine.run(seed) : 'budget'
      if (r !== 'none') {
        back = { moves: path.length - prefix, exact: r === 'found' }
        break
      }
    }
  }
  return { kind: 'none', reason: 'search', back, ...stats() }
}
