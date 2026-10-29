import type { BestTimes, Run, ScoreStore, Stats } from './ScoreStore'

export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

interface SizeRecord {
  played: number
  wins: number
  best?: number
  /** Tours finished by the solver. */
  computer?: number
}

type Data = Record<string, SizeRecord>

export const STORAGE_KEY = 'knights-tour:scores:v1'

function isRecord(v: unknown): v is SizeRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    Number.isFinite(r.played) &&
    Number.isFinite(r.wins) &&
    (r.best === undefined || Number.isFinite(r.best)) &&
    (r.computer === undefined || Number.isFinite(r.computer))
  )
}

export class LocalScoreStore implements ScoreStore {
  private readonly storage: StorageLike
  private readonly key: string

  constructor(storage: StorageLike, key: string = STORAGE_KEY) {
    this.storage = storage
    this.key = key
  }

  private read(): Data {
    let parsed: unknown
    try {
      const raw = this.storage.getItem(this.key)
      if (raw === null) return {}
      parsed = JSON.parse(raw)
    } catch {
      return {}
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const out: Data = {}
    for (const [k, v] of Object.entries(parsed)) if (isRecord(v)) out[k] = v
    return out
  }

  private write(data: Data): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(data))
    } catch {
      // Storage full or blocked (private mode): scores are best-effort.
    }
  }

  async saveRun(run: Run): Promise<void> {
    const data = this.read()
    const key = String(run.size)
    const rec: SizeRecord = data[key] ?? { played: 0, wins: 0 }
    rec.played += 1
    if (run.won && run.byComputer === true) {
      rec.computer = (rec.computer ?? 0) + 1
    } else if (run.won) {
      rec.wins += 1
      if (rec.best === undefined || run.ms < rec.best) rec.best = run.ms
    }
    data[key] = rec
    this.write(data)
  }

  async bestTimes(): Promise<BestTimes> {
    const out: BestTimes = {}
    for (const [k, rec] of Object.entries(this.read())) {
      if (rec.best !== undefined) out[Number(k)] = rec.best
    }
    return out
  }

  async stats(): Promise<Stats> {
    let gamesPlayed = 0
    let wins = 0
    let solvedByComputer = 0
    for (const rec of Object.values(this.read())) {
      gamesPlayed += rec.played
      wins += rec.wins
      solvedByComputer += rec.computer ?? 0
    }
    return { gamesPlayed, wins, completionRate: gamesPlayed === 0 ? 0 : wins / gamesPlayed, solvedByComputer }
  }
}
