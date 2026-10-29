// Web Worker entry: runs the solver off the page's thread. One request per
// worker; the page stops a search by terminating the worker.

import { solveTour } from './solver'
import type { SolveRequest, WorkerMessage } from './protocol'

export function handleSolveRequest(request: SolveRequest, post: (message: WorkerMessage) => void): void {
  const { id } = request
  try {
    const result = solveTour(request.size, request.path, {
      timeMs: request.timeMs,
      prefer: request.prefer,
      ...(request.seed === undefined ? {} : { seed: request.seed }),
      onProgress: (progress) => post({ type: 'progress', id, progress }),
    })
    post({ type: 'result', id, result })
  } catch (e) {
    post({ type: 'error', id, message: e instanceof Error ? e.message : String(e) })
  }
}

interface WorkerScope {
  onmessage: ((event: MessageEvent<SolveRequest>) => void) | null
  postMessage(message: WorkerMessage): void
}

if (typeof self !== 'undefined') {
  const scope = self as unknown as WorkerScope
  scope.onmessage = (event) => handleSolveRequest(event.data, (message) => scope.postMessage(message))
}
