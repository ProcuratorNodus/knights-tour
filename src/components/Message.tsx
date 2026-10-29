import type { Status } from '../game/rules'
import { label } from '../game/rules'
import type { ArtSet } from '../assets/artSets'

interface Props {
  art: ArtSet
  status: Status
  size: number
  moves: number
  orphan: number
  /** The computer made some of the moves. */
  byComputer?: boolean
  /** The computer made the final move. */
  finishedByComputer?: boolean
}

export function Message({ art, status, size, moves, orphan, byComputer = false, finishedByComputer = false }: Props) {
  if (status === 'playing') return <div className="message" aria-hidden="true" />
  if (status === 'won' && byComputer && !finishedByComputer) {
    return (
      <div className="message win" role="status">
        <p>Tour complete, with help from the computer.</p>
        <p className="small">Not counted as your win or best time.</p>
      </div>
    )
  }
  if (status === 'won' && byComputer) {
    // The original's own wording for a computer win.
    return (
      <div className="message win" role="status">
        <p>Congratulations to me!</p>
        <p>I am, indeed, an impressively smart computer! <img src={art.happy} alt="Smiling face" width={30} height={30} /></p>
        <p className="small">Solved by computer: not counted as your win or best time.</p>
      </div>
    )
  }
  if (status === 'won') {
    return (
      <div className="message win" role="status">
        <p>Congratulations!</p>
        <p>You win! <img src={art.happy} alt="Smiling face" width={30} height={30} /></p>
      </div>
    )
  }
  return (
    <div className="message lose" role="status">
      <p>{status === 'stuck' ? "I'm sorry to say, but ..." : "I'm sorry to say, but you lose!"}</p>
      <p>
        {status === 'stuck' ? 'You lose!' : `You made an orphan of ${label(size, orphan)}!`}{' '}
        <img src={art.sad} alt="Frowning face" width={30} height={30} /> Move count: {moves}
      </p>
    </div>
  )
}
