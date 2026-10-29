import { useMemo, useState } from 'react'
import { Board } from './components/Board'
import { Message } from './components/Message'
import { PreferClosed, SolveButton, SolverStatus } from './components/SolverBar'
import { StatsPanel } from './components/StatsPanel'
import { formatTime } from './format'
import { useGame } from './game/useGame'
import {
  BOARD_SIZES, current, findOrphan, futureCounts, label, legalMoves, squareCount,
} from './game/rules'
import { LocalScoreStore } from './score/LocalScoreStore'
import type { ScoreStore } from './score/ScoreStore'
import { useSolver } from './solver/useSolver'
import { ART_SETS, loadArt, saveArt, type ArtId } from './assets/artSets'

const defaultStore: ScoreStore = new LocalScoreStore(window.localStorage)
const noSquares: ReadonlySet<number> = new Set()
const ignore = () => {}

export default function App({ store = defaultStore }: { store?: ScoreStore }) {
  const game = useGame(store)
  const [hintsOn, setHintsOn] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [preferClosed, setPreferClosed] = useState(false)
  const [artId, setArtId] = useState<ArtId>(() => loadArt())
  const art = ART_SETS[artId]
  const pickArt = (id: ArtId) => { setArtId(id); saveArt(id) }
  const { size, path, status } = game
  const solver = useSolver({ size, path, prefer: preferClosed ? 'closed' : 'any', onMove: game.computerMove })
  const busy = solver.busy

  const backUp = (moves: number) => {
    if (moves >= path.length) game.restart()
    else for (let i = 0; i < moves; i++) game.undo()
  }

  const legal = useMemo(() => new Set(legalMoves(size, path)), [size, path])
  const orphan = useMemo(() => (status === 'orphan' ? findOrphan(size, path) : -1), [size, path, status])
  const cur = current(path)

  // Original behaviour: hover a legal square (or the knight) to see onward-move counts.
  const origin = hover !== null && (hover === cur || legal.has(hover)) ? hover : cur
  const hints = useMemo(
    () => (hintsOn && !busy && origin !== undefined && path.length > 0 && status === 'playing'
      ? futureCounts(size, path, origin)
      : new Map<number, number>()),
    [hintsOn, busy, origin, size, path, status],
  )

  const total = squareCount(size)
  const where = hover ?? cur

  return (
    <div className="app">
      <header className="top">
        <h1><img src={art.knight} alt="" width={40} height={40} className={`logo logo-${art.id}`} /> Knight's Tour</h1>
        <button type="button" className="btn ghost signin" disabled title="Accounts coming soon">
          Sign in <span className="soon">(accounts coming soon)</span>
        </button>
      </header>

      {/* Wide and landscape windows: .play is fitted to the window height (see global.css). */}
      <main className="layout">
        <section className="play" aria-label="Game">
          <div className="board-wrap">
            <Board
              art={art}
              size={size}
              path={path}
              legal={busy ? noSquares : legal}
              hints={hints}
              orphan={orphan}
              status={status}
              onMove={busy ? ignore : game.move}
              onHover={setHover}
            />
          </div>

          <div className="console">
            <dl className="readout" aria-live="off">
              <div><dt>Time</dt><dd>{formatTime(game.ms)}</dd></div>
              <div><dt>Moves</dt><dd>{path.length} / {total}</dd></div>
              <div><dt>Options</dt><dd>{path.length === 0 ? total : legal.size}</dd></div>
              <div><dt>Square</dt><dd>{where === undefined ? '-' : label(size, where)}</dd></div>
            </dl>

            <div className="actions">
              <button type="button" className="btn" onClick={game.undo} disabled={busy || path.length === 0}>Back one</button>
              <button type="button" className="btn" onClick={game.restart} disabled={busy || path.length === 0}>Reset board</button>
              <SolveButton view={solver.view} canSolve={status !== 'won'} onSolve={solver.solve} onStop={solver.stop} />
            </div>

            <SolverStatus size={size} path={path} view={solver.view} notice={solver.notice} onBackUp={backUp} />

            <Message
              art={art}
              status={status}
              size={size}
              moves={path.length}
              orphan={orphan}
              byComputer={game.assisted}
              finishedByComputer={game.lastByComputer}
            />

            <div className="options">
              <label className="size-pick">
                Board
                <select value={size} disabled={busy} onChange={(e) => game.setSize(Number(e.target.value))}>
                  {BOARD_SIZES.map((n) => <option key={n} value={n}>{n} x {n}</option>)}
                </select>
              </label>
              <button type="button" className="btn toggle" aria-pressed={hintsOn} onClick={() => setHintsOn((v) => !v)}>
                Hints {hintsOn ? 'on' : 'off'}
              </button>
              <label className="size-pick art-pick">
                Pieces &amp; board
                <select value={artId} onChange={(e) => pickArt(e.target.value as ArtId)}>
                  {Object.values(ART_SETS).map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </label>
              <PreferClosed size={size} view={solver.view} preferClosed={preferClosed} onPreferClosed={setPreferClosed} />
            </div>
          </div>
        </section>
      </main>

      {/* Outside <main> so on wide windows it can run the full window height beside the header. */}
      <aside className="side">
        <section className="panel" aria-labelledby="how-h">
          <h2 id="how-h">How to play</h2>
          <p>
            The knight moves in an "L": two squares one way and one across. Visit every square
            exactly once. Start on any square.
          </p>
          <p>
            Head for squares with the fewest onward moves, and never leave an orphan: a square
            that no longer has any way in.
          </p>
          <p>
            Stuck? <strong>Solve &ldquo;Automagically!&rdquo;</strong> finishes the tour from wherever you are, or
            tells you that it can't be finished from here and how many moves back it still could be. A tour the
            computer finishes is not counted as your win.
          </p>
          <ul className="key">
            <li><span className="swatch s-current" /> Knight (current square)</li>
            <li><span className="swatch s-legal" /> Available move</li>
            <li><span className="swatch s-hint" /> Hint: onward moves from there</li>
            <li><span className="swatch s-bad" /> Orphaned square</li>
          </ul>
        </section>
        <StatsPanel store={store} version={game.statsVersion} />
      </aside>

      <footer className="foot">
        Knight's Tour &copy; 2015-2026 Joel E. Mason. Classic knight image:{' '}
        <a href="https://cliparts.co/clipart/2517827" target="_blank" rel="noopener noreferrer">
          clip art by Cliparts.co
        </a>
        .
      </footer>
    </div>
  )
}
