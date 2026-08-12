"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
// Poore system mein ek hi icon set — pehle CEO ke do tabs Font Awesome
// use karte the aur baqi sab Lucide. FA bhare hue icons hain, Lucide
// patli lakeer ke — dono ek saath dekhne mein saaf pata chalta tha ke
// yeh do alag jagah se bane hain.
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Camera,
  RefreshCw,
  Moon,
  CalendarOff,
  Search,
  TrendingUp,
  UserRound,
} from "lucide-react";
import {
  Panel,
  IconButton,
  StatCard,
  Pill,
  FilterChips,
  Pagination,
  EmptyState,
  TableSkeleton,
  LiveDot,
  Th,
} from "../ui/kit";
import { formatMinutes } from "../../utils/time";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const API = "http://127.0.0.1:8000";

// ──────────────────────────────────────────
// "Aaj" ka faisla SERVER karta hai
// ──────────────────────────────────────────
// Do wajah se:
//  1. toISOString() UTC date deta hai — raat 12:32 AM PKT pe wo abhi
//     PICHHLA din hota hai (7:32 PM UTC)
//  2. Raat ki shift (22:00-05:00) mein attendance ka din SHIFT ka din hota
//     hai, calendar ka nahi. 12 baje ke baad bhi wo pichhla din rehta hai —
//     agli date ki attendance abhi shuru hi nahi hui hoti.
//
// Isliye pehli baar report_date bheja hi nahi jata: server apna work date
// batata hai aur date picker usi se set hota hai.

// ──── Poll interval — check-in/out foran nazar aaye ────
const LIVE_REFRESH_MS = 10000;

// ──────────────────────────────────────────
// Chart tooltip
// ──────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-black/95 px-4 py-3 rounded-lg border border-[#05DC7F]/30 text-xs">
      <p className="text-white font-semibold mb-1">{d.date || label}</p>
      <p className="text-[#05DC7F]">Present: {d.present}</p>
      <p className="text-yellow-400">Late: {d.late}</p>
      <p className="text-blue-400">On Leave: {d.on_leave}</p>
      <p className="text-red-400">Absent: {d.absent}</p>
      {d.pending > 0 && (
        <p className="text-gray-300">Not checked in yet: {d.pending}</p>
      )}
      {!d.is_working_day && <p className="text-gray-500 mt-1">Off day</p>}
    </div>
  );
}

