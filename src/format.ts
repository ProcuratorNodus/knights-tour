export function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  const tenths = Math.floor((ms % 1000) / 100)
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}.${tenths}s`
}

export function formatPercent(rate: number): string {
  return `${Math.round(rate * 100)}%`
}
