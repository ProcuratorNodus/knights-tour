// UI side of "Solve automagically": runs the solver in a worker, shows its
// progress, then plays the solution onto the board one move at a time.

import { useCallback, useEffect, useRef, useState } from 'react'
import { SOLVE_BUDGET_MS, startSolve, type SolveHandle, type WorkerLike } from './client'
import type { BackInfo, SolveProgress, TourPreference } from './solver'

/** Delay between the solver's moves as they are played onto the board. */
export const STEP_MS = 250

export type SolverNotice =
  | { kind: 'none'; reason: 'parity' | 'search'; back: BackInfo | null }
  | { kind: 'unknown'; ms: number; nodes: number | null }
  | { kind: 'stopped' }
  | { kind: 'failed'; message: string }

export type SolverView =
  | { phase: 'idle' }
  | { phase: 'searching'; progress: SolveProgress | null }
  | { phase: 'playing'; done: number; total: number }

interface Options {
  size: number
  path: readonly number[]
  prefer: TourPreference
  /** Applies one solver move to the game. */
  onMove: (index: number) => void
  createWorker?: () => WorkerLike
}

export function useSolver({ size, path, prefer, onMove, createWorker }: Options) {
  const [view, setView] = useState<SolverView>({ phase: 'idle' })
  // A notice belongs to the position it was given for and disappears once the board changes.
  const [notice, setNotice] = useState<{ notice: SolverNotice; at: readonly number[] } | null>(null)
  const handle = useRef<SolveHandle | null>(null)
  const timer = useRef<number | null>(null)
  const latestPath = useRef(path)
  const move = useRef(onMove)
  useEffect(() => { latestPath.current = path }, [path])
  useEffect(() => { move.current = onMove }, [onMove])

  const clearTimer = () => {
    if (timer.current !== null) window.clearInterval(timer.current)
    timer.current = null
  }

  const play = useCallback((moves: readonly number[]) => {
    let done = 0
    setView({ phase: 'playing', done, total: moves.length })
    timer.current = window.setInterval(() => {
      const next = moves[done]
      if (next !== undefined) move.current(next)
      done++
      if (done >= moves.length) {
        clearTimer()
        setView({ phase: 'idle' })
      } else {
        setView({ phase: 'playing', done, total: moves.length })
      }
    }, STEP_MS)
  }, [])

  const solve = useCallback(() => {
    if (handle.current !== null || timer.current !== null) return
    const at = path
    const show = (n: SolverNotice) => {
      setNotice({ notice: n, at })
      setView({ phase: 'idle' })
    }
    setNotice(null)
    setView({ phase: 'searching', progress: null })
    const h = startSolve(
      { size, path: [...at], timeMs: SOLVE_BUDGET_MS, prefer },
      {
        ...(createWorker === undefined ? {} : { createWorker }),
        onProgress: (progress) => {
          if (handle.current === h) setView({ phase: 'searching', progress })
        },
      },
    )
    handle.current = h
    void h.done.then((outcome) => {
      if (handle.current !== h) return // stopped, or the page moved on
      handle.current = null
      if (outcome.kind === 'stopped') return
      if (outcome.kind === 'timeout') return show({ kind: 'unknown', ms: SOLVE_BUDGET_MS, nodes: null })
      if (outcome.kind === 'failed') return show({ kind: 'failed', message: outcome.message })
      const r = outcome.result
      if (r.kind === 'solved') {
        if (r.moves.length === 0) setView({ phase: 'idle' })
        else play(r.moves)
      } else if (r.kind === 'none') {
        show({ kind: 'none', reason: r.reason, back: r.back })
      } else {
        show({ kind: 'unknown', ms: r.ms, nodes: r.nodes })
      }
    })
  }, [size, path, prefer, createWorker, play])

  const stop = useCallback(() => {
    if (handle.current === null && timer.current === null) return
    handle.current?.stop()
    handle.current = null
    clearTimer()
    setView({ phase: 'idle' })
    setNotice({ notice: { kind: 'stopped' }, at: latestPath.current })
  }, [])

  // Leaving the page (or a hot reload) stops the worker and the playback.
  useEffect(() => () => {
    handle.current?.stop()
    handle.current = null
    clearTimer()
  }, [])

  return {
    view,
    busy: view.phase !== 'idle',
    notice: notice !== null && notice.at === path ? notice.notice : null,
    solve,
    stop,
  }
}
