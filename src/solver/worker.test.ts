import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startSolve, type WorkerLike } from './client'
import type { SolveRequest, WorkerMessage } from './protocol'
import { SLOW_8X8_POSITION, tourError } from './testing'

const HARD_8 = [...SLOW_8X8_POSITION]

interface FakeScope {
  onmessage: ((event: { data: SolveRequest }) => void) | null
  postMessage(message: WorkerMessage): void
}

// The worker module binds itself to `self` when it loads, so install a stand-in
// scope first and load it afterwards.
const posted: WorkerMessage[] = []
const scope: FakeScope = { onmessage: null, postMessage: (m) => { posted.push(m) } }
let handleSolveRequest: typeof import('./solver.worker').handleSolveRequest

beforeAll(async () => {
  ;(globalThis as Record<string, unknown>).self = scope
  ;({ handleSolveRequest } = await import('./solver.worker'))
})
afterAll(() => {
  delete (globalThis as Record<string, unknown>).self
})

describe('solver worker (the real worker module, run in this thread)', () => {
  it('binds to the worker scope and answers with the completing moves', () => {
    expect(scope.onmessage).toBeTypeOf('function')
    scope.onmessage!({ data: { id: 1, size: 6, path: [0], timeMs: 2000, prefer: 'any' } })
    const reply = posted.find((m) => m.id === 1 && m.type === 'result')
    expect(reply?.type).toBe('result')
    if (reply?.type !== 'result' || reply.result.kind !== 'solved') throw new Error('expected a solved result')
    expect(tourError(6, [0, ...reply.result.moves])).toBeNull()
  })

  it('returns within its time budget on a hard position, reporting progress on the way', () => {
    const budget = 400
    const started = performance.now()
    scope.onmessage!({ data: { id: 2, size: 8, path: HARD_8, timeMs: budget, prefer: 'any' } })
    const elapsed = performance.now() - started
    expect(elapsed).toBeGreaterThanOrEqual(budget * 0.9)
    expect(elapsed).toBeLessThan(budget + 150)
    const reply = posted.find((m) => m.id === 2 && m.type === 'result')
    expect(reply).toMatchObject({ type: 'result', result: { kind: 'unknown' } })
    const progress = posted.filter((m) => m.id === 2 && m.type === 'progress')
    expect(progress.length).toBeGreaterThan(0)
  })

  it('reports an impossible request as an error message instead of throwing', () => {
    const out: WorkerMessage[] = []
    handleSolveRequest({ id: 3, size: 8, path: [0, 1], timeMs: 100, prefer: 'any' }, (m) => out.push(m))
    expect(out).toEqual([{ type: 'error', id: 3, message: expect.stringContaining('knight move') }])
  })
})

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null = null
  onerror: ((event: ErrorEvent) => void) | null = null
  terminated = false
  readonly requests: SolveRequest[] = []

  constructor(private readonly behaviour: 'solve' | 'silent' | 'crash' | 'stranger') {}

  postMessage(request: SolveRequest): void {
    this.requests.push(request)
    const send = (m: WorkerMessage) => this.onmessage?.({ data: m } as MessageEvent<WorkerMessage>)
    if (this.behaviour === 'solve') {
      setTimeout(() => handleSolveRequest(request, send), 0)
    } else if (this.behaviour === 'crash') {
      setTimeout(() => this.onerror?.({ message: 'boom' } as ErrorEvent), 0)
    } else if (this.behaviour === 'stranger') {
      setTimeout(() => send({ type: 'error', id: request.id + 1000, message: 'not for you' }), 0)
    }
  }

  terminate(): void {
    this.terminated = true
  }
}

describe('solver client', () => {
  it('resolves with the worker result, forwards progress and terminates the worker', async () => {
    const worker = new FakeWorker('solve')
    const progress: number[] = []
    const handle = startSolve(
      { size: 8, path: HARD_8, timeMs: 250, prefer: 'any' },
      { createWorker: () => worker, onProgress: (p) => progress.push(p.nodes) },
    )
    const outcome = await handle.done
    expect(outcome).toMatchObject({ kind: 'result', result: { kind: 'unknown' } })
    expect(progress.length).toBeGreaterThan(0)
    expect(worker.terminated).toBe(true)
  })

  it('stop() terminates the worker at once and resolves as stopped', async () => {
    const worker = new FakeWorker('silent')
    const handle = startSolve({ size: 8, path: [], timeMs: 5000, prefer: 'any' }, { createWorker: () => worker })
    handle.stop()
    expect(worker.terminated).toBe(true)
    expect(await handle.done).toEqual({ kind: 'stopped' })
  })

  it('a worker that never answers is terminated by the watchdog after its budget plus grace', async () => {
    const worker = new FakeWorker('silent')
    const started = performance.now()
    const handle = startSolve(
      { size: 8, path: [], timeMs: 40, prefer: 'any' },
      { createWorker: () => worker, graceMs: 30 },
    )
    expect(await handle.done).toEqual({ kind: 'timeout' })
    expect(performance.now() - started).toBeGreaterThanOrEqual(60)
    expect(worker.terminated).toBe(true)
  })

  it('a crashed worker resolves as failed', async () => {
    const worker = new FakeWorker('crash')
    const handle = startSolve({ size: 8, path: [], timeMs: 1000, prefer: 'any' }, { createWorker: () => worker })
    expect(await handle.done).toEqual({ kind: 'failed', message: 'boom' })
    expect(worker.terminated).toBe(true)
  })

  it('ignores messages meant for another request', async () => {
    const worker = new FakeWorker('stranger')
    const handle = startSolve({ size: 8, path: [], timeMs: 30, prefer: 'any' }, { createWorker: () => worker, graceMs: 10 })
    expect(await handle.done).toEqual({ kind: 'timeout' })
  })
})
