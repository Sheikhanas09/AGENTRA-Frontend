/**
 * Agentra UI kit
 * ──────────────
 * Chaar tabs (CEO/Employee × Attendance/Leave) mein har cheez alag alag
 * likhi hui thi — card, badge, filter chip, pagination, empty state. Har
 * jagah thori si alag Tailwind string, is liye tabs badalte hi look badal
 * jata tha.
 *
 * Ab wo saare tukre yahan ek jagah hain. Kisi ek jagah rang ya spacing
 * theek karo to poore system mein theek hota hai.
 *
 * ═══ RANG KA USOOL ═══
 * Pehle HAR container par green border thi (`border-[#05DC7F]/25`). Jab
 * har cheez numayan ho to koi cheez numayan nahi hoti — aankh ko pata hi
 * nahi chalta kahan dekhe.
 *
 * Ab: container KHAMOSH (neutral border), aur green sirf wahan jahan
 * matlab ho — active state, primary action, aur achhi khabar. Status ke
 * rang (green/amber/red/sky) sirf status ke liye mehfooz hain, sajawat
 * ke liye kabhi nahi.
 */

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toneOf } from "./tokens";

const tone = toneOf;

/* ──────────────────────────────────────────
   Panel — har card ka container
   ────────────────────────────────────────── */
export function Panel({ title, subtitle, icon: Icon, actions, children, className = "", bodyClass = "" }) {
  const hasHead = title || actions;
  return (
    <section
      className={`rounded-2xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm ${className}`}
    >
      {hasHead && (
        <header className="flex items-start justify-between gap-4 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h2 className="text-white text-[15px] font-semibold flex items-center gap-2">
              {Icon && <Icon size={15} className="text-[#05DC7F] shrink-0" />}
              <span className="truncate">{title}</span>
            </h2>
            {subtitle && (
              <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-1.5 shrink-0">{actions}</div>
          )}
        </header>
      )}
      <div className={hasHead ? `px-5 pb-5 ${bodyClass}` : `p-5 ${bodyClass}`}>
        {children}
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────
   IconButton — text ki jagah icon
   ────────────────────────────────────────── */
// `label` sirf tooltip nahi — screen reader ke liye bhi lazmi hai, warna
// icon-only button un logon ke liye khali reh jata hai
export function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  busy,
  tone: t = "muted",
  size = 15,
  className = "",
}) {
  const c = tone(t);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center rounded-lg border p-2
        ${c.bg} ${c.text} ${c.border}
        hover:brightness-125 active:scale-95
        disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:brightness-100
        transition ${className}`}
    >
      {busy ? (
        <Loader2 size={size} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size} />
      ) : null}
    </button>
  );
}

/* ──────────────────────────────────────────
   Button — jahan lafz zaroori hain
   ────────────────────────────────────────── */
export function Button({
  icon: Icon,
  children,
  onClick,
  disabled,
  busy,
  variant = "ghost",
  tone: t = "ok",
  className = "",
  type = "button",
}) {
  const c = tone(t);
  const styles =
    variant === "primary"
      ? "bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] border-transparent"
      : `${c.bg} ${c.text} ${c.border} hover:brightness-125`;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border
        px-3.5 py-2 text-sm transition active:scale-[0.98]
        disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
        ${styles} ${className}`}
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        Icon && <Icon size={15} />
      )}
      {children}
    </button>
  );
}

/* ──────────────────────────────────────────
   Pill — status ka nishan
   ────────────────────────────────────────── */
// Rang akela kabhi kafi nahi (colour-blind, print, screenshot) — is liye
// lafz hamesha saath hota hai, aur icon jahan mumkin ho
export function Pill({ tone: t = "muted", icon: Icon, children, title, className = "" }) {
  const c = tone(t);
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1
        text-[11px] font-semibold whitespace-nowrap
        ${c.bg} ${c.text} ${c.border} ${className}`}
    >
      {Icon && <Icon size={11} />}
      {children}
    </span>
  );
}

/* ──────────────────────────────────────────
   StatCard — upar wale numbers
   ────────────────────────────────────────── */
export function StatCard({ icon: Icon, label, value, sub, tone: t = "muted", onClick, active }) {
  const c = tone(t);
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`text-left rounded-2xl border p-4 transition w-full
        ${active
          ? `${c.border} ${c.bg}`
          : "border-white/[0.07] bg-white/[0.02]"}
        ${onClick ? "hover:border-white/20 active:scale-[0.99] cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-gray-500 text-[11px] uppercase tracking-wider truncate">
          {label}
        </p>
        {Icon && <Icon size={15} className={`${c.text} shrink-0`} />}
      </div>
      <p className={`text-2xl font-bold mt-1.5 tabular-nums ${c.text}`}>
        {value}
      </p>
      {sub && <p className="text-gray-500 text-[11px] mt-0.5 truncate">{sub}</p>}
    </Tag>
  );
}

