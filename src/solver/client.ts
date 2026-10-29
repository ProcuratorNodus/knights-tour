// Page side of the solver worker: one worker per solve, stop = terminate, and a
// watchdog in case the worker never answers.

import type { SolveRequest, WorkerMessage } from './protocol'
import type { SolveProgress, SolveResult } from './solver'

/** The part of the Worker API the client uses (a real Worker satisfies it). */
export interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage(message: SolveRequest): void
  terminate(): void
}

export type SolveOutcome =
  | { kind: 'result'; result: SolveResult }
  | { kind: 'stopped' }
  /** The worker did not answer within its budget plus the grace period. */
  | { kind: 'timeout' }
  | { kind: 'failed'; message: string }

export interface SolveHandle {
  readonly done: Promise<SolveOutcome>
  /** Terminates the worker; `done` resolves with { kind: 'stopped' }. */
  stop(): void
}

/**
 * Wall-clock budget for one solve in the game, walk-back included. Nearly every
 * position is answered in milliseconds; the rare hard one gets this long, with
 * a progress bar and a Stop button, before the answer is "could not decide".
 */
export const SOLVE_BUDGET_MS = 10_000

/** Extra time the worker gets past its own budget before the watchdog fires. */
export const WATCHDOG_GRACE_MS = 2000

export function createSolverWorker(): WorkerLike {
  return new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' })
}

let nextId = 1

export function startSolve(
  request: Omit<SolveRequest, 'id'>,
  options: {
    createWorker?: () => WorkerLike
    onProgress?: (progress: SolveProgress) => void
    graceMs?: number
  } = {},
): SolveHandle {
  const id = nextId++
  const worker = (options.createWorker ?? createSolverWorker)()
  let settle: (outcome: SolveOutcome) => void = () => {}
  const done = new Promise<SolveOutcome>((resolve) => { settle = resolve })
  let finished = false
  const finish = (outcome: SolveOutcome): void => {
    if (finished) return
    finished = true
    clearTimeout(watchdog)
    worker.onmessage = null
    worker.onerror = null
    worker.terminate()
    settle(outcome)
  }
  const watchdog = setTimeout(
    () => finish({ kind: 'timeout' }),
    request.timeMs + (options.graceMs ?? WATCHDOG_GRACE_MS),
  )
  worker.onmessage = (event) => {
    const message = event.data
    if (message.id !== id) return
    if (message.type === 'progress') options.onProgress?.(message.progress)
    else if (message.type === 'result') finish({ kind: 'result', result: message.result })
    else finish({ kind: 'failed', message: message.message })
  }
  worker.onerror = (event) => finish({ kind: 'failed', message: event.message || 'solver worker failed' })
  worker.postMessage({ ...request, id })
  return { done, stop: () => finish({ kind: 'stopped' }) }
}