// ──────────────────────────────────────────
// Location badge — verified + distance + accuracy
// ──────────────────────────────────────────
function LocationBadge({ lat, lng, verified, distance, note }) {
  if (lat == null || lng == null) {
    // ──── GPS mili hi nahi ────
    if (note === "gps_unavailable") {
      return (
        <span
          title="Employee ne GPS permission nahi di ya location nahi mili"
          className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30"
        >
          No GPS
        </span>
      );
    }
    return <span className="text-gray-500 text-xs">—</span>;
  }

  const skipped = note === "gps_unreliable" || note === "office_not_set";

  const style = skipped
    ? "bg-gray-500/20 text-gray-300 border-gray-500/30"
    : verified
      ? "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";

  const label = skipped
    ? "Not checked"
    : verified
      ? `In office${distance != null ? ` · ${Math.round(distance)}m` : ""}`
      : `Outside${distance != null ? ` · ${Math.round(distance)}m` : ""}`;

  const title = {
    gps_unreliable: "GPS accuracy bohot kam thi — verification skip kiya",
    office_not_set: "Office location set nahi hai",
    in_range: "Office radius ke andar",
    out_of_range: "Office radius se bahar",
  }[note];

  return (
    <a
      href={`https://maps.google.com/?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      title={title}
      className={`inline-block px-2 py-0.5 text-xs rounded-full border hover:opacity-80 transition ${style}`}
    >
      📍 {label}
    </a>
  );
}

export default function Attendance() {
  const token = localStorage.getItem("token");

  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({
    total_employees: 0,
    present: 0,
    late: 0,
    absent: 0,
    on_leave: 0,
    on_break: 0,
    checked_out: 0,
  });
  const [isWorkingDay, setIsWorkingDay] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [office, setOffice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // Khali = "server tu bata aaj kaunsa din hai" (raat ki shift ke liye zaroori)
  const [todayStr, setTodayStr] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [isOvernight, setIsOvernight] = useState(false);
  const [shiftState, setShiftState] = useState(null);
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isLive = !!todayStr && selectedDate === todayStr;

  // ──── Chart ────
  const [activeView, setActiveView] = useState("weekly");
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(true);

  // ──── Photo modal ────
  const [photo, setPhoto] = useState(null); // {url, name, kind}

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  // ──────────────────────────────────────
  // Team attendance (kisi bhi din ka)
  // ──────────────────────────────────────
  // silent = background refresh, "Loading..." flash nahi hoga
  const fetchAttendance = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        // selectedDate khali ho to server apna work date istemal karega
        const res = await fetch(
          `${API}/attendance/flags/today${
            selectedDate ? `?report_date=${selectedDate}` : ""
          }`,
          { headers: authHeaders },
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || "Attendance load nahi hui");
          if (!silent) setEmployees([]);
          setLoading(false);
          return;
        }

        setEmployees(data.employees || []);
        setSummary(data.summary || {});
        setIsWorkingDay(data.is_working_day !== false);
        setPolicy(data.policy || null);
        setOffice(data.office || null);
        setLastUpdated(new Date());

        setIsOvernight(!!data.policy?.is_overnight);
        setShiftState(data.shift_state || null);

        // ──── "Aaj" server ka work date hai ────
        // Raat ki shift mein 12 baje ke baad bhi yeh pichhla din rehta hai,
        // isliye kabhi bhi apni calendar date par bharosa nahi karte.
        if (!selectedDate) {
          setTodayStr(data.date);
          setSelectedDate(data.date);
        } else if (selectedDate === todayStr && data.date !== todayStr) {
          // live view khula tha aur shift badal gayi — aage khisak jao
          setTodayStr(data.date);
          setSelectedDate(data.date);
        }

        if (!silent) setCurrentPage(1);
      } catch {
        setError("Server se connect nahi ho paya");
      }
      setLoading(false);
    },
    [selectedDate, authHeaders, todayStr],
  );

  // ──────────────────────────────────────
  // Chart data (real — dummy nahi)
  // ──────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setChartLoading(true);
    try {
      const res = await fetch(`${API}/attendance/overview?range=${activeView}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      setChartData(res.ok ? data.data || [] : []);
    } catch {
      setChartData([]);
    }
    setChartLoading(false);
  }, [activeView, authHeaders]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // ──────────────────────────────────────
  // LIVE — employee check-in/out kare to foran row update
  // ──────────────────────────────────────
  useEffect(() => {
    if (!isLive) return; // purane din ka data live nahi hota

    const tick = () => {
      // ──── Tab background mein ho to poll na karo ────
      if (document.hidden) return;
      fetchAttendance({ silent: true });
    };

    const interval = setInterval(tick, LIVE_REFRESH_MS);

    // ──── Wapis tab pe aate hi turant refresh ────
    const onFocus = () => fetchAttendance({ silent: true });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [isLive, fetchAttendance]);

  // ──────────────────────────────────────
  // Photo (auth header chahiye — direct src se nahi chalega)
  // ──────────────────────────────────────
  const openPhoto = async (path, name, label) => {
    try {
      const res = await fetch(`${API}${path}`, { headers: authHeaders });
      if (!res.ok) {
        setError("Photo available nahi hai");
        return;
      }
      const blob = await res.blob();
      setPhoto({ url: URL.createObjectURL(blob), name, label });
    } catch {
      setError("Photo load nahi hui");
    }
  };

  const closePhoto = () => {
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  };

  // ──────────────────────────────────────
  // Filter + pagination
  // ──────────────────────────────────────
  const FILTERS = [
    "All",
    "Present",
    "Late",
    "Not Checked In",
    "Absent",
    "On Leave",
  ];

  const filtered =
    filter === "All"
      ? employees
      : employees.filter((e) => e.attendance_status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageRows = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Laal sirf ASAL absence ke liye — jo abhi aa sakta hai wo neutral hai.
  // Rang ab kit ke tones se aate hain, is liye har tab mein "Present" ka
  // hara ek jaisa hi hara hai.
  const statusTone = {
    Present: "ok",
    Late: "warn",
    Absent: "bad",
    "On Leave": "info",
    "Off Day": "muted",
    "Not Checked In": "muted",
    Upcoming: "muted",
  };

  // Stat card aur filter chip dono yahi chalate hain — page reset
  // dono jagah lazmi hai warna khali page dikh jata hai
  const pickFilter = (f) => {
    setFilter(f);
    setCurrentPage(1);
  };

  // Har filter mein kitne log hain — chip par dikhane ke liye
  const filterCounts = useMemo(() => {
    const c = { All: employees.length };
    for (const e of employees) {
      c[e.attendance_status] = (c[e.attendance_status] || 0) + 1;
    }
    return c;
  }, [employees]);

  // Absent abhi "pakka" hai ya shift chal rahi hai?
  const attendanceFinal = shiftState ? !!shiftState.attendance_final : true;
  const pendingCount = summary.pending ?? 0;
  const upcomingCount = summary.upcoming ?? 0;

  // "22:00" → "10:00 PM"
  const to12h = (hhmm) => {
    if (!hhmm) return "";
    const [h, m] = String(hhmm).split(":").map(Number);
    if (Number.isNaN(h)) return hhmm;
    const suffix = h >= 12 ? "PM" : "AM";
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${suffix}`;
  };

  const shiftBanner = (() => {
    if (!shiftState) return null;
    const { window_reason: reason, opens_at, closes_at } = shiftState;

    if (reason === "too_early")
      return {
        icon: "🕐",
        cls: "bg-sky-500/10 border-sky-500/30 text-sky-300",
        title: `Shift abhi shuru nahi hui — check-in ${to12h(opens_at)} par khulega`,
        detail:
          "Is liye abhi koi Absent mark nahi hai. Faisla shift khatam hone par hoga.",
      };

    if (reason === "open")
      return {
        icon: "🟢",
        cls: "bg-[#05DC7F]/10 border-[#05DC7F]/30 text-[#05DC7F]",
        title: `Check-in window khula hai — ${to12h(opens_at)} se ${to12h(closes_at)}`,
        detail: `${pendingCount} employee abhi tak nahi aaye. Window band hone tak wo Absent nahi ginay jayenge.`,
      };

    if (reason === "shift_ended")
      return {
        icon: "🔒",
        cls: "bg-red-500/10 border-red-500/30 text-red-300",
        title: "Check-in window band — is din ki attendance final hai",
        detail: `Shift ${to12h(policy?.shift_start)} se ${to12h(policy?.shift_end)} thi. Jo nahi aaye wo ab Absent hain.`,
      };

    if (reason === "not_enforced")
      return {
        icon: "⚙️",
        cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-300",
        title: "Shift window enforce nahi ho raha",
        detail:
          "Employees kisi bhi waqt check-in kar sakte hain. Settings mein 'Shift window enforce karein' on karein taake Absent ka waqt tay ho.",
      };

    return null;
  })();

  const formatTime = (dt) =>
    !dt
      ? "—"
      : new Date(dt.replace(" ", "T")).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

  const workingLabel = (emp) => {
    if (emp.status === "paused") return "On Break";
    if (emp.status === "checked_in") return "Working";
    if (emp.status === "checked_out") return "Done";
    return null;
  };

  const shortDays = (days) =>
    Array.isArray(days) ? days.map((d) => d.slice(0, 3)).join(", ") : "—";

  return (
    <div className="flex flex-col gap-10">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Active Policy Bar ── */}
      {/* Yeh wahi rules hain jo backend har check-in/out pe apply karta hai */}
      <div className="rounded-xl border border-[#05DC7F]/20 bg-black/30 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
        <span className="text-gray-500 font-semibold uppercase tracking-wide">
          Active Policy
        </span>

        {policy ? (
          <>
            <span className="text-gray-400">
              Shift{" "}
              <span className="text-white">
                {policy.shift_start} – {policy.shift_end}
              </span>
            </span>
            <span className="text-gray-400">
              Late after{" "}
              <span className="text-white">
                +{formatMinutes(policy.late_tolerance_mins)}
              </span>
            </span>
            <span
              className="text-gray-400"
              title="Is window ke bahar check-in nahi ho sakta — employee absent rahega"
            >
              Check-in window{" "}
              {policy.enforce_shift_window === false ? (
                <span className="text-yellow-400">off</span>
              ) : (
                <span className="text-white">
                  {policy.checkin_window_opens} – {policy.shift_end}
                </span>
              )}
            </span>
            <span className="text-gray-400">
              Min hours{" "}
              <span className="text-white">{policy.min_daily_hours}h</span>
            </span>
            <span className="text-gray-400">
              OT after{" "}
              <span className="text-white">{policy.overtime_threshold}h</span>
            </span>
            <span className="text-gray-400">
              Days{" "}
              <span className="text-white">
                {shortDays(policy.working_days)}
              </span>
            </span>
            <span className="text-gray-400">
              Breaks{" "}
              <span className="text-white">
                {policy.break_policy === "excluded"
                  ? "hours se minus"
                  : "hours mein shamil"}
              </span>
            </span>
          </>
        ) : (
          <span className="text-yellow-400">
            Work policy set nahi — Settings mein jaa kar set karein
          </span>
        )}

        {office ? (
          <span className="text-gray-400">
            Office{" "}
            <span className="text-white">
              {office.office_name} · {office.radius_meters}m radius
            </span>
          </span>
        ) : (
          <span className="text-yellow-400">
            Office location set nahi — GPS verification skip ho raha hai
          </span>
        )}
      </div>

      {/* ── Shift ka status — CEO ko pata rahe ke Absent final hai ya nahi ── */}
      {isLive && shiftState && shiftBanner && (
        <div
          className={`rounded-xl px-4 py-3 text-sm flex items-start gap-3 border ${shiftBanner.cls}`}
        >
          <span className="mt-0.5 shrink-0">{shiftBanner.icon}</span>
          <div>
            <p className="font-semibold">{shiftBanner.title}</p>
            <p className="text-xs opacity-80 mt-0.5">{shiftBanner.detail}</p>
          </div>
        </div>
      )}

      {/* ── Stats ──
          Card ab CLICKABLE hai aur neeche wale filter se juda hua hai.
          Pehle CEO ko "5 late" dikhta tha magar yeh dekhne ke liye ke
          wo kaun hain, alag se filter dhoondna parta tha. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total"
          value={summary.total_employees ?? 0}
          sub={`${(policy?.working_days || []).length || 7} din ka hafta`}
          onClick={() => pickFilter("All")}
          active={filter === "All"}
        />
        <StatCard
          icon={UserCheck}
          label="Present"
          value={summary.present ?? 0}
          sub={`${summary.on_break ?? 0} break par · ${summary.checked_out ?? 0} mukammal`}
          tone={(summary.present ?? 0) > 0 ? "ok" : "muted"}
          onClick={() => pickFilter("Present")}
          active={filter === "Present"}
        />
        {/* Shift chal rahi ho to "Absent" abhi faisla nahi — us waqt
            "Not Checked In" dikhao, warna asal Absent count */}
        {!attendanceFinal && (pendingCount > 0 || upcomingCount > 0) ? (
          <StatCard
            icon={UserX}
            label="Not in yet"
            value={pendingCount + upcomingCount}
            sub={
              upcomingCount > 0 && pendingCount === 0
                ? "Shift shuru nahi hui"
                : "Abhi aa sakte hain"
            }
            onClick={() => pickFilter("Not Checked In")}
            active={filter === "Not Checked In"}
          />
        ) : (
          <StatCard
            icon={UserX}
            label="Absent"
            value={summary.absent ?? 0}
            sub={`${summary.on_leave ?? 0} approved leave par`}
            tone={(summary.absent ?? 0) > 0 ? "bad" : "muted"}
            onClick={() => pickFilter("Absent")}
            active={filter === "Absent"}
          />
        )}
        <StatCard
          icon={Clock}
          label="Late"
          value={summary.late ?? 0}
          sub={
            policy?.late_tolerance_mins != null
              ? `${policy.late_tolerance_mins} min tolerance`
              : null
          }
          tone={(summary.late ?? 0) > 0 ? "warn" : "muted"}
          onClick={() => pickFilter("Late")}
          active={filter === "Late"}
        />
      </div>

      {/* ── Chart ── */}
      <Panel
        title="Attendance Overview"
        icon={TrendingUp}
        actions={
          <FilterChips
            options={[
              { value: "weekly", label: "Weekly" },
              { value: "monthly", label: "Monthly" },
            ]}
            value={activeView}
            onChange={setActiveView}
          />
        }
      >
        {/* Do series hain, is liye legend hamesha maujood — rang akela
            kaafi nahi hota */}
        <div className="flex items-center gap-4 mb-3 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <i className="w-3 h-0.5 rounded bg-[#05DC7F]" /> Present
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="w-3 h-0.5 rounded bg-rose-400" /> Absent
          </span>
        </div>

        <div className="w-full h-[260px]">
          {chartLoading ? (
            <div className="h-full flex items-end gap-2 pb-6">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-t bg-white/[0.06]"
                  style={{ height: `${35 + ((i * 37) % 55)}%` }}
                />
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Abhi koi attendance data nahi"
              hint="Employees check-in karna shuru karenge to yahan rujhan dikhega."
            />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff0d"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#6B7280"
                  allowDecimals={false}
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ stroke: "#ffffff1a" }}
                />
                <Line
                  name="Present"
                  type="monotone"
                  dataKey="present"
                  stroke="#05DC7F"
                  strokeWidth={2}
                  dot={{ r: 3, strokeWidth: 0, fill: "#05DC7F" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  name="Absent"
                  type="monotone"
                  dataKey="absent"
                  stroke="#fb7185"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, strokeWidth: 0, fill: "#fb7185" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      {/* ── Table ── */}
      <Panel
        title={isLive ? "Aaj ki Attendance" : "Attendance"}
        subtitle={
          lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}`
            : null
        }
        actions={
          <>
            {/* Date picker — icon hi kafi hai, "Date" likhne ki zarurat nahi */}
            <label
              title="Kisi aur din ki attendance dekhein"
              className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08]
                bg-white/[0.03] px-3 py-2 cursor-pointer hover:border-white/20 transition"
            >
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-xs outline-none [color-scheme:dark] w-[105px] cursor-pointer"
              />
            </label>

            <IconButton
              icon={RefreshCw}
              label="Dobara load karein"
              busy={loading}
              onClick={() => fetchAttendance()}
            />
          </>
        }
        bodyClass="pt-0"
      >
        {/* ── Us din ki halat — sab nishan ek jagah ── */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {isLive && (
            <LiveDot
              live
              label={`Live · har ${LIVE_REFRESH_MS / 1000}s`}
            />
          )}
          {!isWorkingDay && (
            <Pill tone="muted" icon={CalendarOff}>
              Non-working day
            </Pill>
          )}
          {isOvernight && isLive && (
            <Pill
              tone="info"
              icon={Moon}
              title="Raat ki shift aadhi raat paar karti hai — attendance us din ki ginti hai jis din shift SHURU hui"
            >
              Night shift — {selectedDate} ka din
            </Pill>
          )}

          <div className="ml-auto">
            <FilterChips
              options={FILTERS}
              value={filter}
              onChange={pickFilter}
              counts={filterCounts}
            />
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : employees.length === 0 ? (
          <EmptyState
            icon={UserRound}
            title="Is company mein koi employee nahi"
            hint="Create User tab se employee banayein — phir un ki attendance yahan aayegi."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title={`"${filter}" mein koi employee nahi`}
            hint="Doosra filter chunein ya sab dekhne ke liye All par jayein."
          />
        ) : (
          <>
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="min-w-full border-collapse">
                {/* Header sticky hai — lambi list scroll karte waqt column
                    ke naam nazar se ojhal nahi hote */}
                <thead className="sticky top-0 z-10 bg-[#0b0f0d]/95 backdrop-blur">
                  <tr className="border-b border-white/[0.08]">
                    <Th>Employee</Th>
                    <Th>Check-In</Th>
                    <Th>Check-Out</Th>
                    <Th>Net Hours</Th>
                    <Th>In Location</Th>
                    <Th>Out Location</Th>
                    <Th>Photos</Th>
                    <Th>Flags</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((emp) => (
                    <tr
                      key={emp.employee_id}
                      className="border-b border-white/[0.05] hover:bg-white/[0.03] transition"
                    >
                      {/* ── Employee ── */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#05DC7F]/15 border border-[#05DC7F]/25 flex items-center justify-center text-[#05DC7F] font-semibold text-xs">
                            {emp.employee_name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm truncate">
                              {emp.employee_name}
                            </p>
                            {emp.department && (
                              <p className="text-gray-500 text-xs truncate">
                                {emp.department}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ── Check-in ── */}
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {formatTime(emp.check_in_time)}
                      </td>

                      {/* ── Check-out ── */}
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {emp.check_out_time ? (
                          formatTime(emp.check_out_time)
                        ) : workingLabel(emp) ? (
                          <span className="text-[#05DC7F] text-xs">
                            {workingLabel(emp)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* ── Net hours ── */}
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {emp.net_hours != null
                          ? `${emp.net_hours.toFixed(1)}h`
                          : "—"}
                      </td>

                      {/* ── Check-in location ── */}
                      <td className="py-3 px-4">
                        <LocationBadge
                          lat={emp.check_in_lat}
                          lng={emp.check_in_lng}
                          verified={emp.location_verified}
                          distance={emp.check_in_distance_meters}
                          note={emp.check_in_location_note}
                        />
                      </td>

                      {/* ── Check-out location ── */}
                      <td className="py-3 px-4">
                        <LocationBadge
                          lat={emp.check_out_lat}
                          lng={emp.check_out_lng}
                          verified={emp.checkout_location_verified}
                          distance={emp.check_out_distance_meters}
                          note={emp.check_out_location_note}
                        />
                      </td>

                      {/* ── Photos ── */}
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {emp.has_checkin_photo && (
                            <button
                              onClick={() =>
                                openPhoto(
                                  `/attendance/photo/${emp.session_id}/checkin`,
                                  emp.employee_name,
                                  "Check-In",
                                )
                              }
                              title="Check-in photo"
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-[#05DC7F]/12 text-[#05DC7F] border border-[#05DC7F]/30 hover:brightness-125 transition"
                            >
                              <Camera size={11} /> In
                            </button>
                          )}
                          {emp.has_checkout_photo && (
                            <button
                              onClick={() =>
                                openPhoto(
                                  `/attendance/photo/${emp.session_id}/checkout`,
                                  emp.employee_name,
                                  "Check-Out",
                                )
                              }
                              title="Check-out photo"
                              className="px-2 py-0.5 text-xs rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition flex items-center gap-1"
                            >
                              <Camera size={11} /> Out
                            </button>
                          )}
                          {/* ── Enrolled face — check-in photo se compare karne ke liye ── */}
                          <button
                            onClick={() =>
                              openPhoto(
                                `/attendance/enrollment-photo/${emp.employee_id}`,
                                emp.employee_name,
                                "Enrolled Face",
                              )
                            }
                            title="Enrolled face photo"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold bg-violet-400/12 text-violet-400 border border-violet-400/30 hover:brightness-125 transition"
                          >
                            <Camera size={11} /> Face
                          </button>
                        </div>
                      </td>

                      {/* ── Flags ── */}
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {emp.is_late && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              Late {formatMinutes(emp.late_by_minutes)}
                            </span>
                          )}
                          {emp.is_overtime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              OT {formatMinutes(emp.overtime_minutes)}
                            </span>
                          )}
                          {emp.is_undertime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              UT {formatMinutes(emp.undertime_minutes)}
                            </span>
                          )}
                          {emp.is_early_checkout && (
                            <span
                              title={`Shift end se ${formatMinutes(emp.early_checkout_minutes)} pehle nikal gaya`}
                              className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            >
                              Early {formatMinutes(emp.early_checkout_minutes)}
                            </span>
                          )}
                          {emp.total_pause_minutes > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              Break {formatMinutes(emp.total_pause_minutes)}
                            </span>
                          )}
                          {!emp.is_late &&
                            !emp.is_overtime &&
                            !emp.is_undertime &&
                            !emp.is_early_checkout &&
                            !emp.total_pause_minutes && (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                        </div>
                      </td>

                      {/* ── Status ── */}
                      <td className="py-3 px-4">
                        <Pill
                          tone={statusTone[emp.attendance_status] || "muted"}
                          title={emp.status_note || undefined}
                        >
                          {emp.attendance_status}
                        </Pill>
                        {emp.leave_type && (
                          <p className="text-gray-500 text-[10px] mt-1 capitalize">
                            {emp.leave_type}
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
          </>
        )}
      </Panel>

      {/* ── Photo Modal ── */}
      {photo && (
        <div
          onClick={closePhoto}
          className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#111] p-4 rounded-2xl border border-[#05DC7F]/30 flex flex-col gap-3 max-w-md w-full"
          >
            <div className="flex justify-between items-center">
              <p className="text-white font-semibold text-sm">
                {photo.name} — {photo.label}
              </p>
              <button
                onClick={closePhoto}
                className="text-gray-400 hover:text-white text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <img
              src={photo.url}
              alt="Attendance"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
