import { useEffect, useState } from 'react'
import { BOARD_SIZES } from '../game/rules'
import { formatPercent, formatTime } from '../format'
import type { BestTimes, ScoreStore, Stats } from '../score/ScoreStore'

export function StatsPanel({ store, version }: { store: ScoreStore; version: number }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [best, setBest] = useState<BestTimes>({})

  useEffect(() => {
    let live = true
    void Promise.all([store.stats(), store.bestTimes()]).then(([s, b]) => {
      if (live) { setStats(s); setBest(b) }
    })
    return () => { live = false }
  }, [store, version])

  return (
    <section className="panel" aria-labelledby="stats-h">
      <h2 id="stats-h">Your stats</h2>
      <dl className="stat-grid">
        <div><dt>Games played</dt><dd>{stats?.gamesPlayed ?? 0}</dd></div>
        <div><dt>Tours completed</dt><dd>{stats?.wins ?? 0}</dd></div>
        <div><dt>Completion rate</dt><dd>{formatPercent(stats?.completionRate ?? 0)}</dd></div>
        <div><dt>Solved by computer</dt><dd>{stats?.solvedByComputer ?? 0}</dd></div>
      </dl>
      <table className="best">
        <caption>Best time by board size</caption>
        {/* One row of times, not one row per size: keeps the panel short enough to fit beside the board. */}
        <thead>
          <tr><th scope="row">Board</th>{BOARD_SIZES.map((n) => <th key={n} scope="col">{n} x {n}</th>)}</tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Best</th>
            {BOARD_SIZES.map((n) => <td key={n}>{best[n] === undefined ? '-' : formatTime(best[n])}</td>)}
          </tr>
        </tbody>
      </table>
      <p className="muted small">
        Saved in this browser only. Tours finished by the solver count as played, never as your wins or best times.
      </p>
    </section>
  )
}
