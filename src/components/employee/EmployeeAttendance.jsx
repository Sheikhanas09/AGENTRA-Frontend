"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  Coffee,
  MapPin,
  CalendarDays,
  CheckCircle,
  Camera,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  Panel,
  IconButton,
  Pill,
  Pagination,
  EmptyState,
} from "../ui/kit";
import { formatMinutes } from "../../utils/time";
import {
  acquireLocation,
  geoErrorMessage,
  distanceMeters,
  LAST_GOOD_MAX_AGE_MS,
} from "../../utils/geo";

const API = "http://127.0.0.1:8000";

// Work date ko parhne layak banao (UTC parse se bachte hue)
const prettyWorkDate = (d) => {
  if (!d) return "—";
  const [y, m, day] = String(d).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

// ──────────────────────────────────────────
// Location badge (history table)
// ──────────────────────────────────────────
function LocationBadge({ lat, lng, verified, distance, note }) {
  if (lat == null || lng == null) {
    if (note === "gps_unavailable") {
      return (
        <span
          title="Us waqt GPS location nahi mili thi"
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

  return (
    <a
      href={`https://maps.google.com/?q=${lat},${lng}`}
      target="_blank"
      rel="noreferrer"
      className={`inline-block px-2 py-0.5 text-xs rounded-full border hover:opacity-80 transition ${style}`}
    >
      📍 {label}
    </a>
  );
}

// ──────────────────────────────────────────
// Meri Work Policy — employee ko poora qanoon
// ──────────────────────────────────────────
// Pehle yeh sab sirf CEO ke Settings mein tha. Employee ko na break ka
// waqt pata tha, na yeh ke kitna pehle check-in ho sakta hai, na overtime
// kab shuru hoti hai.
//
// In saari cheezon mein ek baat mushtarak hai: sab WAQT ke baare mein
// hain, aur ek dusre se juri hui hain. Adad ki list ("late tolerance
// 15 min", "grace 30 min") parh kar banda khud din jorta hai. Is liye
// asal din ki LAKEER banai hai — sab kuch ek nazar mein.
//
// Lakeer ka mehwar ghari ka waqt nahi, "shift shuru hone se kitne
// minute" hai — is se raat ki shift (22:00–05:00) bhi bina kisi alag
// branch ke theek baith jati hai.

const toMin = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = String(hhmm).split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const to12h = (hhmm) => {
  const t = toMin(hhmm);
  if (t === null) return "—";
  const h = Math.floor(t / 60) % 24;
  const m = t % 60;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const asHours = (mins) => {
  if (mins == null) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h} ghante`;
};

function WorkPolicyCard({ policy, nowMinutes, isWorkingDay }) {
  const [open, setOpen] = useState(true);
  if (!policy) return null;

  const start = toMin(policy.shift_start);
  const end = toMin(policy.shift_end);
  if (start === null || end === null) return null;

  // Sab kuch shift start se aage ginte hain — aadhi raat paar karna
  // khud hi sambhal jata hai
  const rel = (hhmm) => {
    const t = toMin(hhmm);
    return t === null ? null : (t - start + 1440) % 1440;
  };

  const shiftLen = policy.shift_length_minutes || (end - start + 1440) % 1440;
  const opensRel = policy.enforce_shift_window
    ? -(policy.early_checkin_grace_mins || 0)
    : null;

  // Lakeer check-in khulne se shuru hoti hai aur shift end ke thora
  // baad khatam — taake overtime wala hissa bhi nazar aaye
  const from = opensRel === null ? 0 : opensRel;
  const tail = Math.max(45, Math.round(shiftLen * 0.12));
  const span = shiftLen - from + tail;
  const pct = (r) => `${((r - from) / span) * 100}%`;

  const lateRel = rel(policy.late_after);
  const bStart = policy.break_is_fixed ? rel(policy.break_start) : null;
  const bEnd = policy.break_is_fixed ? rel(policy.break_end) : null;

  // "Abhi" ka nishan — sirf us waqt jab wo lakeer par aata ho
  const nowRel =
    nowMinutes === null ? null : (nowMinutes - start + 1440) % 1440;
  const showNow =
    isWorkingDay && nowRel !== null && nowRel >= from && nowRel <= shiftLen + tail;

  // ──── Sirf wo nishaniyan jo yaqeeni tor par door hain ────
  // Grace aur late-tolerance chhote hote hain (15–30 min), aur 9 ghante
  // ki lakeer par woh shift start se sirf 14–28 pixel door girte hain —
  // teen label ek dusre par charh jate. Is liye lakeer par sirf DIN KI
  // SHAKAL hai; chhote adad kinare ke caption aur neeche wali grid mein
  // poore saaf likhe hain.
  const marks = [
    { at: 0, label: to12h(policy.shift_start), cap: "Shift start" },
    bStart !== null && bEnd !== null && bEnd > bStart && {
      at: (bStart + bEnd) / 2,
      label: `${to12h(policy.break_start)} – ${to12h(policy.break_end)}`,
      cap: "Break",
    },
    { at: shiftLen, label: to12h(policy.shift_end), cap: "Shift end" },
  ].filter(Boolean);

  return (
    <div className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-white/[0.03] transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <Clock size={16} className="text-[#05DC7F] shrink-0" />
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold">Meri Work Policy</p>
            <p className="text-gray-500 text-xs truncate">
              {to12h(policy.shift_start)} – {to12h(policy.shift_end)}
              {policy.is_overnight && " (agle din)"} · {asHours(shiftLen)}
              {policy.break_is_fixed &&
                ` · break ${to12h(policy.break_start)}`}
            </p>
          </div>
        </div>
        {/* Chevron khud bata deta hai ke khulega ya band hoga —
            "Dekhein / Chhupayein" likhne ki zarurat nahi */}
        <ChevronDown
          size={16}
          className={`text-gray-500 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 flex flex-col gap-5">
          {/* ── Din ki lakeer ── */}
          <div className="pt-3">
            <div className="relative h-9">
              {/* Poora track — check-in khulne se shift end ke baad tak */}
              <div className="absolute inset-x-0 top-3 h-3 rounded-full bg-white/[0.06]" />

              {/* Shift ka hissa */}
              <div
                className="absolute top-3 h-3 rounded-full bg-[#05DC7F]/25"
                style={{ left: pct(0), width: `${(shiftLen / span) * 100}%` }}
              />

              {/* Grace — is waqt aana late nahi ginta */}
              {lateRel > 0 && (
                <div
                  className="absolute top-3 h-3 bg-[#05DC7F]/55"
                  style={{ left: pct(0), width: `${(lateRel / span) * 100}%` }}
                  title={`${policy.late_tolerance_mins} min tak late nahi ginta`}
                />
              )}

              {/* Break — track par 2px ka faasla taake alag nazar aaye */}
              {bStart !== null && bEnd !== null && bEnd > bStart && (
                <div
                  className="absolute top-[10px] h-5 rounded-md bg-amber-400/25 border border-amber-400/45"
                  style={{
                    left: pct(bStart),
                    width: `${((bEnd - bStart) / span) * 100}%`,
                  }}
                  title={`Break — ${to12h(policy.break_start)} se ${to12h(policy.break_end)}`}
                />
              )}

              {/* Overtime zone */}
              <div
                className="absolute top-3 h-3 rounded-r-full bg-violet-400/20"
                style={{ left: pct(shiftLen), right: 0 }}
                title={`${policy.overtime_threshold} ghante ke baad overtime`}
              />

              {/* Nishaniyan */}
              {marks.map((m) => (
                <div
                  key={m.cap}
                  className="absolute top-1 flex flex-col items-center"
                  style={{ left: pct(m.at), transform: "translateX(-50%)" }}
                >
                  <div
                    className={`w-px h-7 ${
                      m.cap === "Break" ? "bg-amber-400/70" : "bg-[#05DC7F]"
                    }`}
                  />
                </div>
              ))}

              {/* Abhi kahan hain */}
              {showNow && (
                <div
                  className="absolute -top-1 flex flex-col items-center z-10"
                  style={{ left: pct(nowRel), transform: "translateX(-50%)" }}
                  title="Abhi"
                >
                  <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_0_3px_rgba(0,0,0,0.6)]" />
                  <div className="w-px h-9 bg-white/70" />
                </div>
              )}
            </div>

            {/* Labels — lakeer ke neeche */}
            <div className="relative h-9 mt-1">
              {marks.map((m, i) => (
                <div
                  key={m.cap}
                  className="absolute text-center"
                  style={{
                    left: pct(m.at),
                    transform:
                      i === 0
                        ? "translateX(-10%)"
                        : i === marks.length - 1
                          ? "translateX(-90%)"
                          : "translateX(-50%)",
                  }}
                >
                  <p className="text-white text-[11px] font-semibold whitespace-nowrap">
                    {m.label}
                  </p>
                  <p className="text-gray-500 text-[10px] whitespace-nowrap">
                    {m.cap}
                  </p>
                </div>
              ))}
            </div>

            {/* Chhote adad jo lakeer par nahi samate — kinaron par */}
            <div className="flex justify-between gap-3 text-[10.5px] text-gray-500 -mt-1">
              <span>
                {policy.enforce_shift_window
                  ? `Check-in ${to12h(policy.checkin_opens_at)} se khulta hai`
                  : "Check-in kabhi bhi"}
              </span>
              <span className="text-right">
                {policy.overtime_threshold} ghante ke baad overtime
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[10.5px] text-gray-500 mt-2.5 pt-2.5 border-t border-white/[0.06]">
              <span className="flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-[#05DC7F]/55" />
                Late nahi ({asHours(policy.late_tolerance_mins)} tak)
              </span>
              {policy.break_is_fixed && (
                <span className="flex items-center gap-1.5">
                  <i className="w-2.5 h-2.5 rounded-sm bg-amber-400/45" /> Break
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <i className="w-2.5 h-2.5 rounded-sm bg-violet-400/30" /> Overtime
              </span>
            </div>
          </div>

          {/* ── Baqi qawaid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 pt-4 border-t border-white/10">
            <PolicyFact
              label="Break"
              value={
                policy.break_is_fixed
                  ? `${to12h(policy.break_start)} – ${to12h(policy.break_end)}`
                  : asHours(policy.break_minutes)
              }
              note={
                policy.break_is_fixed
                  ? asHours(policy.break_minutes)
                  : "Jab chahein"
              }
            />
            <PolicyFact
              label="Break ka hisaab"
              value={
                policy.break_policy === "included"
                  ? "Kaam mein ginta hai"
                  : "Kaam se katta hai"
              }
              note={
                policy.break_policy === "included"
                  ? "Net hours kam nahi hote"
                  : "Net hours se kam hota hai"
              }
            />
            <PolicyFact
              label="Late tolerance"
              value={asHours(policy.late_tolerance_mins)}
              note={
                policy.late_after
                  ? `${to12h(policy.late_after)} ke baad late`
                  : null
              }
            />
            <PolicyFact
              label="Rozana kam se kam"
              value={`${policy.min_daily_hours} ghante`}
              note="Net — break ke baghair"
            />
            <PolicyFact
              label="Overtime"
              value={`${policy.overtime_threshold} ghante baad`}
              note={`Zyada se zyada ${policy.max_overtime_per_day} ghante`}
            />
            <PolicyFact
              label="Check-in"
              value={
                policy.enforce_shift_window
                  ? `${to12h(policy.checkin_opens_at)} se`
                  : "Kabhi bhi"
              }
              note={
                policy.enforce_shift_window
                  ? `${to12h(policy.checkin_closes_at)} tak — phir band`
                  : "Koi pabandi nahi"
              }
            />
          </div>

          {/* ── Working days ── */}
          <div className="pt-4 border-t border-white/10">
            <p className="text-gray-500 text-[10.5px] uppercase tracking-wider mb-2">
              Working Days
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
                "Saturday", "Sunday"].map((d) => {
                const on = policy.working_days?.includes(d);
                return (
                  <span
                    key={d}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${
                      on
                        ? "bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30"
                        : "bg-white/[0.03] text-gray-600 border border-white/[0.06]"
                    }`}
                  >
                    {d.slice(0, 3)}
                  </span>
                );
              })}
            </div>
          </div>

          {policy.is_overnight && (
            <p className="text-sky-400/90 text-xs bg-sky-500/10 border border-sky-500/25 rounded-lg px-3 py-2">
              Raat ki shift — aap ki attendance us din ki ginti hai jis din
              shift <b>shuru</b> hui thi, chahe check-out agle din ho.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function PolicyFact({ label, value, note }) {
  return (
    <div className="min-w-0">
      <p className="text-gray-500 text-[10.5px] uppercase tracking-wider">
        {label}
      </p>
      <p className="text-white text-sm font-semibold mt-0.5 truncate">{value}</p>
      {note && <p className="text-gray-600 text-[10.5px] truncate">{note}</p>}
    </div>
  );
}

export default function EmployeeAttendance() {
  const token = localStorage.getItem("token");
  const employeeId = localStorage.getItem("user_id");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // ──── Aakhri kaamyaab reading + chal rahi location request ────
  const lastGoodRef = useRef(null);
  const locationPromiseRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${token}` };
  const jsonHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  // ──── Enrollment ────
  const [isEnrolled, setIsEnrolled] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [showEnrollCamera, setShowEnrollCamera] = useState(false);

  // ──── Session ────
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [todayInfo, setTodayInfo] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // ──── UI ────
  const [showCamera, setShowCamera] = useState(false);
  const [cameraAction, setCameraAction] = useState("checkin");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  // ──── Location / office ────
  const [location, setLocation] = useState(null);
  const [office, setOffice] = useState(null);
  const [locating, setLocating] = useState(false);

  // ──── History ────
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  // ══════════════════════════════════════
  // Load
  // ══════════════════════════════════════
  useEffect(() => {
    checkEnrollmentStatus();
    fetchTodayStatus();
    fetchHistory();
    fetchOffice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──── Timer — server ke elapsed se chalta hai ────
  useEffect(() => {
    if (status !== "working") return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // ──── Har minute server se sync ────
  // Shift end hote hi check-in button khud disable ho jaye,
  // aur timer server ke waqt se match karta rahe
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetchTodayStatus();
    }, 60000);
    const onFocus = () => fetchTodayStatus();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──── Camera stream attach ────
  useEffect(() => {
    if ((showCamera || showEnrollCamera) && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [showCamera, showEnrollCamera]);

  // ──── Unmount pe camera band ────
  useEffect(
    () => () => streamRef.current?.getTracks().forEach((t) => t.stop()),
    [],
  );

  const formatElapsed = (sec) => {
    const h = Math.floor(sec / 3600).toString().padStart(2, "0");
    const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(sec % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  // ══════════════════════════════════════
  // API calls
  // ══════════════════════════════════════
  const checkEnrollmentStatus = async () => {
    try {
      const res = await fetch(
        `${API}/attendance/enrollment-status/${employeeId}`,
        { headers: authHeaders },
      );
      const data = await res.json();
      setIsEnrolled(!!data.enrolled);
    } catch {
      setIsEnrolled(false);
    }
  };

  const fetchOffice = async () => {
    try {
      const res = await fetch(`${API}/attendance/my-office`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) setOffice(data);
    } catch {
      /* office info optional hai */
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const res = await fetch(`${API}/attendance/today/${employeeId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) return;

      setTodayInfo(data);
      setSessionId(data.session_id || null);
      setElapsed(data.elapsed_seconds || 0);

      if (data.status === "checked_in") setStatus("working");
      else if (data.status === "paused") setStatus("paused");
      else if (data.status === "checked_out") setStatus("checked_out");
      else if (data.status === "on_leave") setStatus("on_leave");
      else setStatus("idle");
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API}/attendance/history/${employeeId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) setHistory(data.history || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ──────────────────────────────────────
  // Location acquire
  // ──────────────────────────────────────
  const refreshLocation = useCallback(async () => {
    setLocating(true);
    setWarning("");

    const result = await acquireLocation();

    if (!result.error) {
      lastGoodRef.current = result;
      setLocation(result);
      setLocating(false);
      return result;
    }

    // ──── Fresh reading nahi mili — haal hi ki reading zaya mat karo ────
    const cached = lastGoodRef.current;
    if (cached && Date.now() - cached.at < LAST_GOOD_MAX_AGE_MS) {
      const ageSec = Math.round((Date.now() - cached.at) / 1000);
      setWarning(
        `Nayi location nahi mili — ${ageSec}s purani reading use kar rahe hain`,
      );
      setLocating(false);
      return cached;
    }

    setLocation(null);
    setWarning(geoErrorMessage(result.error));
    setLocating(false);
    return null;
  }, []);

  // ──── Location pehle se lena shuru kar do ────
  // Camera khulte hi GPS lock lagna shuru ho jaye — banda photo ke liye
  // taiyaar hota hai us 3-5 second mein reading ready ho jaati hai
  const primeLocation = useCallback(() => {
    locationPromiseRef.current = refreshLocation();
    return locationPromiseRef.current;
  }, [refreshLocation]);

  // ──── Submit ke waqt: primed reading agar bohot purani ho to dobara lo ────
  const getCoordsForSubmit = useCallback(
    async (maxAgeMs = 90000) => {
      const primed = await (locationPromiseRef.current || primeLocation());
      if (primed && Date.now() - primed.at <= maxAgeMs) return primed;
      return primeLocation();
    },
    [primeLocation],
  );

  useEffect(() => {
    // ──── Page khulte hi background mein location le lo ────
    primeLocation();
  }, [primeLocation]);

  // ══════════════════════════════════════
  // Face enrollment (auto, pehli dafa)
  // ══════════════════════════════════════
  useEffect(() => {
    if (isEnrolled === false) startAutoEnroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnrolled]);

  const startAutoEnroll = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setShowEnrollCamera(true);

      // ──── Camera warm-up ────
      await new Promise((r) => setTimeout(r, 2000));

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      const imageBase64 = canvas.toDataURL("image/jpeg");

      streamRef.current?.getTracks().forEach((t) => t.stop());
      setShowEnrollCamera(false);

      setEnrolling(true);
      const res = await fetch(`${API}/attendance/self-enroll`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          employee_id: parseInt(employeeId),
          face_images: [imageBase64],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsEnrolled(true);
        setMessage("✅ Face enrolled! Ab check-in kar sakte ho.");
      } else {
        setError(data.detail || "Enrollment failed — dobara try karo");
      }
      setEnrolling(false);
    } catch {
      setError("Camera permission chahiye!");
      setShowEnrollCamera(false);
      setEnrolling(false);
    }
  };

  // ══════════════════════════════════════
  // Attendance camera
  // ══════════════════════════════════════
  const openCamera = async (action) => {
    setCameraAction(action);
    setError("");
    setMessage("");

    // ──── GPS abhi se lagna shuru — photo tak reading ready ho jayegi ────
    primeLocation();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch {
      // ──── Camera na mile to bhi attendance ruknI nahi chahiye ────
      setWarning("Camera nahi mila — photo ke baghair mark kar rahe hain");
      if (action === "checkin") await doCheckIn(null);
      else await doCheckOut(null);
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    let imageBase64 = null;

    if (video && canvas && video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d").drawImage(video, 0, 0);
      imageBase64 = canvas.toDataURL("image/jpeg", 0.8);
    }

    closeCamera();

    if (cameraAction === "checkin") await doCheckIn(imageBase64);
    else await doCheckOut(imageBase64);
  };

  // ══════════════════════════════════════
  // Check-in / Check-out
  // ══════════════════════════════════════
  const locationResultMessage = (data) => {
    if (data.location_note === "out_of_range") {
      return ` ⚠ Office se bahar (${Math.round(data.distance_meters ?? data.checkout_distance_meters ?? 0)}m) — CEO ko flag dikhega`;
    }
    if (data.location_note === "gps_unavailable") {
      return " ⚠ GPS nahi mili — location verify nahi hui";
    }
    return "";
  };

  const doCheckIn = async (imageBase64) => {
    setLoading(true);
    setLoadingText("Location le rahe hain...");
    setError("");
    setMessage("");

    try {
      // ──── Camera khulte waqt jo request chali thi wahi use karo ────
      const coords = await getCoordsForSubmit();
      setLoadingText("Check-in ho raha hai...");

      const res = await fetch(`${API}/attendance/check-in`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          employee_id: parseInt(employeeId),
          face_image: imageBase64,
          gps_latitude: coords?.lat ?? null,
          gps_longitude: coords?.lng ?? null,
          gps_accuracy_meters: coords?.accuracy ?? null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Check-in failed");
        setLoading(false);
        return;
      }

      setSessionId(data.session_id);
      setStatus("working");
      setElapsed(0);
      setMessage(
        (data.is_late
          ? `✅ Checked in! (Late by ${formatMinutes(data.late_by_minutes)})`
          : "✅ Checked in!") + locationResultMessage(data),
      );
      await Promise.all([fetchHistory(), fetchTodayStatus()]);
    } catch {
      setError("Server error");
    }
    setLoading(false);
    setLoadingText("");
  };

  const doCheckOut = async (imageBase64) => {
    setLoading(true);
    setLoadingText("Location le rahe hain...");
    setError("");
    setMessage("");

    try {
      // ──── Camera khulte waqt jo request chali thi wahi use karo ────
      const coords = await getCoordsForSubmit();
      setLoadingText("Check-out ho raha hai...");

      const res = await fetch(`${API}/attendance/check-out`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          employee_id: parseInt(employeeId),
          face_image: imageBase64,
          gps_latitude: coords?.lat ?? null,
          gps_longitude: coords?.lng ?? null,
          gps_accuracy_meters: coords?.accuracy ?? null,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Check-out failed");
        setLoading(false);
        return;
      }

      setStatus("checked_out");
      setMessage(
        `✅ Checked out! Net: ${data.net_hours}h` +
          (data.total_pause_minutes
            ? ` | Break: ${formatMinutes(data.total_pause_minutes)}`
            : "") +
          (data.is_overtime ? ` | OT: ${formatMinutes(data.overtime_minutes)}` : "") +
          (data.is_undertime ? ` | UT: ${formatMinutes(data.undertime_minutes)}` : "") +
          (data.is_early_checkout
            ? ` | Shift end se ${formatMinutes(data.early_checkout_minutes)} pehle`
            : "") +
          locationResultMessage(data),
      );
      await Promise.all([fetchHistory(), fetchTodayStatus()]);
    } catch {
      setError("Server error");
    }
    setLoading(false);
    setLoadingText("");
  };

  const doPause = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/attendance/pause`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          employee_id: parseInt(employeeId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("paused");
        setMessage("☕ Break start!");
      } else {
        setError(data.detail || "Pause failed");
      }
    } catch {
      setError("Server error");
    }
    setLoading(false);
  };

  const doResume = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/attendance/resume`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          session_id: sessionId,
          employee_id: parseInt(employeeId),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("working");
        setMessage(
          `✅ Resumed! (Break: ${Math.round(data.pause_duration_minutes || 0)}m)`,
        );
      } else {
        setError(data.detail || "Resume failed");
      }
    } catch {
      setError("Server error");
    }
    setLoading(false);
  };

  // ══════════════════════════════════════
  // Derived
  // ══════════════════════════════════════
  const officeDistance =
    location && office?.office
      ? distanceMeters(
          location.lat,
          location.lng,
          office.office.latitude,
          office.office.longitude,
        )
      : null;

  const withinOffice =
    officeDistance != null &&
    officeDistance <=
      office.office.radius_meters + Math.min(location?.accuracy || 0, 250);

  // ──── Check-in window — shift ke bahar check-in nahi hota ────
  const checkinWindow = todayInfo?.checkin_window || office?.checkin_window;
  const checkinBlocked = checkinWindow?.open === false;

  // ──── "Abhi" ka waqt SERVER se ────
  // Browser ki ghari galat ho sakti hai ya timezone alag ho sakta hai.
  // Attendance ka har faisla server ke waqt par hota hai, is liye policy
  // lakeer ka nishan bhi wahin se aana chahiye.
  const serverMinutes = (() => {
    const stamp = todayInfo?.server_time || office?.server_time;
    if (!stamp) return null;
    const m = String(stamp).match(/(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  })();

  // Rang kit se — CEO ki screen par bhi bilkul yehi hara/peela/laal hai
  const statusTone = { Present: "ok", Late: "warn", Absent: "bad" };
  const getRowStatus = (row) => {
    if (!row.check_in_time) return "Absent";
    if (row.is_late) return "Late";
    return "Present";
  };
  const formatTime = (dt) =>
    !dt
      ? "—"
      : new Date(dt.replace(" ", "T")).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
  // "2026-08-05" ko UTC midnight na samjho — warna kuch timezones mein
  // ek din pehle ki date dikhti hai
  const formatDate = (dt) => {
    if (!dt) return "—";
    const [y, m, d] = String(dt).slice(0, 10).split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalPages = Math.max(1, Math.ceil(history.length / rowsPerPage));
  const pagedHistory = history.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  // ══════════════════════════════════════
  // Loading
  // ══════════════════════════════════════
  if (isEnrolled === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  // ══════════════════════════════════════
  // ENROLLMENT SCREEN
  // ══════════════════════════════════════
  if (!isEnrolled) {
    return (
      <div className="w-full flex flex-col gap-6 p-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
            {error}
            <button
              onClick={startAutoEnroll}
              className="ml-3 px-2 py-0.5 bg-red-500/30 rounded text-xs"
            >
              Retry
            </button>
          </div>
        )}

        {!error && (
          <div className="w-full p-8 rounded-2xl border border-[#05DC7F]/25 bg-black/40 flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-[#05DC7F]/10 flex items-center justify-center">
              <Camera size={44} className="text-[#05DC7F]" />
            </div>
            <h2 className="text-white text-xl font-bold">Face Enrollment</h2>
            <p className="text-gray-400 text-sm text-center">
              {enrolling ? "Enrolling..." : "Camera ready ho raha hai..."}
            </p>
            {enrolling && (
              <div className="w-8 h-8 border-2 border-[#05DC7F] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}

        {showEnrollCamera && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
            <div className="bg-[#111] p-6 rounded-xl flex flex-col gap-4 items-center">
              <p className="text-white font-semibold">Camera seedha dekho...</p>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-80 rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-[#05DC7F] text-sm animate-pulse">
                Auto capture ho raha hai...
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════
  // ATTENDANCE SCREEN
  // ══════════════════════════════════════
  return (
    <div className="w-full flex flex-col gap-6 p-4">
      {message && (
        <div className="p-3 rounded-lg bg-[#05DC7F]/20 border border-[#05DC7F] text-[#05DC7F] text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
          {error}
        </div>
      )}
      {warning && (
        <div className="p-3 rounded-lg bg-yellow-500/15 border border-yellow-500/50 text-yellow-400 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{warning}</span>
        </div>
      )}

      {/* ── Meri Work Policy ──
          Employee ko wo sab qawaid dikhte hain jin par uski attendance
          napi jati hai — pehle yeh sirf CEO ke Settings mein the */}
      <WorkPolicyCard
        policy={office?.policy}
        nowMinutes={serverMinutes}
        isWorkingDay={todayInfo?.is_working_day !== false}
      />

      {/* ── Attendance Card ── */}
      <div className="w-full p-6 rounded-2xl border border-[#05DC7F]/25 bg-black/40 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full flex items-center justify-center bg-[#05DC7F]/10">
          <Clock size={44} className="text-[#05DC7F]" />
        </div>

        <h2 className="text-white text-lg font-semibold">
          {status === "idle" && "Not Checked In"}
          {status === "working" && `Working — ${formatElapsed(elapsed)}`}
          {status === "paused" && "On Break"}
          {status === "checked_out" && "Checked Out ✅"}
          {status === "on_leave" && "Aaj aap leave pe hain 🌴"}
        </h2>

        {/* ── Live location ── */}
        <div className="flex flex-col items-center gap-1">
          <div className="text-gray-400 text-sm flex items-center gap-2">
            <MapPin size={14} />
            {locating ? (
              "Location le rahe hain..."
            ) : location ? (
              <span>
                {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                <span className="text-gray-500">
                  {" "}
                  (±{Math.round(location.accuracy)}m
                  {location.source === "gps"
                    ? ""
                    : location.source === "network"
                      ? ", WiFi"
                      : ", cached"}
                  )
                </span>
              </span>
            ) : (
              <span className="text-yellow-400">Location not available</span>
            )}
            <button
              onClick={primeLocation}
              disabled={locating}
              title="Location dobara lo"
              className="text-[#05DC7F] hover:text-white transition disabled:opacity-40"
            >
              <RefreshCw size={13} className={locating ? "animate-spin" : ""} />
            </button>
          </div>

          {office?.office && officeDistance != null && (
            <p
              className={`text-xs ${withinOffice ? "text-[#05DC7F]" : "text-yellow-400"}`}
            >
              {office.office.office_name} se {Math.round(officeDistance)}m
              {withinOffice
                ? " — office range ke andar ✓"
                : ` — range ${office.office.radius_meters}m se bahar`}
            </p>
          )}
          {office && !office.office && (
            <p className="text-gray-500 text-xs">
              Office location set nahi — GPS verification skip
            </p>
          )}
          {office && !office.is_working_day && (
            <p className="text-gray-500 text-xs">
              Aaj working day nahi hai — kaam overtime count hoga
            </p>
          )}
          {/* ── Window khula hai to deadline pata ho ── */}
          {status === "idle" && checkinWindow?.enforced && checkinWindow.open && (
            <p className="text-gray-500 text-xs">
              Check-in {checkinWindow.opens_at} – {checkinWindow.closes_at} tak
              hi ho sakta hai
            </p>
          )}
          {/* ── Kal ka session abhi khula ── */}
          {todayInfo?.is_previous_day_session && (
            <p className="text-yellow-400 text-xs">
              {todayInfo.date} ka session abhi khula hai — check-out karein
            </p>
          )}

          {/* ── Raat ki shift: calendar date aur work day alag hote hain ── */}
          {todayInfo?.is_overnight_shift &&
            todayInfo.work_date !== todayInfo.server_date && (
              <p className="text-sky-400 text-xs">
                Raat ki shift — yeh attendance{" "}
                <b>{prettyWorkDate(todayInfo.work_date)}</b> ki gini jayegi
                (shift usi din shuru hui thi)
              </p>
            )}
        </div>

        {todayInfo?.check_in_time && (
          <div className="text-gray-400 text-sm">
            Check-in: {formatTime(todayInfo.check_in_time)}
            {todayInfo.is_late && (
              <span className="ml-2 text-yellow-400">
                (Late {formatMinutes(todayInfo.late_by_minutes)})
              </span>
            )}
            {todayInfo.pause_minutes_so_far > 0 && (
              <span className="ml-2 text-gray-500">
                · Break {formatMinutes(todayInfo.pause_minutes_so_far)}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-[#05DC7F] bg-[#05DC7F]/10 px-3 py-1 rounded-full border border-[#05DC7F]/30">
          <Camera size={12} />
          Face Enrolled ✓
        </div>

        <div className="w-full flex flex-col gap-3 mt-2">
          {status === "idle" &&
            (checkinBlocked ? (
              // ──── Shift ke bahar — button hi disable, error baad mein nahi ────
              <div className="w-full flex flex-col items-center gap-2">
                <button
                  disabled
                  className="w-full py-2.5 rounded-lg font-medium bg-gray-700 text-gray-400 cursor-not-allowed"
                >
                  Check In band hai
                </button>
                <p
                  className={`text-xs text-center ${
                    checkinWindow.reason === "shift_ended"
                      ? "text-red-400"
                      : "text-yellow-400"
                  }`}
                >
                  {checkinWindow.message}
                </p>
                {checkinWindow.opens_at && (
                  <p className="text-gray-500 text-xs">
                    Window: {checkinWindow.opens_at} – {checkinWindow.closes_at}
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={() => openCamera("checkin")}
                disabled={loading}
                className="w-full py-2.5 rounded-lg font-medium bg-[#05DC7F] text-black hover:bg-[#04c56f] transition disabled:opacity-50"
              >
                {loading ? loadingText || "Processing..." : "Check In"}
              </button>
            ))}

          {status === "working" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={doPause}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-yellow-400 text-black hover:bg-yellow-300 transition disabled:opacity-50"
              >
                <Coffee size={16} /> Break
              </button>
              <button
                onClick={() => openCamera("checkout")}
                disabled={loading}
                className="flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-red-500 text-white hover:bg-red-400 transition disabled:opacity-50"
              >
                {loading ? loadingText || "Processing..." : "Check Out"}
              </button>
            </div>
          )}

          {status === "paused" && (
            <button
              onClick={doResume}
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium bg-gray-700 text-white hover:bg-gray-600 transition disabled:opacity-50"
            >
              {loading ? "Processing..." : "Resume Work"}
            </button>
          )}

          {status === "checked_out" && (
            <div className="flex items-center justify-center gap-2 text-[#05DC7F]">
              <CheckCircle size={20} />
              <span>Day Complete!</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Camera Popup ── */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#111] p-6 rounded-xl flex flex-col gap-4">
            <p className="text-white text-center font-semibold">
              Attendance Photo —{" "}
              {cameraAction === "checkin" ? "Check-In" : "Check-Out"}
            </p>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-80 rounded-lg"
            />
            <canvas ref={canvasRef} className="hidden" />
            <button
              onClick={capturePhoto}
              className="bg-[#05DC7F] text-black py-2 rounded-lg font-semibold"
            >
              Capture & {cameraAction === "checkin" ? "Check In" : "Check Out"}
            </button>
            <button
              onClick={closeCamera}
              className="text-gray-400 text-sm text-center"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── History ── */}
      <Panel
        title="Attendance History"
        icon={CalendarDays}
        actions={
          <IconButton
            icon={RefreshCw}
            label="Dobara load karein"
            onClick={fetchHistory}
          />
        }
      >
        {history.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Abhi koi record nahi"
            hint="Pehla check-in karte hi aap ka din yahan aa jayega."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-sm">
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-left">Check-In</th>
                    <th className="py-3 px-4 text-left">Check-Out</th>
                    <th className="py-3 px-4 text-left">Net Hours</th>
                    <th className="py-3 px-4 text-left">In Location</th>
                    <th className="py-3 px-4 text-left">Out Location</th>
                    <th className="py-3 px-4 text-left">Flags</th>
                    <th className="py-3 px-4 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedHistory.map((item) => (
                    <tr
                      key={item.session_id ?? item.date}
                      className="border-b border-gray-700 hover:bg-[#05DC7F]/5 transition"
                    >
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {formatDate(item.date)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {formatTime(item.check_in_time)}
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm">
                        {formatTime(item.check_out_time)}
                      </td>
                      <td className="py-3 px-4 text-white text-sm font-medium">
                        {item.net_hours != null
                          ? `${item.net_hours.toFixed(1)}h`
                          : "—"}
                      </td>

                      <td className="py-3 px-4">
                        <LocationBadge
                          lat={item.check_in_lat}
                          lng={item.check_in_lng}
                          verified={item.location_verified}
                          distance={item.check_in_distance_meters}
                          note={item.check_in_location_note}
                        />
                      </td>

                      <td className="py-3 px-4">
                        <LocationBadge
                          lat={item.check_out_lat}
                          lng={item.check_out_lng}
                          verified={item.checkout_location_verified}
                          distance={item.check_out_distance_meters}
                          note={item.check_out_location_note}
                        />
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex gap-1 flex-wrap">
                          {item.is_late && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                              Late {formatMinutes(item.late_by_minutes)}
                            </span>
                          )}
                          {item.is_overtime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                              OT {formatMinutes(item.overtime_minutes)}
                            </span>
                          )}
                          {item.is_undertime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                              UT {formatMinutes(item.undertime_minutes)}
                            </span>
                          )}
                          {item.is_early_checkout && (
                            <span
                              title="Shift end se pehle check-out"
                              className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400"
                            >
                              Early {formatMinutes(item.early_checkout_minutes)}
                            </span>
                          )}
                          {!item.is_late &&
                            !item.is_overtime &&
                            !item.is_undertime &&
                            !item.is_early_checkout && (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <Pill tone={statusTone[getRowStatus(item)] || "muted"}>
                          {getRowStatus(item)}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
