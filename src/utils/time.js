/**
 * Waqt ki formatting
 * ──────────────────
 * Backend har jagah MINUTES bhejta hai (late_by_minutes, overtime_minutes,
 * undertime_minutes, early_checkout_minutes, total_pause_minutes) — wahi
 * sahi hai, raw data minutes mein rehna chahiye.
 *
 * Magar "125 min late" parhne mein mushkil hai. Yahan sirf DIKHANE ke liye
 * badalte hain: 60 se kam ho to minutes, warna ghante.
 */

/**
 * Minutes ko parhne layak banao.
 *
 *    45  ->  "45m"
 *    60  ->  "1h"
 *   125  ->  "2h 5m"
 *   120  ->  "2h"
 *
 * @param {number} mins
 * @param {object} [opts]
 * @param {string} [opts.empty="—"]   0 / null par kya dikhana hai
 * @param {boolean} [opts.short=false] "2h 5m" ki jagah sirf "2h" (tang jagah)
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
 * Ghanton ki tafseel jahan poora jumla likhna ho
 *    45  ->  "45 minute"
 *   125  ->  "2 ghante 5 minute"
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
