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
} from "lucide-react";

const API = "http://127.0.0.1:8000";

// ──────────────────────────────────────────
// GPS: sabse achhi reading pakdo
// ──────────────────────────────────────────
// Purana code ek hi getCurrentPosition call karta tha, aur fail hone pe
// Islamabad ke hardcoded coords bhej deta tha — isi wajah se check-out
// "20098m door" dikhata tha. Ab hum kuch seconds readings sunte hain aur
// sabse behtar accuracy wali bhejte hain. Na mile to null bhejte hain
// (jhooti location nahi).
function getBestPosition({ timeoutMs = 9000, targetAccuracy = 30 } = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    let best = null;
    let settled = false;
    let watchId = null;
    let timer = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      resolve(best);
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        if (!best || reading.accuracy < best.accuracy) best = reading;
        // ──── Itni achhi reading mil gayi ke aur wait ki zarurat nahi ────
        if (reading.accuracy <= targetAccuracy) finish();
      },
      () => finish(), // permission denied / unavailable
      { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs },
    );

    timer = setTimeout(finish, timeoutMs);
  });
}

// ──── Haversine (office se distance dikhane ke liye) ────
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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

export default function EmployeeAttendance() {
  const token = localStorage.getItem("token");
  const employeeId = localStorage.getItem("user_id");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

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

  // ──── Location refresh (button) ────
  const refreshLocation = useCallback(async () => {
    setLocating(true);
    setWarning("");
    const pos = await getBestPosition();
    setLocation(pos);
    if (!pos) {
      setWarning(
        "GPS location nahi mili — browser mein location permission allow karein",
      );
    }
    setLocating(false);
    return pos;
  }, []);

  useEffect(() => {
    // ──── Page khulte hi background mein location le lo ────
    refreshLocation();
  }, [refreshLocation]);

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
      const coords = await refreshLocation();
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
          ? `✅ Checked in! (Late by ${data.late_by_minutes} min)`
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
      const coords = await refreshLocation();
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
            ? ` | Break: ${data.total_pause_minutes}m`
            : "") +
          (data.is_overtime ? ` | OT: ${data.overtime_minutes}m` : "") +
          (data.is_undertime ? ` | UT: ${data.undertime_minutes}m` : "") +
          (data.is_early_checkout
            ? ` | Shift end se ${data.early_checkout_minutes}m pehle`
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

  const statusBadge = {
    Present: "bg-[#05DC7F]/20 text-[#05DC7F] border border-[#05DC7F]/40",
    Late: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
    Absent: "bg-red-500/20 text-red-400 border border-red-500/40",
  };
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
            {locating
              ? "Location le rahe hain..."
              : location
                ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)} (±${Math.round(location.accuracy)}m)`
                : "Location not available"}
            <button
              onClick={refreshLocation}
              disabled={locating}
              title="Location refresh karo"
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
        </div>

        {todayInfo?.check_in_time && (
          <div className="text-gray-400 text-sm">
            Check-in: {formatTime(todayInfo.check_in_time)}
            {todayInfo.is_late && (
              <span className="ml-2 text-yellow-400">
                (Late {todayInfo.late_by_minutes}min)
              </span>
            )}
            {todayInfo.pause_minutes_so_far > 0 && (
              <span className="ml-2 text-gray-500">
                · Break {Math.round(todayInfo.pause_minutes_so_far)}m
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
      <div className="w-full rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="text-[#05DC7F]" /> Attendance History
          </h2>
          <button
            onClick={fetchHistory}
            className="px-3 py-1 text-xs bg-[#05DC7F]/20 text-[#05DC7F] border border-[#05DC7F]/30 rounded-lg hover:bg-[#05DC7F]/30 transition"
          >
            Refresh
          </button>
        </div>

        {history.length === 0 ? (
          <div className="text-center text-gray-400 py-6">
            Koi record nahi hai
          </div>
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
                              Late {item.late_by_minutes}m
                            </span>
                          )}
                          {item.is_overtime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">
                              OT {item.overtime_minutes}m
                            </span>
                          )}
                          {item.is_undertime && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
                              UT {item.undertime_minutes}m
                            </span>
                          )}
                          {item.is_early_checkout && (
                            <span
                              title="Shift end se pehle check-out"
                              className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400"
                            >
                              Early {item.early_checkout_minutes}m
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
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            statusBadge[getRowStatus(item)]
                          }`}
                        >
                          {getRowStatus(item)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-end items-center gap-2 mt-4 text-gray-300 text-sm">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded disabled:opacity-50"
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
                  className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded disabled:opacity-50"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
