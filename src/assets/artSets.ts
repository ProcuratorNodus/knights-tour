import classicDark from './classic/DarkBoard.png'
import classicLight from './classic/LightBoard.png'
import classicKnight from './classic/Knight.png'
import classicPrevious from './classic/PreviousKnight.png'
import classicSmile from './classic/smilesmall.png'
import classicFrown from './classic/frownsmall.png'
import newDark from './new/wood-dark.jpg'
import newLight from './new/wood-light.jpg'
import newKnight from './new/knight.svg'
import newHappy from './new/face-happy.png'
import newSad from './new/face-sad.png'

export type ArtId = 'new' | 'classic'

export interface ArtSet {
  id: ArtId
  label: string
  dark: string
  light: string
  knight: string
  /** Classic ships a ready-made image of the earlier knight; the new set tints the one silhouette. */
  previousKnight: string | null
  happy: string
  sad: string
}

export const ART_SETS: Record<ArtId, ArtSet> = {
  new: {
    id: 'new', label: 'New', dark: newDark, light: newLight, knight: newKnight,
    previousKnight: null, happy: newHappy, sad: newSad,
  },
  classic: {
    id: 'classic', label: 'Classic', dark: classicDark, light: classicLight, knight: classicKnight,
    previousKnight: classicPrevious, happy: classicSmile, sad: classicFrown,
  },
}

export const ART_KEY = 'knights-tour.art'
export const DEFAULT_ART: ArtId = 'new'

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function browserStorage(): KeyValueStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function loadArt(storage: KeyValueStore | null = browserStorage()): ArtId {
  try {
    const v = storage?.getItem(ART_KEY)
    return v === 'classic' || v === 'new' ? v : DEFAULT_ART
  } catch {
    return DEFAULT_ART
  }
}

export function saveArt(id: ArtId, storage: KeyValueStore | null = browserStorage()): void {
  try {
    storage?.setItem(ART_KEY, id)
  } catch {
    // Storage may be unavailable or full; the choice just won't be remembered.
  }
}
