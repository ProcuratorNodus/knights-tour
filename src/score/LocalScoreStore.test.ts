import { beforeEach, describe, expect, it } from 'vitest'
import { LocalScoreStore, STORAGE_KEY, type StorageLike } from './LocalScoreStore'

function memory(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  }
}

const run = (size: number, won: boolean, ms: number) => ({ size, won, ms, moves: 10, at: 0 })

describe('LocalScoreStore', () => {
  let mem: ReturnType<typeof memory>
  let store: LocalScoreStore
  beforeEach(() => {
    mem = memory()
    store = new LocalScoreStore(mem)
  })

  it('starts empty', async () => {
    expect(await store.stats()).toEqual({ gamesPlayed: 0, wins: 0, completionRate: 0, solvedByComputer: 0 })
    expect(await store.bestTimes()).toEqual({})
  })

  it('tracks games played, wins and completion rate', async () => {
    await store.saveRun(run(8, true, 90_000))
    await store.saveRun(run(8, false, 20_000))
    await store.saveRun(run(5, false, 5_000))
    await store.saveRun(run(5, true, 7_000))
    expect(await store.stats()).toEqual({ gamesPlayed: 4, wins: 2, completionRate: 0.5, solvedByComputer: 0 })
  })

  it('keeps the best winning time per size and ignores losses for it', async () => {
    await store.saveRun(run(8, true, 90_000))
    await store.saveRun(run(8, true, 60_000))
    await store.saveRun(run(8, true, 75_000))
    await store.saveRun(run(8, false, 1_000))
    await store.saveRun(run(6, false, 1_000))
    expect(await store.bestTimes()).toEqual({ 8: 60_000 })
  })

  it('persists across store instances', async () => {
    await store.saveRun(run(7, true, 42_000))
    const again = new LocalScoreStore(mem)
    expect(await again.bestTimes()).toEqual({ 7: 42_000 })
  })

  it('recovers from corrupt or foreign stored data', async () => {
    mem.data.set(STORAGE_KEY, '{not json')
    expect(await store.stats()).toEqual({ gamesPlayed: 0, wins: 0, completionRate: 0, solvedByComputer: 0 })
    mem.data.set(STORAGE_KEY, JSON.stringify({ 8: { played: 'x' }, 5: { played: 2, wins: 1, best: 9 } }))
    expect(await store.stats()).toEqual({ gamesPlayed: 2, wins: 1, completionRate: 0.5, solvedByComputer: 0 })
    await store.saveRun(run(8, true, 1))
    expect((await store.stats()).gamesPlayed).toBe(3)
  })

  it('counts a computer-solved tour as played and solved by computer, never as a win or best time', async () => {
    await store.saveRun(run(6, true, 50_000))
    await store.saveRun({ ...run(6, true, 1_000), byComputer: true })
    await store.saveRun({ ...run(8, true, 2_000), byComputer: true })
    await store.saveRun({ ...run(8, false, 3_000), byComputer: true })
    expect(await store.stats()).toEqual({ gamesPlayed: 4, wins: 1, completionRate: 0.25, solvedByComputer: 2 })
    expect(await store.bestTimes()).toEqual({ 6: 50_000 })
  })

  it('does not throw when storage rejects writes', async () => {
    const broken = new LocalScoreStore({ getItem: () => null, setItem: () => { throw new Error('quota') } })
    await expect(broken.saveRun(run(8, true, 1))).resolves.toBeUndefined()
  })
})
