/**
 * Time formatting
 * ──────────────────
 * The backend sends MINUTES everywhere (late_by_minutes, overtime_minutes,
 * undertime_minutes, early_checkout_minutes, total_pause_minutes) — wahi
 * right — the raw data should stay in minutes.
 *
 * But "125 min late" is hard to read. This converts it for DISPLAY only:
 * under 60 stays in minutes, otherwise hours.
 */

/**
 * Make a minute count readable.
 *
 *    45  ->  "45m"
 *    60  ->  "1h"
 *   125  ->  "2h 5m"
 *   120  ->  "2h"
 *
 * @param {number} mins
 * @param {object} [opts]
 * @param {string} [opts.empty="—"]   what to show for 0 / null
 * @param {boolean} [opts.short=false] just "2h" instead of "2h 5m" (tight space)
 */
export function formatMinutes(mins, opts = {}) {
  const { empty = "—", short = false } = opts;

  const total = Math.round(Number(mins) || 0);
  if (total <= 0) return empty;

  if (total < 60) return `${total}m`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;

  if (rest === 0 || short) return `${hours}h`;
  return `${hours}h ${rest}m`;
}

/**
 * A spelled-out form of hours, for full sentences
 *    45  ->  "45 minute"
 *   125  ->  "2 hours 5 minutes"
 */
export function formatMinutesLong(mins) {
  const total = Math.round(Number(mins) || 0);
  if (total <= 0) return "0 minute";
  if (total < 60) return `${total} minute`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;
  const h = `${hours} ghant${hours === 1 ? "a" : "e"}`;
  return rest ? `${h} ${rest} minute` : h;
}
