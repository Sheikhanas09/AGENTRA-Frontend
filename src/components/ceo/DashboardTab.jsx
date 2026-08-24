"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Building2,
  Briefcase,
  ClipboardCheck,
  UserCheck,
  UserX,
  Clock,
  CalendarDays,
  Coffee,
  ArrowRight,
  Hourglass,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatMinutes } from "../../utils/time";

const API = "http://127.0.0.1:8000";

const pktNow = () => new Date(Date.now() + 5 * 60 * 60 * 1000);

// ──── Paisa ────
const money = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-PK", { maximumFractionDigits: 0 });

// The full figure (1,842,300) overflows a tile at 3xl. Lac/Crore was
// chosen because the slip's `amount_in_words` uses the same scale — two
// different conventions in two places would look wrong.
const moneyShort = (n) => {
  if (n == null) return "—";
  const v = Number(n);
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)} L`;
  return money(v);
};

const fmtDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const fmtDateTime = (s) =>
  !s
    ? "—"
    : new Date(String(s).replace(" ", "T")).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

// ──── Series colours — tied to the entity, not to the rank ────
const SERIES = {
  present: "#05DC7F",
  absent: "#fb7185",
};

// ──────────────────────────────────────────
// Hero figure — how much of the team is present today
// ──────────────────────────────────────────
function PresenceRing({ present, total }) {
  const pct = total > 0 ? Math.round((present / total) * 100) : 0;
  const R = 58;
  const C = 2 * Math.PI * R;
  const filled = (Math.min(100, pct) / 100) * C;

  const stroke = pct >= 90 ? "#05DC7F" : pct >= 70 ? "#fbbf24" : "#fb7185";

  return (
    <div className="relative w-[150px] h-[150px] shrink-0">
      <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
        <circle
          cx="70" cy="70" r={R} fill="none"
          stroke={stroke} strokeOpacity="0.14" strokeWidth="9"
        />
        <circle
          cx="70" cy="70" r={R} fill="none"
          stroke={stroke} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${filled} ${C}`}
          style={{ transition: "stroke-dasharray 700ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[52px] leading-none font-bold text-white"
          style={{ textShadow: `0 0 24px ${stroke}55` }}
        >
          {pct}
          <span className="text-2xl text-gray-500">%</span>
        </span>
        <span className="text-gray-500 text-[11px] mt-1 tracking-wide uppercase">
          Present
        </span>
      </div>
    </div>
  );
}

