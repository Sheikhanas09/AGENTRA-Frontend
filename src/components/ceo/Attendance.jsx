"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaClock,
  FaCalendarAlt,
  FaCamera,
} from "react-icons/fa";
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
// PKT (UTC+5) ki date
// ──────────────────────────────────────────
// toISOString() UTC date deta hai — raat 12:32 AM PKT pe wo abhi
// PICHHLA din hota hai (7:32 PM UTC). Backend PKT pe chalta hai,
// isliye dashboard aaj ke bajaye kal ka data maang raha tha.
const pktDateStr = (d = new Date()) =>
  new Date(d.getTime() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

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
      {!d.is_working_day && <p className="text-gray-500 mt-1">Off day</p>}
    </div>
  );
}

function StatCard({ title, value, valueColor, icon, subtitle }) {
  return (
    <div className="flex justify-between items-center p-5 rounded-xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_8px_rgba(5,220,127,0.25)] hover:border-[#05DC7F]/45 transition-all duration-300">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <h3 className={`text-3xl font-bold ${valueColor}`}>{value}</h3>
        {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#05DC7F]/15 border border-[#05DC7F]/40">
        {icon}
      </div>
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

  const [todayStr, setTodayStr] = useState(pktDateStr());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [filter, setFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const isLive = selectedDate === todayStr;

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
        const res = await fetch(
          `${API}/attendance/flags/today?report_date=${selectedDate}`,
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

        // ──── PKT date badal gayi (raat 12 baje) to picker bhi aage karo ────
        const nowPkt = pktDateStr();
        if (nowPkt !== todayStr) setTodayStr(nowPkt);

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
  const FILTERS = ["All", "Present", "Late", "Absent", "On Leave"];

  const filtered =
    filter === "All"
      ? employees
      : employees.filter((e) => e.attendance_status === filter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const pageRows = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const statusBadge = {
    Present: "bg-[#05DC7F]/20 text-[#05DC7F] border border-[#05DC7F]/40",
    Late: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
    Absent: "bg-red-500/20 text-red-400 border border-red-500/40",
    "On Leave": "bg-blue-500/20 text-blue-400 border border-blue-500/40",
    "Off Day": "bg-gray-500/20 text-gray-400 border border-gray-500/40",
  };

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
                +{policy.late_tolerance_mins}m
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

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Employees"
          value={summary.total_employees ?? 0}
          valueColor="text-white"
          icon={<FaUsers className="text-[#05DC7F] text-xl" />}
        />
        <StatCard
          title="Present"
          value={summary.present ?? 0}
          valueColor="text-[#05DC7F]"
          subtitle={`${summary.on_break ?? 0} on break · ${summary.checked_out ?? 0} checked out`}
          icon={<FaUserCheck className="text-[#05DC7F] text-xl" />}
        />
        <StatCard
          title="Absent"
          value={summary.absent ?? 0}
          valueColor="text-red-500"
          subtitle={`${summary.on_leave ?? 0} on approved leave`}
          icon={<FaUserTimes className="text-[#05DC7F] text-xl" />}
        />
        <StatCard
          title="Late Arrivals"
          value={summary.late ?? 0}
          valueColor="text-yellow-400"
          icon={<FaClock className="text-[#05DC7F] text-xl" />}
        />
      </div>

      {/* ── Chart ── */}
      <div className="bg-black/30 rounded-2xl p-5 border border-[#05DC7F]/20">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-semibold">
            Attendance Overview
          </h2>
          <div className="flex gap-2">
            {["weekly", "monthly"].map((v) => (
              <button
                key={v}
                onClick={() => setActiveView(v)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition
                  ${
                    activeView === v
                      ? "bg-[#05DC7F]/20 text-white border border-[#05DC7F]"
                      : "text-gray-400 hover:bg-[#05DC7F]/10"
                  }`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full h-[280px]">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Loading chart...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-400">
              Abhi koi attendance data nahi
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#ffffff10"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" allowDecimals={false} fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="present"
                  stroke="#05DC7F"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  stroke="#ef4444"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-4 md:p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-white text-lg font-semibold">
              {isLive ? "Today's Attendance" : "Attendance"}
            </h2>

            {/* ── Live indicator ── */}
            {isLive && (
              <span
                title={`Har ${LIVE_REFRESH_MS / 1000} second auto refresh`}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#05DC7F]/10 border border-[#05DC7F]/30 text-[#05DC7F] text-xs"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#05DC7F] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#05DC7F]" />
                </span>
                Live
              </span>
            )}

            {/* ── Date picker (ab actually kaam karta hai) ── */}
            <div className="flex items-center gap-2 bg-black/40 border border-[#05DC7F]/30 rounded-lg px-3 py-1">
              <FaCalendarAlt className="text-[#05DC7F] text-xs" />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-sm outline-none [color-scheme:dark]"
              />
            </div>

            <button
              onClick={() => fetchAttendance()}
              className="px-3 py-1 text-xs bg-[#05DC7F]/20 text-[#05DC7F] border border-[#05DC7F]/30 rounded-lg hover:bg-[#05DC7F]/30 transition"
            >
              Refresh
            </button>

            {lastUpdated && (
              <span className="text-gray-500 text-xs">
                Updated{" "}
                {lastUpdated.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}

            {!isWorkingDay && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400 border border-gray-500/30">
                Non-working day
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setFilter(s);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition
                  ${
                    filter === s
                      ? s === "All"
                        ? "bg-[#05DC7F] text-black"
                        : statusBadge[s]
                      : "text-gray-400 border border-gray-700 hover:bg-gray-800"
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : employees.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            Is company mein koi employee nahi hai
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            "{filter}" mein koi employee nahi
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-sm">
                    <th className="py-3 px-4 text-left">Employee</th>
                    <th className="py-3 px-4 text-left">Check-In</th>
                    <th className="py-3 px-4 text-left">Check-Out</th>
                    <th className="py-3 px-4 text-left">Net Hours</th>
                    <th className="py-3 px-4 text-left">In Location</th>
                    <th className="py-3 px-4 text-left">Out Location</th>
                    <th className="py-3 px-4 text-left">Photos</th>
                    <th className="py-3 px-4 text-left">Flags</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((emp) => (
                    <tr
                      key={emp.employee_id}
                      className="border-b border-gray-700 hover:bg-[#05DC7F]/5 transition"
                    >
                      {/* ── Employee ── */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-[#05DC7F]/20 flex items-center justify-center text-[#05DC7F] font-semibold text-sm">
                            {emp.employee_name?.charAt(0) || "?"}
                          </div>
                          <div>
                            <p className="text-white text-sm">
                              {emp.employee_name}
                            </p>
                            {emp.department && (
                              <p className="text-gray-500 text-xs">
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
                              className="px-2 py-0.5 text-xs rounded-full bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30 hover:bg-[#05DC7F]/25 transition flex items-center gap-1"
                            >
                              <FaCamera className="text-[10px]" /> In
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
                              <FaCamera className="text-[10px]" /> Out
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
                            className="px-2 py-0.5 text-xs rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition flex items-center gap-1"
                          >
                            <FaCamera className="text-[10px]" /> Face
                          </button>
                        </div>
                      </td>

                      {/* ── Flags ── */}
                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {emp.is_late && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                              Late {emp.late_by_minutes}m
                            </span>
                          )}
                          {emp.is_overtime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              OT {emp.overtime_minutes}m
                            </span>
                          )}
                          {emp.is_undertime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                              UT {emp.undertime_minutes}m
                            </span>
                          )}
                          {emp.is_early_checkout && (
                            <span
                              title={`Shift end se ${emp.early_checkout_minutes} min pehle nikal gaya`}
                              className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30"
                            >
                              Early {emp.early_checkout_minutes}m
                            </span>
                          )}
                          {emp.total_pause_minutes > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-300 border border-gray-500/30">
                              Break {emp.total_pause_minutes}m
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
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                            statusBadge[emp.attendance_status] || ""
                          }`}
                        >
                          {emp.attendance_status}
                        </span>
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
            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-2 mt-4 text-gray-300 text-sm">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded disabled:opacity-40"
                >
                  ‹
                </button>
                <span>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded disabled:opacity-40"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

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
