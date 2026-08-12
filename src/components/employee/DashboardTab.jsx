"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  Clock,
  CalendarDays,
  CalendarCheck,
  AlertTriangle,
  Coffee,
  TrendingUp,
  TrendingDown,
  FileText,
  MapPin,
  Timer,
} from "lucide-react";
import { formatMinutes } from "../../utils/time";

const API = "http://127.0.0.1:8000";

// ──── PKT (UTC+5) — backend isi par chalta hai ────
const pktNow = () => new Date(Date.now() + 5 * 60 * 60 * 1000);

const fmtTime = (dt) =>
  !dt
    ? "—"
    : new Date(String(dt).replace(" ", "T")).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });

const fmtDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

// ──── Status colors reserved hain — hamesha text label ke saath ────
const STATUS_STYLE = {
  approved: "bg-[#05DC7F]/15 text-[#05DC7F] border-[#05DC7F]/40",
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/40",
  rejected: "bg-rose-500/15 text-rose-400 border-rose-500/40",
  cancelled: "bg-white/5 text-gray-400 border-white/15",
  evaluating: "bg-sky-500/15 text-sky-400 border-sky-500/40",
};

// ──────────────────────────────────────────
// Attendance rate ring — hero figure
// ──────────────────────────────────────────
function RateRing({ value }) {
  const R = 58;
  const C = 2 * Math.PI * R;
  const filled = (Math.min(100, Math.max(0, value)) / 100) * C;

  // Fill severity carry karti hai; track usi hue ka halka step hai
  const stroke =
    value >= 90 ? "#05DC7F" : value >= 75 ? "#fbbf24" : "#fb7185";

  return (
    <div className="relative w-[150px] h-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke={stroke}
          strokeOpacity="0.14"
          strokeWidth="9"
        />
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke={stroke}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${C}`}
          style={{ transition: "stroke-dasharray 700ms ease-out" }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[52px] leading-none font-bold text-white"
          style={{ textShadow: `0 0 24px ${stroke}55` }}
        >
          {value}
          <span className="text-2xl text-gray-500">%</span>
        </span>
        <span className="text-gray-500 text-[11px] mt-1 tracking-wide uppercase">
          Attendance
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────
// Chhota stat tile
// ──────────────────────────────────────────
function Tile({ label, value, sub, icon, tone = "neutral" }) {
  const tones = {
    neutral: "text-white",
    good: "text-[#05DC7F]",
    warn: "text-amber-400",
    bad: "text-rose-400",
    mute: "text-gray-500",
  };

  return (
    <div
      className="group relative overflow-hidden p-4 rounded-2xl border border-white/8
      bg-linear-to-br from-white/6 to-transparent
      hover:border-[#05DC7F]/40 hover:from-[#05DC7F]/8
      hover:shadow-[0_0_24px_rgba(5,220,127,0.15)]
      transition-all duration-300"
    >
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <span className="opacity-70 group-hover:text-[#05DC7F]/70 transition-colors">
          {icon}
        </span>
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-3xl font-bold leading-none ${tones[tone]}`}>{value}</p>
      {sub && <p className="text-gray-600 text-[11px] mt-1.5">{sub}</p>}
    </div>
  );
}

