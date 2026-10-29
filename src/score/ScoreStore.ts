// Persistence boundary for finished runs. Every method is async so a
// server-backed store can replace the browser one without touching the UI.

export interface Run {
  size: number
  won: boolean
  /** Elapsed play time in milliseconds. */
  ms: number
  moves: number
  /** Epoch milliseconds when the run ended. */
  at: number
  /** The computer made some of the moves ("Solve automagically"): never a win or a best time. */
  byComputer?: boolean
}

export interface Stats {
  gamesPlayed: number
  /** Tours the player completed alone. */
  wins: number
  /** wins / gamesPlayed, 0 when nothing has been played. */
  completionRate: number
  /** Tours finished by the solver. Counted as played, never as wins or best times. */
  solvedByComputer: number
}

/** Best (lowest) winning time in ms per board size, player-only wins; sizes never won are absent. */
export type BestTimes = Partial<Record<number, number>>

export interface ScoreStore {
  saveRun(run: Run): Promise<void>
  bestTimes(): Promise<BestTimes>
  stats(): Promise<Stats>
}
