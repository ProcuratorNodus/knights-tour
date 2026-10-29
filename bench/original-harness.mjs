// Headless harness for the ORIGINAL 2015 game.js solvers (8x8 only).
//
// Loads game.js unmodified into a Node/Bun `vm` context with a stand-in for
// jQuery and underscore (DOM calls become no-ops), replays a player's moves
// through the original Move(), then runs the two original solvers' route
// computation without their setInterval animation:
//
//   tableSolve  - the dead branch of AutoMagically(): GetKtAutoMoves(first square),
//                 board reset, replay of the stored tour.
//   heuristicSolve - AutoMagically2(): BackTrackTrapsAndOrphans + GetDynamicAutoMoves.
//
// The original file is not part of this repo; pass its path in.

import { readFileSync } from 'node:fs'
import vm from 'node:vm'

/** Chainable no-op stand-in for a jQuery selection. */
function selection(selector) {
  const sel = {
    attr(name) {
      if (name === 'id' && typeof selector === 'string' && selector.startsWith('#')) return selector.slice(1)
      if (name === 'hostname') return 'localhost'
      return undefined
    },
    css(arg) { return typeof arg === 'string' ? '#ffffff' : sel },
    html(arg) { return arg === undefined ? '' : sel },
    position() { return { top: 0, left: 0 } },
    is() { return false },
    width() { return 800 },
    height() { return 800 },
  }
  for (const m of ['find', 'first', 'prop', 'show', 'hide', 'addClass', 'removeClass', 'animate',
    'click', 'hover', 'resize', 'ready', 'parent']) sel[m] = () => sel
  return sel
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function loadOriginal(gameJsPath, seed = 1) {
  const source = readFileSync(gameJsPath, 'utf8')
  const $ = (s) => selection(s)
  $.inArray = (v, arr) => (arr ? arr.indexOf(v) : -1)
  $.cssHooks = {}
  const context = {
    $,
    location: {},
    window: {},
    document: {},
    console,
    setInterval: () => 0,
    clearInterval: () => {},
  }
  vm.createContext(context)
  const rand = mulberry32(seed)
  vm.runInContext('Math.random = __rand', Object.assign(context, { __rand: rand }))
  context._ = {
    random: (min, max) => min + Math.floor(rand() * (max - min + 1)),
    shuffle: (a) => a.slice(),
  }
  vm.runInContext(source, context, { filename: 'game.js' })

  const run = (code) => vm.runInContext(code, context)

  function replay(path) {
    run('ResetBoard(); test = 63;')
    for (const sq of path) {
      context.__sq = String(sq)
      run('Move(__sq)')
    }
  }

  return {
    /** The 64 stored tours (tour i starts on square i). */
    tours() {
      return run('GetKtAutoMoves(0), ktams').map((t) => t.slice())
    },
    /**
     * AutoMagically() dead branch: always replays the stored tour that starts on the
     * player's FIRST square (the board is reset first). Returns the full replayed route.
     */
    tableSolve(path) {
      if (path.length === 0) return { error: 'no first square (backmove[0] is undefined)' }
      return { route: run(`GetKtAutoMoves(${path[0]})`).slice() }
    },
    /**
     * AutoMagically2() route computation. Returns the route it would animate and how
     * many of the player's moves it silently undid first.
     */
    heuristicSolve(path) {
      replay(path)
      try {
        run('BackTrackTrapsAndOrphans(backmove, moves)')
        const kept = run('backmove.length')
        const route = run('GetDynamicAutoMoves(Array.copy(backmove), backmove.length - 1, Array.copy(moves))')
        return { route: Array.from(route, Number), kept }
      } catch (e) {
        return { error: String(e && e.message ? e.message : e) }
      }
    },
  }
}
