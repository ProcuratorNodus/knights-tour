// Messages between the page and the solver worker.

import type { SolveProgress, SolveResult, TourPreference } from './solver'

export interface SolveRequest {
  id: number
  size: number
  path: number[]
  /** Wall-clock budget for the whole answer, in milliseconds. */
  timeMs: number
  prefer: TourPreference
  seed?: number
}

export type WorkerMessage =
  | { type: 'progress'; id: number; progress: SolveProgress }
  | { type: 'result'; id: number; result: SolveResult }
  | { type: 'error'; id: number; message: string }
