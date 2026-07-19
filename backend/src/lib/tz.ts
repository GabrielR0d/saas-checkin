/**
 * Timezone helpers for Europe/Lisbon (WET = UTC+0, WEST = UTC+1 in summer).
 * Render servers run UTC; these functions convert date-string boundaries to UTC.
 */

const TZ = 'Europe/Lisbon'

/**
 * Returns the UTC Date corresponding to midnight in Europe/Lisbon
 * for the given date string (YYYY-MM-DD).
 * Returns Invalid Date if the string is malformed.
 */
export function dayStartLisbon(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(NaN)
  // Midnight UTC baseline for that calendar date
  const midnight = new Date(`${dateStr}T00:00:00Z`)
  // Hour in Lisbon at midnight UTC (0 = winter UTC+0, 1 = summer UTC+1)
  const lisbonHour = +(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: 'numeric', hour12: false,
  }).format(midnight)) || 0
  return new Date(midnight.getTime() - lisbonHour * 3_600_000)
}

/**
 * Returns the UTC Date corresponding to 23:59:59.999 in Europe/Lisbon
 * for the given date string (YYYY-MM-DD).
 * Returns Invalid Date if the string is malformed.
 */
export function dayEndLisbon(dateStr: string): Date {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return new Date(NaN)
  const [y, m, d] = dateStr.split('-').map(Number)
  // Next calendar day in Lisbon = start of next UTC-adjusted day - 1ms
  const nextDate = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
  return new Date(dayStartLisbon(nextDate).getTime() - 1)
}

/**
 * Returns the UTC Date for the start of today in Europe/Lisbon.
 * Used for the "today's entries" summary.
 */
export function todayStartLisbon(): Date {
  return dayStartLisbon(new Date().toLocaleDateString('sv-SE', { timeZone: TZ }))
}
