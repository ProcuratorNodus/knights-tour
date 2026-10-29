import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { applyMove, DEFAULT_SIZE, status as statusOf, undoMove, type Status } from './rules'
import type { Run, ScoreStore } from '../score/ScoreStore'

export interface State {
  size: number
  path: readonly number[]
  /** Play time banked while the clock was stopped. */
  accMs: number
  /** Epoch ms when the clock last started; null while stopped. */
  runningSince: number | null
  /** A run is saved at most once, even if the player undoes out of the end state. */
  recorded: boolean
  /** The computer made at least one move this run: it can never be a win or a best time. */
  assisted: boolean
  /** The latest move was the computer's. */
  lastByComputer: boolean
}

export type Action =
  | { type: 'move'; index: number; now: number; by?: 'computer' }
  | { type: 'undo'; now: number }
  | { type: 'restart' }
  | { type: 'size'; size: number }
  | { type: 'recorded' }

export function fresh(size: number): State {
  return { size, path: [], accMs: 0, runningSince: null, recorded: false, assisted: false, lastByComputer: false }
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'move': {
      const path = applyMove(state.size, state.path, action.index)
      if (path === state.path) return state
      const runningSince = state.runningSince ?? action.now
      const lastByComputer = action.by === 'computer'
      const assisted = state.assisted || lastByComputer
      if (statusOf(state.size, path) === 'playing') return { ...state, path, runningSince, assisted, lastByComputer }
      return { ...state, path, assisted, lastByComputer, accMs: state.accMs + (action.now - runningSince), runningSince: null }
    }
    case 'undo': {
      if (state.path.length === 0) return state
      const path = undoMove(state.path)
      if (path.length === 0) return fresh(state.size)
      const wasEnded = state.runningSince === null
      return { ...state, path, runningSince: wasEnded ? action.now : state.runningSince }
    }
    case 'restart':
      return fresh(state.size)
    case 'size':
      return fresh(action.size)
    case 'recorded':
      return { ...state, recorded: true }
  }
}

export function elapsedMs(state: Pick<State, 'accMs' | 'runningSince'>, now: number): number {
  return state.accMs + (state.runningSince === null ? 0 : now - state.runningSince)
}

export function useGame(store: ScoreStore) {
  const [state, dispatch] = useReducer(reduce, DEFAULT_SIZE, fresh)
  const [now, setNow] = useState(() => Date.now())
  const [statsVersion, setStatsVersion] = useState(0)

  const status: Status = useMemo(() => statusOf(state.size, state.path), [state.size, state.path])
  const running = state.runningSince !== null

  useEffect(() => {
    if (!running) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [running])

  const ended = status !== 'playing'
  const ms = elapsedMs(state, now)
  useEffect(() => {
    if (!ended || state.recorded) return
    dispatch({ type: 'recorded' })
    const run: Run = {
      size: state.size,
      won: status === 'won',
      ms: state.accMs,
      moves: state.path.length,
      at: Date.now(),
      byComputer: state.assisted,
    }
    void store.saveRun(run).then(() => setStatsVersion((v) => v + 1))
  }, [ended, state.recorded, state.size, state.accMs, state.path.length, state.assisted, status, store])

  return {
    size: state.size,
    path: state.path,
    status,
    ms: ended ? state.accMs : ms,
    statsVersion,
    /** The computer made at least one move this run. */
    assisted: state.assisted,
    /** The latest move was the computer's. */
    lastByComputer: state.lastByComputer,
    move: useCallback((index: number) => dispatch({ type: 'move', index, now: Date.now() }), []),
    /** A move made by the solver; same rules, but marks the run as solved by computer. */
    computerMove: useCallback((index: number) => dispatch({ type: 'move', index, now: Date.now(), by: 'computer' }), []),
    undo: useCallback(() => dispatch({ type: 'undo', now: Date.now() }), []),
    restart: useCallback(() => dispatch({ type: 'restart' }), []),
    setSize: useCallback((size: number) => dispatch({ type: 'size', size }), []),
  }
}
