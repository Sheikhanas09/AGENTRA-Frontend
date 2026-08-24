/**
 * Design tokens
 * ─────────────
 * The colours live here, not in the components. A separate file because
 * Vite's fast refresh only works in a file that exports *only* components —
 * keeping constants alongside them forces a full module reload.
 *
 * ═══ STATUS COLOURS ARE RESERVED ═══
 * green/amber/red/sky exist to convey STATE — never for decoration.
 * Otherwise "red" stops meaning anything at all.
 */

export const ACCENT = "#05DC7F";

export const SERIES = {
  present: "#05DC7F",
  absent: "#fb7185",
  late: "#fbbf24",
  leave: "#38bdf8",
};

export const TONES = {
  ok: {
    text: "text-[#05DC7F]",
    bg: "bg-[#05DC7F]/12",
    border: "border-[#05DC7F]/30",
    dot: "bg-[#05DC7F]",
  },
  warn: {
    text: "text-amber-400",
    bg: "bg-amber-400/12",
    border: "border-amber-400/30",
    dot: "bg-amber-400",
  },
  bad: {
    text: "text-rose-400",
    bg: "bg-rose-400/12",
    border: "border-rose-400/30",
    dot: "bg-rose-400",
  },
  info: {
    text: "text-sky-400",
    bg: "bg-sky-400/12",
    border: "border-sky-400/30",
    dot: "bg-sky-400",
  },
  ai: {
    text: "text-violet-400",
    bg: "bg-violet-400/12",
    border: "border-violet-400/30",
    dot: "bg-violet-400",
  },
  muted: {
    text: "text-gray-400",
    bg: "bg-white/[0.06]",
    border: "border-white/15",
    dot: "bg-gray-500",
  },
};

export const toneOf = (t) => TONES[t] || TONES.muted;
