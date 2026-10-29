// Accounts and shared leaderboards arrive in a future version.
import type { BestTimes, Run, ScoreStore, Stats } from './ScoreStore'

const SDK_URL = new URL('../../vendor/procuratornodus-sdk/sdk.min.js', import.meta.url).href

interface Result<T> {
  ok: boolean
  data?: T
}

interface Client {
  request<T>(capability: string, input: unknown): Promise<Result<T>>
}

type CreateClient = (config: { host: string; token: string; app?: string }) => Client

export interface RemoteScoreConfig {
  host: string
  token: string
  app: string
}

interface RunRow {
  size: number
  won: boolean
  ms: number
  moves: number
  at: number
  by_computer: boolean
}

async function connect(config: RemoteScoreConfig): Promise<Client> {
  const mod: unknown = await import(/* @vite-ignore */ SDK_URL)
  const create = (mod as { createProcuratorNodusClient?: CreateClient }).createProcuratorNodusClient
  if (typeof create !== 'function') throw new Error('score client unavailable')
  return create(config)
}

export class PnScoreStore implements ScoreStore {
  private client: Promise<Client> | null = null
  private readonly config: RemoteScoreConfig

  constructor(config: RemoteScoreConfig) {
    this.config = config
  }

  private get(): Promise<Client> {
    this.client ??= connect(this.config)
    return this.client
  }

  private async rows(): Promise<RunRow[]> {
    const client = await this.get()
    const res = await client.request<RunRow[]>('data.query', { resource: 'runs' })
    return res.ok && res.data ? res.data : []
  }

  async saveRun(run: Run): Promise<void> {
    const client = await this.get()
    const row: RunRow = {
      size: run.size, won: run.won, ms: run.ms, moves: run.moves, at: run.at,
      by_computer: run.byComputer === true,
    }
    await client.request('data.insert-many', { resource: 'runs', rows: [row] })
  }

  async bestTimes(): Promise<BestTimes> {
    const out: BestTimes = {}
    for (const r of await this.rows()) {
      if (!r.won || r.by_computer) continue
      const best = out[r.size]
      if (best === undefined || r.ms < best) out[r.size] = r.ms
    }
    return out
  }

  async stats(): Promise<Stats> {
    const rows = await this.rows()
    const wins = rows.filter((r) => r.won && !r.by_computer).length
    return {
      gamesPlayed: rows.length,
      wins,
      completionRate: rows.length === 0 ? 0 : wins / rows.length,
      solvedByComputer: rows.filter((r) => r.won && r.by_computer).length,
    }
  }
}
