import { label, squareCount } from '../game/rules'
import { SOLVE_BUDGET_MS } from '../solver/client'
import type { SolverNotice, SolverView } from '../solver/useSolver'

interface StatusProps {
  size: number
  path: readonly number[]
  view: SolverView
  notice: SolverNotice | null
  /** Undo this many moves (all of them resets the board). */
  onBackUp: (moves: number) => void
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} million`
  if (n >= 10_000) return `${Math.round(n / 1000)} thousand`
  return String(n)
}

// The solver's controls come as three pieces so the layout can put Solve / Stop next to
// Back one and Reset board, and the closed-tour option with the other settings.

export function SolveButton({ view, canSolve, onSolve, onStop }: {
  view: SolverView
  /** False once the tour is complete. */
  canSolve: boolean
  onSolve: () => void
  onStop: () => void
}) {
  if (view.phase !== 'idle') {
    return <button type="button" className="btn stop" onClick={onStop}>Stop</button>
  }
  return (
    <button type="button" className="btn solve" onClick={onSolve} disabled={!canSolve}>
      Solve &ldquo;Automagically!&rdquo;
    </button>
  )
}

export function PreferClosed({ size, view, preferClosed, onPreferClosed }: {
  size: number
  view: SolverView
  preferClosed: boolean
  onPreferClosed: (on: boolean) => void
}) {
  const busy = view.phase !== 'idle'
  const odd = size % 2 === 1
  return (
    <label className="check" title={odd ? 'Closed tours are impossible on odd-sized boards' : undefined}>
      <input
        type="checkbox"
        checked={preferClosed && !odd}
        disabled={busy || odd}
        onChange={(e) => onPreferClosed(e.target.checked)}
      />
      Prefer a closed tour (ends a knight's move from the start)
    </label>
  )
}

export function SolverStatus(props: StatusProps) {
  return (
    <div className="solver-status" role="status" aria-live="polite">
      <Status {...props} />
    </div>
  )
}

function Status({ size, path, view, notice, onBackUp }: StatusProps) {
  if (view.phase === 'searching') {
    const p = view.progress
    const text = p?.stage === 'walk-back'
      ? 'No completion from here. Looking for the last position that had one...'
      : 'Searching for a completion...'
    return (
      <>
        <p>{text}{p ? ` ${formatCount(p.nodes)} positions checked.` : ''}</p>
        <progress max={SOLVE_BUDGET_MS} value={p?.ms ?? 0} aria-label="Time used of the search budget" />
      </>
    )
  }
  if (view.phase === 'playing') {
    return (
      <>
        <p>Playing the solution: move {path.length} of {squareCount(size)}.</p>
        <progress max={view.total} value={view.done} aria-label="Solution moves played" />
      </>
    )
  }
  if (notice === null) return null
  switch (notice.kind) {
    case 'stopped':
      return <p>Stopped. Carry on yourself, or press Solve again.</p>
    case 'failed':
      return <p className="bad-text">The solver failed: {notice.message}</p>
    case 'unknown':
      return (
        <p>
          Could not decide within {Math.round(notice.ms / 1000)} seconds
          {notice.nodes === null ? '' : ` (${formatCount(notice.nodes)} positions checked)`}. A completion may still
          exist; try backing up a move or two and solving again.
        </p>
      )
    case 'none': {
      const start = path[0]
      const back = notice.back
      if (notice.reason === 'parity' && start !== undefined) {
        return (
          <>
            <p className="bad-text">
              No tour can start on {label(size, start)}. On a {size} x {size} board every tour starts and ends on a
              dark square, the corners' colour.
            </p>
            <button type="button" className="btn" onClick={() => onBackUp(path.length)}>Start over</button>
          </>
        )
      }
      if (back === null) return <p className="bad-text">No completion exists from this position.</p>
      if (back.moves >= path.length && back.exact) {
        return (
          <>
            <p className="bad-text">
              No completion exists from this position, or from any earlier one: no tour can start
              {start === undefined ? ' here' : ` on ${label(size, start)}`}.
            </p>
            <button type="button" className="btn" onClick={() => onBackUp(path.length)}>Start over</button>
          </>
        )
      }
      return (
        <>
          <p className="bad-text">
            No completion exists from this position. The last position that could still be completed was{' '}
            {back.exact ? '' : 'at least '}{plural(back.moves, 'move')} back
            {back.exact ? ` (after move ${path.length - back.moves})` : ' (the search ran out of time looking further back)'}.
          </p>
          <button type="button" className="btn" onClick={() => onBackUp(back.moves)}>
            Back up {plural(back.moves, 'move')}
          </button>
        </>
      )
    }
  }
}