function Tile({ label, value, sub, icon, tone = "neutral" }) {
  const tones = {
    neutral: "text-white",
    good: "text-[#05DC7F]",
    warn: "text-amber-400",
    bad: "text-rose-400",
    info: "text-sky-400",
    mute: "text-gray-500",
  };
  return (
    <div
      className="group relative overflow-hidden p-4 rounded-2xl border border-white/8
      bg-linear-to-br from-white/6 to-transparent
      hover:border-[#05DC7F]/40 hover:from-[#05DC7F]/8
      hover:shadow-[0_0_24px_rgba(5,220,127,0.15)] transition-all duration-300"
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

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-black/95 px-4 py-3 rounded-xl border border-white/15 text-xs shadow-xl">
      <p className="text-white font-semibold mb-2">{d.date}</p>
      <div className="flex flex-col gap-1">
        <span className="text-[#05DC7F]">Present: {d.present}</span>
        <span className="text-rose-400">Absent: {d.absent}</span>
        <span className="text-amber-400">Late: {d.late}</span>
        <span className="text-sky-400">On leave: {d.on_leave}</span>
      </div>
      {!d.is_working_day && (
        <p className="text-gray-500 mt-2 pt-2 border-t border-white/10">
          Off day
        </p>
      )}
    </div>
  );
}

export default function DashboardTab() {
  const token = localStorage.getItem("token");
  const firstName = (localStorage.getItem("full_name") || "").split(" ")[0];
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const [stats, setStats] = useState(null);
  const [todayTeam, setTodayTeam] = useState(null);
  const [trend, setTrend] = useState([]);
  const [pending, setPending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [runs, setRuns] = useState([]);
  const [range, setRange] = useState("weekly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ══════════════════════════════════════
  // Everything from real endpoints
  // ══════════════════════════════════════
  const fetchAll = useCallback(async () => {
    try {
      const [rRes, aRes, oRes, pRes, cRes, yRes] = await Promise.all([
        fetch(`${API}/recruitment/dashboard-stats`, { headers: authHeaders }),
        fetch(`${API}/attendance/flags/today`, { headers: authHeaders }),
        fetch(`${API}/attendance/overview?range=${range}`, {
          headers: authHeaders,
        }),
        fetch(`${API}/leave/pending`, { headers: authHeaders }),
        fetch(`${API}/leave/calendar`, { headers: authHeaders }),
        fetch(`${API}/payroll/runs`, { headers: authHeaders }),
      ]);

      if (rRes.ok) setStats(await rRes.json());
      if (aRes.ok) setTodayTeam(await aRes.json());
      if (oRes.ok) setTrend((await oRes.json()).data || []);
      if (pRes.ok) setPending((await pRes.json()).pending_requests || []);
      if (cRes.ok) setUpcoming((await cRes.json()).leaves || []);
      if (yRes.ok) setRuns((await yRes.json()).runs || []);
    } catch {
      setError("Could not connect to the server");
    }
    setLoading(false);
  }, [authHeaders, range]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ──── Keep today's data live ────
  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, 30000);
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
  const sum = todayTeam?.summary || {};
  const totalEmp = sum.total_employees ?? 0;
  const present = sum.present ?? 0;
  const isWorkingDay = todayTeam?.is_working_day !== false;

  // While a shift is running the "Absent" verdict is not final — showing
  // a red number then is wrong, those people can still arrive
  const shiftState = todayTeam?.shift_state;
  const attendanceFinal = shiftState ? !!shiftState.attendance_final : true;
  const notYetIn = (sum.pending ?? 0) + (sum.upcoming ?? 0);

  // ══════════════════════════════════════
  // Payroll — only what the CEO's decision is BLOCKING
  // ══════════════════════════════════════
  // This dashboard is about "today" (a 30-second refresh); payroll is a
  // monthly thing. So payroll is not given equal billing — it speaks only
  // when there is something to DO.
  //
  // `pending_approval` means: the slips exist, the money is calculated,
  // but **no email has gone out**. When the scheduler halts a run on
  // `_suspicious()` the CEO gets only an EMAIL — and emails get missed.
  // Payroll can then sit for weeks with nobody noticing. This row closes
  // that gap.
  //
  // `/payroll/runs` already comes back in descending period order
  const heldRun = useMemo(
    () => runs.find((r) => r.status === "pending_approval") || null,
    [runs],
  );
  const lastRun = useMemo(
    () => runs.find((r) => r.status !== "cancelled") || null,
    [runs],
  );

  const pipeline = stats?.pipeline || {};
  const pipelineRows = [
    { name: "Applied", value: pipeline.applied || 0 },
    { name: "Shortlisted", value: pipeline.shortlisted || 0 },
    { name: "Interviews", value: pipeline.interviews || 0 },
    { name: "Hired", value: pipeline.hired || 0 },
  ];
  const pipelineMax = Math.max(...pipelineRows.map((r) => r.value), 1);

  const nextUp = upcoming.slice(0, 4);
  const monthName = pktNow().toLocaleDateString("en-US", { month: "long" });

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

      {/* ══════ HERO — today's team ══════ */}
      <div
        className="relative overflow-hidden rounded-3xl border border-[#05DC7F]/20
        bg-linear-to-br from-[#05DC7F]/10 via-black/40 to-black/60 p-6 md:p-8"
        style={{ boxShadow: "0 0 60px -20px rgba(5,220,127,0.35)" }}
      >
        <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl opacity-40 bg-[#05DC7F]/30" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-gray-400 text-sm">
                {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
              </p>
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#05DC7F]/10 border border-[#05DC7F]/30 text-[#05DC7F] text-[10px]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05DC7F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#05DC7F]" />
                </span>
                Live
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mt-3 leading-none">
              {present}
              <span className="text-gray-600 text-2xl"> / {totalEmp}</span>
              <span className="text-gray-400 text-2xl font-normal ml-2">
                present today
              </span>
            </h1>

            <p className="text-gray-500 text-sm mt-2">
              {!isWorkingDay
                ? "Today is not a working day"
                : `${sum.on_break ?? 0} on break · ${sum.checked_out ?? 0} finished for the day`}
            </p>

            {/* ── Today's detail ── */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 mt-6">
              {[
                {
                  icon: <UserCheck size={14} />,
                  label: "Present",
                  value: present,
                  tone: "text-[#05DC7F]",
                },
                attendanceFinal
                  ? {
                      icon: <UserX size={14} />,
                      label: "Absent",
                      value: sum.absent ?? 0,
                      tone:
                        (sum.absent ?? 0) > 0 ? "text-rose-400" : "text-white",
                    }
                  : {
                      icon: <UserX size={14} />,
                      label: "Not in yet",
                      value: notYetIn,
                      tone: "text-gray-300",
                    },
                {
                  icon: <Clock size={14} />,
                  label: "Late",
                  value: sum.late ?? 0,
                  tone: (sum.late ?? 0) > 0 ? "text-amber-400" : "text-white",
                },
                {
                  icon: <CalendarDays size={14} />,
                  label: "On Leave",
                  value: sum.on_leave ?? 0,
                  tone: "text-sky-400",
                },
                {
                  icon: <Coffee size={14} />,
                  label: "On Break",
                  value: sum.on_break ?? 0,
                  tone: "text-white",
                },
              ].map((d) => (
                <div key={d.label}>
                  <div className="flex items-center gap-1.5 text-gray-600 mb-1">
                    {d.icon}
                    <span className="text-[10px] uppercase tracking-wider">
                      {d.label}
                    </span>
                  </div>
                  <p className={`text-lg font-semibold ${d.tone}`}>{d.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6 lg:border-l lg:border-white/10 lg:pl-8">
            <PresenceRing present={present} total={totalEmp} />
            {todayTeam?.policy && (
              <div className="hidden sm:block">
                <p className="text-gray-500 text-[11px] uppercase tracking-wider">
                  Shift
                </p>
                <p className="text-white text-xl font-bold mt-1">
                  {todayTeam.policy.shift_start}
                  <span className="text-gray-600"> – </span>
                  {todayTeam.policy.shift_end}
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Late after {formatMinutes(todayTeam.policy.late_tolerance_mins)}
                </p>
                {todayTeam.office && (
                  <p className="text-gray-500 text-xs">
                    {todayTeam.office.office_name} · {todayTeam.office.radius_meters}m
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════ Company tiles ══════ */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Tile
          label="Employees"
          value={stats?.total_employees ?? "—"}
          sub="active team"
          icon={<Users size={15} />}
        />
        <Tile
          label="Departments"
          value={stats?.total_departments ?? "—"}
          sub="in the company"
          icon={<Building2 size={15} />}
        />
        <Tile
          label="Open Positions"
          value={stats?.active_openings ?? "—"}
          sub="hiring in progress"
          icon={<Briefcase size={15} />}
          tone={stats?.active_openings > 0 ? "good" : "mute"}
        />
        <Tile
          label="Leave Approvals"
          value={pending.length}
          sub={pending.length > 0 ? "waiting for your response" : "all clear"}
          icon={<ClipboardCheck size={15} />}
          tone={pending.length > 0 ? "warn" : "mute"}
        />
        {/* A quiet tile — the hero figure stays the presence ring.
            A large payroll figure would bury today's attendance number */}
        <Tile
          label="Payroll"
          value={lastRun ? moneyShort(lastRun.total_payroll_cost) : "—"}
          sub={
            lastRun
              ? `${lastRun.period} · ${lastRun.employees_done} slips`
              : "no runs yet"
          }
          icon={<Wallet size={15} />}
          tone={lastRun ? "neutral" : "mute"}
        />
      </div>

      {/* ══════ Attendance trend — REAL data ══════ */}
      <div className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-transparent p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
          <div>
            <h2 className="text-white font-semibold">Attendance Trend</h2>
            <p className="text-gray-600 text-xs mt-0.5">
              {range === "weekly" ? "Last 7 days" : `${monthName} — every day`}
            </p>
          </div>

          <div className="flex gap-1 p-1 rounded-xl bg-black/40 border border-white/8">
            {["weekly", "monthly"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  range === r
                    ? "bg-[#05DC7F] text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full h-[260px]">
          {trend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No attendance data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff0f"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#6b7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6b7280"
                  fontSize={11}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#ffffff22" }} />
                <Legend
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 11, color: "#9ca3af" }}
                />
                <Line
                  name="Present"
                  type="monotone"
                  dataKey="present"
                  stroke={SERIES.present}
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: SERIES.present }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  name="Absent"
                  type="monotone"
                  dataKey="absent"
                  stroke={SERIES.absent}
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, strokeWidth: 0, fill: SERIES.absent }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ══════ Pipeline + Approvals ══════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Recruitment pipeline ── */}
        <div className="lg:col-span-3 rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-transparent p-6">
          <h2 className="text-white font-semibold mb-5">Recruitment Pipeline</h2>

          {pipelineRows.every((r) => r.value === 0) ? (
            <p className="text-gray-500 text-sm">
              No applications yet — post a job from the Recruitment tab
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {pipelineRows.map((row, i) => {
                const pct = (row.value / pipelineMax) * 100;
                const conv =
                  i > 0 && pipelineRows[i - 1].value > 0
                    ? Math.round((row.value / pipelineRows[i - 1].value) * 100)
                    : null;
                return (
                  <div key={row.name}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-gray-300 text-sm">{row.name}</span>
                      <span className="text-white text-sm font-semibold">
                        {row.value}
                        {conv != null && (
                          <span className="text-gray-600 font-normal text-xs">
                            {" "}
                            · {conv}% moved forward
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#05DC7F]/12 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#05DC7F] transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Pending approvals ── */}
        <div className="lg:col-span-2 rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-transparent p-6">
          <div className="flex justify-between items-baseline mb-5">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Hourglass size={16} className="text-amber-400" />
              Needs your response
            </h2>
            {pending.length + (heldRun ? 1 : 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/40">
                {pending.length + (heldRun ? 1 : 0)}
              </span>
            )}
          </div>

          {/* ── Payroll first ── */}
          {/* A leave request is one person's one day; a blocked payroll is
              the WHOLE team's whole month — and none of its slips are
              emailed until the CEO approves. Hence the top spot */}
          {heldRun && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07]">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={15}
                  className="text-amber-400 shrink-0 mt-0.5"
                />
                <div className="min-w-0">
                  <p className="text-gray-200 text-sm">
                    Payroll for {heldRun.period} has not been approved
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {heldRun.employees_done} slips tayyar ·{" "}
                    {money(heldRun.total_payroll_cost)} PKR ·{" "}
                    <span className="text-amber-400/90">no email sent</span>
                  </p>

                  {/* If the scheduler halted it, the reason is written
                      right here — no waiting for the email */}
                  {heldRun.error_note && (
                    <p className="text-amber-400/80 text-[11px] mt-1">
                      {heldRun.error_note}
                    </p>
                  )}
                  {heldRun.employees_failed > 0 && (
                    <p className="text-rose-400/90 text-[11px] mt-1">
                      {heldRun.employees_failed} employee slip(s) failed —
                      is the salary structure set?
                    </p>
                  )}

                  <p className="text-gray-500 text-[11px] mt-1.5 flex items-center gap-1">
                    Approve &amp; Disburse from the Payroll tab
                    <ArrowRight size={11} />
                  </p>
                </div>
              </div>
            </div>
          )}

          {pending.length === 0 ? (
            !heldRun && (
              <p className="text-gray-500 text-sm">
                No pending requests — all clear
              </p>
            )
          ) : (
            <div className="flex flex-col">
              {pending.slice(0, 4).map((p, i) => (
                <div
                  key={p.leave_id}
                  className={`py-3 ${i < Math.min(pending.length, 4) - 1 ? "border-b border-white/5" : ""}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="text-gray-200 text-sm truncate">
                        {p.employee_name}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {p.leave_type} · {fmtDate(p.start_date)}
                        {p.start_date !== p.end_date && (
                          <> — {fmtDate(p.end_date)}</>
                        )}
                        <span className="text-gray-600">
                          {" "}
                          · {p.deductible_days}d
                        </span>
                      </p>
                    </div>
                  </div>
                  {p.auto_approve_at && (
                    <p className="text-amber-400/80 text-[11px] mt-1">
                      will auto-approve on {fmtDateTime(p.auto_approve_at)}
                    </p>
                  )}
                </div>
              ))}

              {pending.length > 4 && (
                <p className="text-gray-500 text-xs mt-3 flex items-center gap-1">
                  {pending.length - 4} more — see the Leave tab
                  <ArrowRight size={11} />
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════ Upcoming leave ══════ */}
      {nextUp.length > 0 && (
        <div className="rounded-2xl border border-white/8 bg-linear-to-br from-white/5 to-transparent p-6">
          <h2 className="text-white font-semibold mb-5 flex items-center gap-2">
            <CalendarDays size={16} className="text-sky-400" />
            Upcoming leave
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {nextUp.map((l) => (
              <div
                key={l.leave_id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/8 bg-black/20"
              >
                <div className="w-9 h-9 rounded-full bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 font-semibold text-sm shrink-0">
                  {l.employee_name?.charAt(0) || "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-gray-200 text-sm truncate">
                    {l.employee_name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {fmtDate(l.start_date)}
                    {l.start_date !== l.end_date && (
                      <> — {fmtDate(l.end_date)}</>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
