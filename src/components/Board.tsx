import { useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { coords, current, isDark, label, type Status } from '../game/rules'
import type { ArtSet } from '../assets/artSets'

interface Props {
  art: ArtSet
  size: number
  path: readonly number[]
  legal: ReadonlySet<number>
  hints: ReadonlyMap<number, number>
  orphan: number
  status: Status
  onMove: (index: number) => void
  onHover: (index: number | null) => void
}

const ARROWS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
}

export function Board({ art, size, path, legal, hints, orphan, status, onMove, onHover }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const cur = current(path)
  const [focus, setFocus] = useState(0)
  const tabbable = Math.min(focus, size * size - 1)
  const over = status !== 'playing'
  const order = new Map(path.map((sq, i) => [sq, i + 1]))

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const d = ARROWS[e.key]
    if (!d) return
    e.preventDefault()
    const [r, c] = coords(size, tabbable)
    const nr = Math.min(size - 1, Math.max(0, r - 1 + d[0]))
    const nc = Math.min(size - 1, Math.max(0, c - 1 + d[1]))
    const next = nr * size + nc
    setFocus(next)
    ref.current?.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus()
  }

  return (
    <div
      ref={ref}
      className="board"
      data-art={art.id}
      // --n lets the stylesheet size the board in whole pixels per square and scale the numbers.
      style={{
        gridTemplateColumns: `repeat(${size}, 1fr)`,
        gridTemplateRows: `repeat(${size}, 1fr)`,
        '--n': size,
      } as CSSProperties}
      role="group"
      aria-label={`${size} by ${size} board. Arrow keys move between squares, Enter or Space moves the knight.`}
      onKeyDown={onKey}
      onMouseLeave={() => onHover(null)}
    >
      {Array.from({ length: size * size }, (_, i) => {
        const n = order.get(i)
        const isCurrent = i === cur
        const isLegal = !over && legal.has(i)
        const hint = hints.get(i)
        const classes = [
          'square',
          isCurrent ? 'is-current' : '',
          n !== undefined && !isCurrent ? 'is-visited' : '',
          isLegal ? 'is-legal' : '',
          hint !== undefined && !over ? 'is-hint' : '',
          over && i === orphan ? 'is-orphan' : '',
        ].filter(Boolean).join(' ')
        const state = isCurrent
          ? `knight here, move ${n}`
          : n !== undefined
            ? `visited, move ${n}`
            : isLegal
              ? 'available move'
              : i === orphan && over
                ? 'orphaned, can no longer be reached'
                : 'not available'
        return (
          <button
            key={i}
            type="button"
            data-index={i}
            className={classes}
            style={{
              backgroundImage: `url(${isDark(size, i) ? art.dark : art.light})`,
              backgroundPosition: art.id === 'new' ? `${(i * 37) % 100}% ${(i * 61) % 100}%` : undefined,
            }}
            tabIndex={i === tabbable ? 0 : -1}
            aria-label={`Row ${coords(size, i)[0]}, column ${coords(size, i)[1]}: ${state}`}
            aria-disabled={!isLegal}
            onFocus={() => { setFocus(i); onHover(i) }}
            onBlur={() => onHover(null)}
            onMouseEnter={() => onHover(i)}
            onClick={() => { if (isLegal) onMove(i) }}
            title={label(size, i)}
          >
            {isCurrent && <Piece art={art} previous={false} />}
            {n !== undefined && !isCurrent && <Piece art={art} previous />}
            {n !== undefined && <span className="num">{n}</span>}
            {isLegal && hint === undefined && <span className="dot" aria-hidden="true" />}
            {hint !== undefined && !over && <span className="hint">{hint}</span>}
          </button>
        )
      })}
    </div>
  )
}

function Piece({ art, previous }: { art: ArtSet; previous: boolean }) {
  const cls = previous ? 'piece piece-prev' : 'piece'
  if (art.previousKnight === null) {
    // One silhouette, tinted by CSS: the mask keeps its shape, the background colour is the tint.
    const mask = `url(${art.knight})`
    return (
      <span className={cls} aria-hidden="true">
        <span className="piece-shape" style={{ maskImage: mask, WebkitMaskImage: mask }} />
      </span>
    )
  }
  return <img className={cls} src={previous ? art.previousKnight : art.knight} alt="" draggable={false} />
}