export default function DashboardTab() {
  const token = localStorage.getItem("token");
  const employeeId = localStorage.getItem("user_id");
  const firstName = (localStorage.getItem("full_name") || "").split(" ")[0];
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const [today, setToday] = useState(null);
  const [summary, setSummary] = useState(null);
  const [balances, setBalances] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    if (!employeeId) {
      setError("Login dobara karein — user id nahi mili");
      setLoading(false);
      return;
    }

    const now = pktNow();
    try {
      const [tRes, sRes, bRes, lRes] = await Promise.all([
        fetch(`${API}/attendance/today/${employeeId}`, { headers: authHeaders }),
        fetch(
          `${API}/attendance/summary/${employeeId}/${now.getFullYear()}/${now.getMonth() + 1}`,
          { headers: authHeaders },
        ),
        fetch(`${API}/leave/balance/${employeeId}`, { headers: authHeaders }),
        fetch(`${API}/leave/history/${employeeId}?limit=5`, {
          headers: authHeaders,
        }),
      ]);

      if (tRes.ok) setToday(await tRes.json());
      if (sRes.ok) setSummary(await sRes.json());
      if (bRes.ok) setBalances((await bRes.json()).balances || []);
      if (lRes.ok) setLeaves((await lRes.json()).history || []);
    } catch {
      setError("Server se connect nahi ho paya");
    }
    setLoading(false);
  }, [employeeId, authHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ──── Har minute + tab focus par taza ────
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, 60000);
    const onFocus = () => fetchAll();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAll]);

  // ══════════════════════════════════════
  // Derived
  // ══════════════════════════════════════
  const status = today?.status || "not_checked_in";

  const STATE = {
    checked_in: {
      text: "Working",
      color: "text-[#05DC7F]",
      glow: "rgba(5,220,127,0.35)",
      icon: <CheckCircle2 size={30} className="text-[#05DC7F]" />,
      live: true,
    },
    paused: {
      text: "On Break",
      color: "text-amber-400",
      glow: "rgba(251,191,36,0.30)",
      icon: <Coffee size={30} className="text-amber-400" />,
      live: true,
    },
    checked_out: {
      text: "Day Complete",
      color: "text-[#05DC7F]",
      glow: "rgba(5,220,127,0.25)",
      icon: <CheckCircle2 size={30} className="text-[#05DC7F]" />,
    },
    on_leave: {
      text: "On Leave",
      color: "text-sky-400",
      glow: "rgba(56,189,248,0.28)",
      icon: <CalendarDays size={30} className="text-sky-400" />,
    },
    not_checked_in: {
      text: "Not Checked In",
      color: "text-gray-400",
      glow: "rgba(255,255,255,0.10)",
      icon: <Clock size={30} className="text-gray-400" />,
    },
  }[status];

  const totalLeaveLeft = balances
    .filter((b) => !b.unlimited)
    .reduce((s, b) => s + (b.remaining_days || 0), 0);

  const pendingLeaves = leaves.filter(
    (l) => l.status === "pending" || l.status === "evaluating",
  ).length;

  const presentDays = summary?.present_days ?? 0;
  const lateCount = summary?.late_count ?? 0;
  const otMins = summary?.overtime_total_minutes ?? 0;
  const utMins = summary?.undertime_total_minutes ?? 0;
  const netHours = summary?.total_net_hours ?? 0;
  const avgHours = summary?.avg_net_hours ?? 0;
  const leaveDays = summary?.leave_days ?? 0;

  const rateBase = presentDays + leaveDays;
  const rate = rateBase > 0 ? Math.round((presentDays / rateBase) * 100) : 0;
  const monthName = pktNow().toLocaleDateString("en-US", { month: "long" });

  const liveHours =
    today?.net_hours != null
      ? today.net_hours
      : today?.elapsed_seconds
        ? today.elapsed_seconds / 3600
        : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-[#05DC7F] border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6">
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* ══════ HERO ══════ */}
      <div
        className="relative overflow-hidden rounded-3xl border border-[#05DC7F]/20
        bg-linear-to-br from-[#05DC7F]/10 via-black/40 to-black/60 p-6 md:p-8"
        style={{ boxShadow: `0 0 60px -20px ${STATE.glow}` }}
      >
        {/* halka glow orb */}
        <div
          className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40"
          style={{ background: STATE.glow }}
        />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
          {/* ── Status ── */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-400 text-sm">
              {firstName ? `Assalam-o-Alaikum, ${firstName}` : "Assalam-o-Alaikum"}
            </p>

            <div className="flex items-center gap-4 mt-4">
              <div className="relative shrink-0">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-sm">
                  {STATE.icon}
                </div>
                {STATE.live && (
                  <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05DC7F] opacity-60" />
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#05DC7F] border-2 border-black" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <h1
                  className={`text-3xl md:text-4xl font-bold leading-none ${STATE.color}`}
                >
                  {STATE.text}
                </h1>
                <p className="text-gray-500 text-sm mt-2">
                  {today?.on_leave
                    ? "Aaj aap approved leave par hain"
                    : today?.check_in_time
                      ? `Check-in ${fmtTime(today.check_in_time)}${
                          today.is_late
                            ? ` · ${formatMinutes(today.late_by_minutes)} late`
                            : ""
                        }`
                      : today?.checkin_window?.open === false
                        ? today.checkin_window.message
                        : "Attendance tab se check-in karein"}
                </p>
              </div>
            </div>

            {/* ── Aaj ki tafseel ── */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6">
              {[
                {
                  icon: <Timer size={14} />,
                  label: "Hours today",
                  value: liveHours != null ? `${liveHours.toFixed(1)}h` : "—",
                },
                {
                  icon: <Coffee size={14} />,
                  label: "Break",
                  value: formatMinutes(today?.total_pause_minutes),
                },
                {
                  icon: <Clock size={14} />,
                  label: "Check-out",
                  value: fmtTime(today?.check_out_time),
                },
                {
                  icon: <MapPin size={14} />,
                  label: "Location",
                  value: !today?.check_in_time
                    ? "—"
                    : today?.location_verified
                      ? "Verified"
                      : "Unverified",
                  tone: !today?.check_in_time
                    ? "text-gray-500"
                    : today?.location_verified
                      ? "text-[#05DC7F]"
                      : "text-rose-400",
                },
              ].map((d) => (
                <div key={d.label}>
                  <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                    {d.icon}
                    <span className="text-[10px] uppercase tracking-wider">
                      {d.label}
                    </span>
                  </div>
                  <p
                    className={`text-lg font-semibold ${d.tone || "text-white"}`}
                  >
                    {d.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Hero figure ── */}
          <div className="flex items-center gap-6 lg:border-l lg:border-white/10 lg:pl-8">
            <RateRing value={rate} />
            <div className="hidden sm:block">
              <p className="text-gray-500 text-[11px] uppercase tracking-wider">
                {monthName}
              </p>
              <p className="text-white text-2xl font-bold mt-1">
                {presentDays}
                <span className="text-gray-600 text-base"> din hazir</span>
              </p>
              <p className="text-gray-500 text-xs mt-2">
                {netHours.toFixed(1)}h total
              </p>
              <p className="text-gray-500 text-xs">
                avg {avgHours.toFixed(1)}h / din
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════ Month tiles ══════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Tile
          label="Present"
          value={presentDays}
          sub={`${monthName} mein`}
          icon={<CalendarCheck size={15} />}
        />
        <Tile
          label="On Leave"
          value={leaveDays}
          sub="approved days"
          icon={<CalendarDays size={15} />}
          tone={leaveDays > 0 ? "neutral" : "mute"}
        />
        <Tile
          label="Late"
          value={lateCount}
          sub={lateCount > 0 ? "dair se aaye" : "waqt par"}
          icon={<AlertTriangle size={15} />}
          tone={lateCount > 0 ? "warn" : "mute"}
        />
        <Tile
          label="Overtime"
          value={formatMinutes(otMins, { empty: "0m" })}
          sub={otMins > 0 ? "extra kaam" : "koi nahi"}
          icon={<TrendingUp size={15} />}
          tone={otMins > 0 ? "good" : "mute"}
        />
        <Tile
          label="Undertime"
          value={formatMinutes(utMins, { empty: "0m" })}
          sub={utMins > 0 ? "kam waqt" : "poora waqt"}
          icon={<TrendingDown size={15} />}
          tone={utMins > 0 ? "bad" : "mute"}
        />
      </div>

      {/* ══════ Leave ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Balance meters ── */}
        <div className="lg:col-span-3 rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-transparent p-6">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="text-white font-semibold">Leave Balance</h2>
            <span className="text-[#05DC7F] text-sm font-semibold">
              {totalLeaveLeft}
              <span className="text-gray-600 font-normal"> din baqi</span>
            </span>
          </div>

          {balances.length === 0 ? (
            <p className="text-gray-500 text-sm">Koi leave type set nahi</p>
          ) : (
            <div className="flex flex-col gap-4">
              {balances.map((b) => {
                const pct =
                  b.unlimited || b.total_entitlement <= 0
                    ? 0
                    : Math.min(
                        100,
                        ((b.used_days || 0) / b.total_entitlement) * 100,
                      );
                const low = !b.unlimited && b.remaining_days <= 2;
                const none = !b.unlimited && b.total_entitlement === 0;

                // Fill severity carry karti hai; track usi hue ka halka step
                const hue = none
                  ? "#6b7280"
                  : low
                    ? "#fb7185"
                    : "#05DC7F";

                return (
                  <div key={b.leave_type}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-gray-300 text-sm truncate">
                        {b.label || b.leave_type}
                        {b.requires_certificate && (
                          <span className="ml-2 text-[10px] text-rose-400/70">
                            certificate
                          </span>
                        )}
                      </span>
                      <span
                        className="text-sm font-semibold shrink-0"
                        style={{ color: hue }}
                      >
                        {b.unlimited
                          ? "∞"
                          : none
                            ? "allowed nahi"
                            : `${b.remaining_days} / ${b.total_entitlement}`}
                      </span>
                    </div>

                    {!b.unlimited && !none && (
                      <div
                        className="h-2 w-full rounded-full overflow-hidden"
                        style={{ background: `${hue}22` }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: hue }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Recent requests ── */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-transparent p-6">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <FileText size={16} className="text-[#05DC7F]" />
              Recent Requests
            </h2>
            {pendingLeaves > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/40">
                {pendingLeaves} pending
              </span>
            )}
          </div>

          {leaves.length === 0 ? (
            <p className="text-gray-500 text-sm">
              Abhi tak koi request nahi — Leave tab se apply karein
            </p>
          ) : (
            <div className="flex flex-col">
              {leaves.map((l, i) => (
                <div
                  key={l.leave_id}
                  className={`flex justify-between items-start gap-3 py-3 ${
                    i < leaves.length - 1 ? "border-b border-white/5" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-gray-300 text-sm truncate">
                      {l.label || l.leave_type}
                      <span className="text-gray-600 text-xs">
                        {" "}
                        · {l.deductible_days}d
                      </span>
                    </p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      {fmtDate(l.start_date)}
                      {l.start_date !== l.end_date && (
                        <> — {fmtDate(l.end_date)}</>
                      )}
                    </p>
                    {l.ceo_note && (
                      <p className="text-gray-600 text-[11px] mt-1 line-clamp-2">
                        {l.ceo_note}
                      </p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      STATUS_STYLE[l.status] || ""
                    }`}
                  >
                    {l.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
