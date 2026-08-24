/**
 * Agentra UI kit
 * ──────────────
 * Across four tabs (CEO/Employee × Attendance/Leave) everything was written
 * out separately — card, badge, filter chip, pagination, empty state. Each
 * with a slightly different Tailwind string, so the look shifted the moment
 * you switched tabs, and every fix had to be repeated everywhere it was
 * changed with it.
 *
 * All those pieces now live here in one place. Fix a colour or a spacing
 * once and it is fixed system-wide.
 *
 * ═══ THE COLOUR RULE ═══
 * EVERY container used to carry a green border (`border-[#05DC7F]/25`).
 * When everything stands out, nothing does — the eye has no idea where
 * to look.
 *
 * Now: containers are QUIET (a neutral border), and green appears only
 * where it means something — an active state, a primary action, good
 * news. Status colours (green/amber/red/sky) are reserved for status
 * alone, never for decoration.
 */

import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-react";
import { toneOf } from "./tokens";

const tone = toneOf;

/* ──────────────────────────────────────────
   Panel — the container for every card
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
   IconButton — an icon instead of text
   ────────────────────────────────────────── */
// `label` is not just a tooltip — it is required for screen readers, or an
// icon-only button is simply empty for those users
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
   Button — where words are necessary
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
   Pill — the status marker
   ────────────────────────────────────────── */
// Colour alone is never enough (colour-blindness, print, screenshots) — so
// the word is always alongside it, and an icon wherever possible
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
   StatCard — the numbers along the top
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
   FilterChips — one shape everywhere
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
   Select — a dropdown that is actually ours
   ──────────────────────────────────────────
   A native <select> paints its option list with the operating system,
   not with our CSS. On a dark panel that popup came out white while the
   inherited text stayed white — so every choice was invisible until you
   hovered it. `color-scheme: dark` fixes that on some platforms and not
   on others, which is exactly the kind of "works on my machine" we
   cannot ship.

   So the list here is plain DOM. It uses the same tokens as every other
   panel and behaves identically everywhere.

   `options` accepts `["a", "b"]` or `[{value, label, hint}]` — `hint` is
   a second line under the label, for choices that need explaining. */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const listRef = useRef(null);

  const items = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o,
  );
  const selectedIndex = items.findIndex(
    (o) => String(o.value) === String(value),
  );
  const current = selectedIndex >= 0 ? items[selectedIndex] : null;

  // ──── Close on an outside click, or on Escape ────
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // ──── Keep the highlighted row in view while arrowing ────
  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  const pick = (opt) => {
    onChange(opt.value);
    setOpen(false);
  };

  // Full keyboard support — a native select has it, so ours must too
  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (items[active]) pick(items[active]);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-2 rounded-lg border
          px-3 py-2 text-sm text-left transition
          ${
            disabled
              ? "bg-white/[0.02] border-white/[0.06] text-gray-600 cursor-not-allowed"
              : open
                ? "bg-white/[0.06] border-[#05DC7F]/50 text-white"
                : "bg-white/[0.03] border-white/[0.08] text-white hover:border-white/20"
          }`}
      >
        <span className={`truncate ${current ? "" : "text-gray-500"}`}>
          {current?.label ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-gray-500 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-30 mt-1.5 w-full max-h-64 overflow-auto rounded-xl
            border border-white/[0.12] bg-[#0b100e] p-1 shadow-2xl shadow-black/60"
        >
          {items.map((o, i) => {
            const on = String(o.value) === String(value);
            // A group header appears only where the group actually changes
            const newGroup = o.group && o.group !== items[i - 1]?.group;
            return (
              <li key={o.value}>
                {newGroup && (
                  <p className="px-2.5 pt-2 pb-1 text-gray-600 text-[10px] uppercase tracking-wider">
                    {o.group}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                  className={`w-full text-left rounded-lg px-2.5 py-2 text-sm
                    flex items-start gap-2 transition
                    ${on ? "text-[#05DC7F]" : "text-gray-300"}
                    ${i === active ? "bg-white/[0.07]" : ""}`}
                >
                  <Check
                    size={14}
                    className={`mt-0.5 shrink-0 ${on ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="min-w-0">
                    <span className="block">{o.label}</span>
                    {o.hint && (
                      <span className="block text-gray-500 text-[11px] leading-snug mt-0.5">
                        {o.hint}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
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
        label="Next page"
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
   Skeleton — better than "Loading..."
   ────────────────────────────────────────── */
// The bare word "Loading..." gives no clue how much data is coming. A
// skeleton draws the shape in advance, so the page does not jump when the
// data arrives.
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
    <div className="flex flex-col gap-2.5 py-2" aria-label="Loading">
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
   LiveDot — "this is updating by itself"
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
   Th / Td — one consistent table style
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
