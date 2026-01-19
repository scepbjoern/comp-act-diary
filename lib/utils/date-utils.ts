/**
 * Date utility functions
 */

/**
 * Format Date object to YYYY-MM-DD
 */
export function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Format ISO string to HH:MM local time
 */
export function fmtHMLocal(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

/**
 * Format YYYY-MM-DD to DD.MM.YYYY
 */
export function fmtDmyFromYmd(ymdStr: string): string {
  const [y, m, d] = (ymdStr || '').split('-')
  if (!y || !m || !d) return ymdStr
  const dd = String(parseInt(d, 10))
  const mm = String(parseInt(m, 10))
  return `${dd}.${mm}.${y}`
}

/**
 * Shift date by delta days
 */
export function shiftDate(cur: string, delta: number): string {
  const [y, m, d] = cur.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + delta)
  return ymd(dt)
}

/**
 * Shift date by delta months
 */
export function shiftMonth(cur: string, delta: number): string {
  const [y, m, d] = cur.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1 + delta, d || 1)
  // Handle month overflow (e.g., Jan 31 + 1 month = Feb 28/29)
  const originalDay = d || 1
  if (dt.getDate() !== originalDay) {
    // Day overflowed, go to last day of previous month
    dt.setDate(0)
  }
  return ymd(dt)
}