/* ──────────────────────────────────────────
   FilterChips — ek hi shakal har jagah
   ────────────────────────────────────────── */
export function FilterChips({ options, value, onChange, counts }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const key = typeof opt === "string" ? opt : opt.value;
        const label = typeof opt === "string" ? opt : opt.label;
        const on = value === key;
        const n = counts?.[key];

        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition
              inline-flex items-center gap-1.5 border
              ${on
                ? "bg-[#05DC7F] text-black border-transparent"
                : "bg-white/[0.03] text-gray-400 border-white/[0.08] hover:border-white/20 hover:text-gray-200"}`}
          >
            {label}
            {n != null && (
              <span
                className={`tabular-nums text-[10px] px-1.5 rounded ${
                  on ? "bg-black/20" : "bg-white/[0.07]"
                }`}
              >
                {n}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ──────────────────────────────────────────
   Pagination
   ────────────────────────────────────────── */
export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex justify-end items-center gap-2 mt-4">
      <IconButton
        icon={ChevronLeft}
        label="Pichhla page"
        disabled={page === 1}
        onClick={() => onChange(Math.max(1, page - 1))}
      />
      <span className="text-gray-400 text-xs tabular-nums px-1">
        {page} / {totalPages}
      </span>
      <IconButton
        icon={ChevronRight}
        label="Agla page"
        disabled={page === totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
      />
    </div>
  );
}

/* ──────────────────────────────────────────
   EmptyState
   ────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2">
      {Icon && (
        <div className="w-11 h-11 rounded-full bg-white/[0.04] flex items-center justify-center mb-1">
          <Icon size={19} className="text-gray-600" />
        </div>
      )}
      <p className="text-gray-300 text-sm font-medium">{title}</p>
      {hint && <p className="text-gray-600 text-xs max-w-xs">{hint}</p>}
      {action}
    </div>
  );
}

/* ──────────────────────────────────────────
   Skeleton — "Loading..." se behtar
   ────────────────────────────────────────── */
// Khali lafz "Loading..." se banda andaza nahi laga sakta ke kitna data
// aane wala hai. Skeleton aane wali shakal pehle hi bana deta hai, is liye
// data aane par page uchalta bhi nahi.
export function Skeleton({ className = "h-4 w-full" }) {
  return (
    <div
      className={`animate-pulse rounded bg-white/[0.06] ${className}`}
      aria-hidden="true"
    />
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="flex flex-col gap-2.5 py-2" aria-label="Load ho raha hai">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 items-center">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={`h-4 ${c === 0 ? "w-40" : "flex-1"} ${
                r % 2 ? "opacity-70" : ""
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────
   LiveDot — "yeh khud update ho raha hai"
   ────────────────────────────────────────── */
export function LiveDot({ live, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] text-gray-500"
      title={label}
    >
      <span className="relative flex w-2 h-2">
        {live && (
          <span className="absolute inline-flex w-full h-full rounded-full bg-[#05DC7F] opacity-60 animate-ping" />
        )}
        <span
          className={`relative inline-flex w-2 h-2 rounded-full ${
            live ? "bg-[#05DC7F]" : "bg-gray-600"
          }`}
        />
      </span>
      {label}
    </span>
  );
}

/* ──────────────────────────────────────────
   Th / Td — table ki ek hi shakal
   ────────────────────────────────────────── */
export function Th({ children, className = "" }) {
  return (
    <th
      className={`text-left text-[10.5px] uppercase tracking-wider text-gray-500
        font-semibold py-2.5 px-4 whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = "" }) {
  return (
    <td className={`py-3 px-4 text-sm text-gray-300 ${className}`}>
      {children}
    </td>
  );
}
