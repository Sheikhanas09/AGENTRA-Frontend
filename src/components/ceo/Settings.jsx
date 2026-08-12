"use client";
import { useState, useEffect } from "react";
import {
  FaUser,
  FaEnvelope,
  FaBuilding,
  FaLock,
  FaUpload,
  FaTimes,
  FaClock,
  FaFileAlt,
  FaCheckCircle,
  FaSpinner,
  FaTrash,
} from "react-icons/fa";

// ──────────────────────────────────────────
// Shift ka hisaab — 12-hour label + overnight detect
// ──────────────────────────────────────────
// Backend bhi bilkul yehi logic use karta hai (utils/workpolicy.py)
function shiftInfo(start, end) {
  const toMin = (v) => {
    const parts = String(v || "").split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };

  const s = toMin(start);
  const e = toMin(end);
  if (s === null || e === null) return null;

  const label = (mins) => {
    const h24 = Math.floor(mins / 60);
    const m = mins % 60;
    const ampm = h24 < 12 ? "AM" : "PM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const overnight = e < s;
  const len = overnight ? 24 * 60 - s + e : e - s;
  const lh = Math.floor(len / 60);
  const lm = len % 60;

  return {
    overnight,
    startLabel: label(s),
    endLabel: label(e),
    lengthLabel: lm ? `${lh}h ${lm}m` : `${lh} ghante`,
    tooLong: len > 12 * 60,
  };
}

// ──────────────────────────────────────────
// Extraction panel ke liye
// ──────────────────────────────────────────
const FIELD_LABELS = {
  shift_start: "Shift Start",
  shift_end: "Shift End",
  working_days: "Working Days",
  late_tolerance_mins: "Late Tolerance",
  early_checkin_grace_mins: "Early Check-in Grace",
  enforce_shift_window: "Shift Window Enforce",
  leave_auto_approve_hours: "Leave Auto-approve",
  min_daily_hours: "Minimum Daily Hours",
  overtime_threshold: "Overtime Threshold",
  max_overtime_per_day: "Max Overtime / Day",
  break_policy: "Break Policy",
  break_minutes: "Break (minutes)",
  break_start: "Break Start",
  break_end: "Break End",
};

// "13:00" → "1:00 PM"
function to12hLabel(hhmm) {
  const parts = String(hhmm || "").split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return "—";
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// Break kitni der ki hai — aadhi raat paar kar jaye to bhi theek
function breakSpan(start, end) {
  const toMin = (v) => {
    const p = String(v || "").split(":");
    const h = Number(p[0]);
    const m = Number(p[1]);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };
  const s = toMin(start);
  const e = toMin(end);
  if (s === null || e === null) return 0;
  return e >= s ? e - s : 1440 - s + e;
}

function fmtFieldValue(v) {
  if (Array.isArray(v)) return v.map((d) => d.slice(0, 3)).join(", ");
  if (typeof v === "boolean") return v ? "On" : "Off";
  return String(v);
}

export default function Settings() {
  const token = localStorage.getItem("token");

  // ──── CEO Profile ────
  const [ceoData, setCeoData] = useState({
    name: "",
    email: "",
    companyName: "",
    password: "",
  });

  // ──── Work Policy ────
  const [workPolicy, setWorkPolicy] = useState({
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    shift_start: "09:00",
    shift_end: "18:00",
    late_tolerance_mins: 15,
    enforce_shift_window: true,
    early_checkin_grace_mins: 60,
    leave_auto_approve_hours: 24,
    min_daily_hours: 8,
    overtime_threshold: 9,
    max_overtime_per_day: 3,
    break_policy: "excluded",
    break_minutes: 60,
    break_start: "",
    break_end: "",
  });

  // ──── Policy Document ────
  const [policyFile, setPolicyFile] = useState(null);
  const [policyLabel, setPolicyLabel] = useState("Company Policy v1");
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const [policyStatus, setPolicyStatus] = useState(null);

  // ──── Uploaded policies ki list + delete ────
  const [policyList, setPolicyList] = useState([]);
  const [deletingPolicy, setDeletingPolicy] = useState(null);
  const [activatingPolicy, setActivatingPolicy] = useState(null);

  // ──── Policy se working hours ki tajweez ────
  // {fields: {name: {value, source_quote, confidence, current_value, changes}}, warnings}
  const [extraction, setExtraction] = useState(null);
  const [extracting, setExtracting] = useState(false);

  // ──── UI States ────
  const [loading, setLoading] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  // ──── Office Location ────
  const [officeLocation, setOfficeLocation] = useState({
    office_name: "Head Office",
    latitude: "",
    longitude: "",
    radius_meters: 200,
  });
  const [savingOffice, setSavingOffice] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // ──── Fetch Profile ────
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/ceo/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setCeoData({
          name: data.full_name || "",
          email: data.email || "",
          companyName: data.company_name || "",
          password: "",
        });
      } catch (e) {
        console.error(e);
      }

      // ──── Office Location fetch ────
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/settings/office-location",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.office) {
          setOfficeLocation({
            office_name: data.office.office_name,
            latitude: data.office.latitude,
            longitude: data.office.longitude,
            radius_meters: data.office.radius_meters,
          });
        }
      } catch (e) {
        console.error(e);
      }

      await loadWorkPolicy();
      await loadActivePolicyResult();
    };
    fetchData();
    loadPolicyList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ──── Work Policy server se ────
  // Alag function is liye ke policy document upload hone ke baad agent
  // khud fields bhar deta hai — tab form ko dobara load karna parta hai
  const loadWorkPolicy = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/settings/work-policy", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.policy) setWorkPolicy(data.policy);
    } catch (e) {
      console.error(e);
    }
  };

  // ──── Pichhli policy se kya laga tha ────
  // Upload par yeh sab khud ho chuka hota hai. Settings dobara kholne par
  // bhi CEO ko dikhna chahiye ke kaunsi field document se aayi thi —
  // isi liye natija active policy ke saath wapas aata hai.
  const loadActivePolicyResult = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/settings/policy/active", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.policy) return;

      const label = data.policy.policy_label || data.policy.file_name;

      if (data.policy.work_policy) {
        setExtraction({ ...data.policy.work_policy, policy_label: label });
      } else {
        // Document maujood hai magar us se working hours nikale hi nahi
        // gaye — yani wo is agent ke banne se PEHLE upload hua tha.
        // Yehi wo soorat hai jahan CEO ke paas koi aur rasta nahi,
        // is liye yahan "Dobara koshish" ka button dikhta hai.
        setExtraction({
          ran: false,
          policy_label: label,
          title: "Is document se working hours abhi nahi nikale gaye",
          reason:
            "Yeh document working hours wale agent se pehle upload hua tha. " +
            "Dobara koshish karein — ya nayi policy upload karein, wahan yeh khud ho jata hai.",
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ──── Dobara koshish ────
  // Yeh button sirf tab dikhta hai jab upload ke waqt agent FAIL hua ho.
  // Aam soorat mein kuch dabana nahi parta.
  const handleExtractWorkPolicy = async () => {
    setError("");
    setSuccess("");
    setExtracting(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/settings/work-policy/extract",
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Policy parhi nahi ja saki");
        setExtracting(false);
        return;
      }

      setExtraction(data);

      if (!data.found_count) {
        setError(
          "Policy document mein working hours nahi mile — fields waise hi rahin",
        );
      } else {
        // Sirf wo fields badlo jo document mein MILE
        setWorkPolicy((prev) => {
          const next = { ...prev };
          Object.entries(data.fields).forEach(([name, item]) => {
            next[name] = item.value;
          });
          return next;
        });
        setSuccess(
          `${data.found_count} field policy se bhar di gayin — dekh lein, phir Save karein`,
        );
      }
    } catch {
      setError("Server error");
    }
    setExtracting(false);
  };

  // ──── Uploaded policies ki list ────
  const loadPolicyList = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/settings/policy/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPolicyList(data.policies || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ──── Policy delete ────
  const handleDeletePolicy = async (policy) => {
    const label = policy.policy_label || policy.file_name;
    const warning = policy.is_active
      ? `"${label}" ACTIVE policy hai.\n\nDelete karne par uske vector chunks bhi hat jayenge — ` +
        `Leave Agent policy parh nahi payega aur sari requests aap ke paas aayengi.\n\nDelete karein?`
      : `"${label}" delete karein?`;

    if (!window.confirm(warning)) return;

    setDeletingPolicy(policy.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/settings/policy/${policy.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Delete nahi ho payi");
      } else {
        setSuccess(data.message + (data.note ? ` — ${data.note}` : ""));
        await loadPolicyList();
      }
    } catch (e) {
      setError("Server error");
    }
    setDeletingPolicy(null);
  };

  // Jis field ki value document se aayi, us par nishan — CEO ko pata
  // rahe ke yeh usne set ki thi ya agent ne policy se nikali
  const FromPolicy = ({ name }) => {
    const item = extraction?.fields?.[name];
    if (!item) return null;
    return (
      <span
        title={item.source_quote || "Policy document se"}
        className="px-1.5 py-0.5 rounded text-[10px] bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/25 cursor-help"
      >
        policy se
      </span>
    );
  };

  // ──── Toggle Working Day ────
  const toggleDay = (day) => {
    setWorkPolicy((prev) => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter((d) => d !== day)
        : [...prev.working_days, day],
    }));
  };

  // ──── Save Profile ────
  const handleSaveProfile = async () => {
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/ceo/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: ceoData.name,
          company_name: ceoData.companyName,
          password: ceoData.password || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Error");
        setLoading(false);
        return;
      }
      localStorage.setItem("full_name", data.full_name);
      setSuccess("Profile saved!");
    } catch (e) {
      setError("Server error");
    }
    setLoading(false);
  };

  // ──── Save Office Location ────
  const handleSaveOfficeLocation = async () => {
    setError("");
    setSuccess("");
    setSavingOffice(true);

    // ──── Validation ────
    if (!officeLocation.latitude || !officeLocation.longitude) {
      setError("Pehle location set karo — 'Use Current Location' click karo!");
      setSavingOffice(false);
      return;
    }

    const lat = parseFloat(officeLocation.latitude);
    const lng = parseFloat(officeLocation.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setError("Invalid coordinates!");
      setSavingOffice(false);
      return;
    }

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/settings/office-location",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            office_name: officeLocation.office_name,
            latitude: lat,
            longitude: lng,
            radius_meters: parseInt(officeLocation.radius_meters),
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Error");
        setSavingOffice(false);
        return;
      }
      setSuccess("Office location saved!");
    } catch (e) {
      setError("Server error");
    }
    setSavingOffice(false);
  };

  // ──── Get Current Location ────
  const handleGetCurrentLocation = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      setError("GPS not supported");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOfficeLocation((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setGettingLocation(false);
        setSuccess("Location fetched!");
      },
      () => {
        setError("GPS permission denied");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true },
    );
  };

  // ──── Save Work Policy ────
  const handleSaveWorkPolicy = async () => {
    setError("");
    setSuccess("");
    setSavingPolicy(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/settings/work-policy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(workPolicy),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Error");
        setSavingPolicy(false);
        return;
      }
      setSuccess("Work policy saved!");
    } catch (e) {
      setError("Server error");
    }
    setSavingPolicy(false);
  };

  // ──── Upload Policy Document ────
  const handleUploadPolicy = async () => {
    if (!policyFile) {
      setError("Pehle file select karo!");
      return;
    }
    setError("");
    setUploadingPolicy(true);

    const form = new FormData();
    form.append("file", policyFile);
    form.append("policy_label", policyLabel);

    try {
      const res = await fetch("http://127.0.0.1:8000/settings/policy/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Error");
        setUploadingPolicy(false);
        return;
      }

      setPolicyStatus("processing");
      watchIndexing(data.policy_id, policyLabel, { clearFile: true });
    } catch (e) {
      setError("Upload error");
    }
    setUploadingPolicy(false);
  };

  // ──── Indexing khatam hone ka intezar ────
  // Upload aur "purani policy dobara activate" — dono ka anjaam ek hi
  // hai (index → leave types → working hours), is liye intezar aur
  // natija dikhane ka kaam bhi ek hi jagah.
  const watchIndexing = (policyId, label, { clearFile = false } = {}) => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(
          `http://127.0.0.1:8000/settings/policy/status/${policyId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        const s = await r.json();
        setPolicyStatus(s.status);

        if (s.status === "active") {
          clearInterval(poll);

          // ──── Agent ne types khud laga di hain — CEO ko batao ────
          const lt = s.leave_types;
          let extra = "";
          if (lt?.ran) {
            const bits = [];
            if (lt.applied?.length) bits.push(`${lt.applied.length} type laagu`);
            if (lt.created?.length)
              bits.push(`${lt.created.join(", ")} nayi bani`);
            if (lt.disabled?.length)
              bits.push(`${lt.disabled.join(", ")} band ki gayin`);
            if (lt.balances_synced)
              bits.push(`${lt.balances_synced} employee balance update`);
            extra = ` — Leave types: ${bits.join(", ")}`;
          } else if (lt?.reason) {
            extra = ` — Leave types nahi badlin: ${lt.reason}`;
          }

          // ──── Working hours bhi khud lag gaye ────
          const wp = s.work_policy;
          if (wp) {
            // Panel foran dikh jaye — CEO ko kuch dabana nahi parta
            setExtraction({ ...wp, policy_label: label });
          }
          if (wp?.ran) {
            const n = Object.keys(wp.fields || {}).length;
            extra += ` — Working hours: ${n} field laagu`;
            if (wp.skipped?.length) extra += `, ${wp.skipped.length} manual`;
            // Form purani values dikha raha hoga — nayi le aao
            await loadWorkPolicy();
          } else if (wp?.reason) {
            extra += ` — Working hours nahi badle: ${wp.reason}`;
          }

          setSuccess(`"${label}" ab active hai — ${s.chunks_indexed} chunks.${extra}`);
          if (clearFile) setPolicyFile(null);
          await loadPolicyList();
        }

        if (s.status === "failed") {
          clearInterval(poll);
          setError(`"${label}" index nahi ho payi`);
          await loadPolicyList();
        }
      } catch {
        clearInterval(poll);
      }
    }, 3000);
  };

  // ──── Purani policy dobara active karo ────
  // File disk par mehfooz hai — dobara upload karne ki koi zarurat nahi.
  const handleActivatePolicy = async (policy) => {
    const label = policy.policy_label || policy.file_name;

    if (
      !window.confirm(
        `"${label}" ko active karein?\n\n` +
          `· Yeh dobara index hogi (purane chunks hat jayenge)\n` +
          `· Leave types aur Working Hours ISI document se dobara lagenge\n` +
          `· Abhi wali policy sirf inactive hogi — delete nahi hogi\n\n` +
          `Aap ne jo values manually badli hain wo is document ke mutabiq ` +
          `wapas set ho sakti hain.`,
      )
    )
      return;

    setError("");
    setSuccess("");
    setActivatingPolicy(policy.id);

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/settings/policy/${policy.id}/activate`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Activate nahi ho payi");
      } else {
        setPolicyStatus("processing");
        await loadPolicyList();
        watchIndexing(policy.id, label);
      }
    } catch {
      setError("Server error");
    }
    setActivatingPolicy(null);
  };

  return (
    <div className="max-w-4xl mx-auto mt-6">
      {/* ──── Tabs ──── */}
      <div className="flex gap-2 mb-6">
        {["profile", "work-policy", "policy-doc", "office-location"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition
              ${
                activeTab === tab
                  ? "bg-[#05DC7F] text-black"
                  : "bg-black/40 text-gray-400 border border-[#05DC7F]/20 hover:border-[#05DC7F]/50"
              }`}
            >
              {tab === "profile"
                ? "Profile"
                : tab === "work-policy"
                  ? "Working Hours"
                  : tab === "policy-doc"
                    ? "Policy Document"
                    : "Office Location"}
            </button>
          ),
        )}
      </div>

      {/* ──── Messages ──── */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-[#05DC7F]/20 border border-[#05DC7F] text-[#05DC7F] text-sm">
          {success}
        </div>
      )}

      {/* ══════════ TAB 1: PROFILE ══════════ */}
      {activeTab === "profile" && (
        <div className="p-6 bg-black/50 border border-[#05DC7F]/30 rounded-2xl">
          <h2 className="text-white text-xl font-bold mb-6">CEO Profile</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2 border-b border-[#05DC7F]/20 pb-2">
              <FaUser className="text-[#05DC7F]" />
              <input
                type="text"
                value={ceoData.name}
                onChange={(e) =>
                  setCeoData({ ...ceoData, name: e.target.value })
                }
                placeholder="Full Name"
                className="w-full bg-transparent text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2 border-b border-[#05DC7F]/20 pb-2">
              <FaEnvelope className="text-[#05DC7F]" />
              <input
                type="email"
                value={ceoData.email}
                readOnly
                className="w-full bg-transparent text-gray-400 outline-none cursor-not-allowed"
              />
            </div>
            <div className="flex items-center gap-2 border-b border-[#05DC7F]/20 pb-2">
              <FaBuilding className="text-[#05DC7F]" />
              <input
                type="text"
                value={ceoData.companyName}
                onChange={(e) =>
                  setCeoData({ ...ceoData, companyName: e.target.value })
                }
                placeholder="Company Name"
                className="w-full bg-transparent text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2 border-b border-[#05DC7F]/20 pb-2">
              <FaLock className="text-[#05DC7F]" />
              <input
                type="password"
                value={ceoData.password}
                onChange={(e) =>
                  setCeoData({ ...ceoData, password: e.target.value })
                }
                placeholder="New Password (optional)"
                className="w-full bg-transparent text-white outline-none"
              />
            </div>
          </div>
          <div className="flex justify-center mt-6">
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="px-6 py-2.5 bg-[#05DC7F] text-black font-semibold rounded-xl hover:bg-[#04c56f] transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ TAB 2: WORKING HOURS ══════════ */}
      {activeTab === "work-policy" && (
        <div className="p-6 bg-black/50 border border-[#05DC7F]/30 rounded-2xl">
          <h2 className="text-white text-xl font-bold mb-2">
            Working Hours Policy
          </h2>

          <p className="text-gray-500 text-xs mb-5">
            {policyList.length > 0
              ? "Policy document upload karte hi yeh fields khud bhar jati hain. Jo document mein na ho wo aap yahan set karein."
              : "Policy Document tab se document upload karein to yeh fields khud bhar jayengi."}
          </p>

          {/* ──── Document se kya laga — CEO khud tasdeeq kare ──── */}
          {extraction && (
            <div
              className={`mb-6 rounded-xl border p-4 ${
                extraction.ran
                  ? "border-[#05DC7F]/25 bg-[#05DC7F]/5"
                  : "border-yellow-500/30 bg-yellow-500/10"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  {extraction.ran ? (
                    <p className="text-[#05DC7F] text-sm font-semibold">
                      {extraction.found_count ??
                        Object.keys(extraction.fields || {}).length}{" "}
                      field policy se{" "}
                      {extraction.saved ? "khud lag gayin" : "bhar di gayin"} —{" "}
                      <span className="text-gray-400 font-normal">
                        {extraction.policy_label}
                      </span>
                    </p>
                  ) : (
                    <p className="text-yellow-400 text-sm font-semibold">
                      {extraction.title || "Policy se working hours nahi nikle"}
                    </p>
                  )}

                  {extraction.reason && (
                    <p className="text-gray-500 text-xs mt-0.5">
                      {extraction.reason}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Sirf NAAKAMI par — aam soorat mein kuch dabana nahi parta */}
                  {!extraction.ran && policyList.length > 0 && (
                    <button
                      onClick={handleExtractWorkPolicy}
                      disabled={extracting}
                      className="px-3 py-1.5 rounded-lg bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 text-xs hover:bg-yellow-500/25 transition disabled:opacity-40"
                    >
                      {extracting ? "Parh raha hai..." : "Dobara koshish"}
                    </button>
                  )}
                  <button
                    onClick={() => setExtraction(null)}
                    className="text-gray-500 hover:text-white text-xs"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {Object.keys(extraction.fields || {}).length > 0 && (
                <div className="flex flex-col gap-2">
                  {Object.entries(extraction.fields).map(([name, item]) => (
                    <div
                      key={name}
                      className="rounded-lg bg-black/30 border border-white/10 p-2.5"
                    >
                      <div className="flex items-center gap-2 flex-wrap text-sm">
                        <span className="text-gray-400">
                          {FIELD_LABELS[name] || name}
                        </span>
                        {item.changes && item.current_value != null && (
                          <span className="text-gray-600 line-through text-xs">
                            {fmtFieldValue(item.current_value)}
                          </span>
                        )}
                        <span className="text-white font-semibold">
                          {fmtFieldValue(item.value)}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            item.confidence === "high"
                              ? "bg-[#05DC7F]/20 text-[#05DC7F]"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}
                        >
                          {item.confidence === "high" ? "saaf likha" : "andaza"}
                        </span>
                      </div>
                      {item.source_quote && (
                        <p className="text-gray-500 text-xs mt-1 italic border-l-2 border-[#05DC7F]/30 pl-2">
                          "{item.source_quote}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {extraction.warnings?.length > 0 && (
                <div className="mt-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2.5">
                  <p className="text-yellow-400 text-xs font-semibold mb-1">
                    Yeh cheezein khud dekh lein:
                  </p>
                  <ul className="text-yellow-300/80 text-xs list-disc list-inside">
                    {extraction.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {extraction.ran && (
                <p className="text-gray-500 text-xs mt-3">
                  {extraction.saved ? (
                    <>
                      Yeh document upload hote hi khud lag gaya tha. Koi value
                      theek nahi lagti to neeche badal kar{" "}
                      <span className="text-[#05DC7F]">Save</span> kar dein.
                      {extraction.skipped?.length > 0 && (
                        <>
                          {" "}
                          Baqi {extraction.skipped.length} field document mein
                          nahi thi — wo aap ki set ki hui hai.
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      Yeh sirf form mein bhara gaya hai — neeche{" "}
                      <span className="text-[#05DC7F]">Save</span> dabane tak
                      kuch mehfooz nahi hua.
                    </>
                  )}
                </p>
              )}
            </div>
          )}

          {/* ──── Working Days ──── */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-3 flex items-center gap-2">
              Working Days <FromPolicy name="working_days" />
            </p>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`px-3 py-1.5 rounded-full text-sm font-semibold transition
                    ${
                      workPolicy.working_days?.includes(day)
                        ? "bg-[#05DC7F] text-black"
                        : "bg-black/40 text-gray-400 border border-[#05DC7F]/20"
                    }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* ──── Times ──── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Shift Start <FromPolicy name="shift_start" />
              </p>
              <input
                type="time"
                value={workPolicy.shift_start}
                onChange={(e) =>
                  setWorkPolicy({ ...workPolicy, shift_start: e.target.value })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Shift End <FromPolicy name="shift_end" />
              </p>
              <input
                type="time"
                value={workPolicy.shift_end}
                onChange={(e) =>
                  setWorkPolicy({ ...workPolicy, shift_end: e.target.value })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>

            {/* ── Shift ka preview ──
                12-hour mein dikhana zaroori hai: time input 24-hour value
                deta hai, aur AM/PM ki ghalti (5 PM ki jagah 05:00 AM)
                warna nazar hi nahi aati. */}
            <div className="md:col-span-2 -mt-1">
              {(() => {
                const s = shiftInfo(
                  workPolicy.shift_start,
                  workPolicy.shift_end,
                );
                if (!s) return null;
                return (
                  <div
                    className={`p-3 rounded-lg border text-sm ${
                      s.overnight
                        ? "border-amber-500/40 bg-amber-500/10"
                        : "border-[#05DC7F]/25 bg-[#05DC7F]/5"
                    }`}
                  >
                    <p className={s.overnight ? "text-amber-400" : "text-[#05DC7F]"}>
                      {s.overnight ? "⚠ " : "✓ "}
                      <b>{s.startLabel}</b> se <b>{s.endLabel}</b>
                      {s.overnight && " (agle din)"}
                      <span className="text-gray-400 font-normal">
                        {" "}
                        — {s.lengthLabel}
                      </span>
                    </p>
                    {s.overnight && (
                      <p className="text-gray-400 text-xs mt-1.5">
                        Yeh <b>raat bhar ki shift</b> hai — aadhi raat paar
                        karti hai aur agle din khatam hoti hai. Agar aap ka
                        matlab din ki shift tha to <b>AM / PM</b> dobara
                        check karein.
                      </p>
                    )}
                    {s.tooLong && (
                      <p className="text-amber-400 text-xs mt-1.5">
                        Shift {s.lengthLabel} ki hai — itni lambi shift aam
                        nahi hoti, ek dafa dekh lein.
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Late Tolerance (minutes) <FromPolicy name="late_tolerance_mins" />
              </p>
              <input
                type="number"
                value={workPolicy.late_tolerance_mins}
                onChange={(e) =>
                  setWorkPolicy({
                    ...workPolicy,
                    late_tolerance_mins: parseInt(e.target.value),
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
            {/* ── Check-in window ── */}
            <div className="md:col-span-2 rounded-lg border border-[#05DC7F]/20 bg-black/20 p-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workPolicy.enforce_shift_window !== false}
                  onChange={(e) =>
                    setWorkPolicy({
                      ...workPolicy,
                      enforce_shift_window: e.target.checked,
                    })
                  }
                  className="mt-1 accent-[#05DC7F] w-4 h-4"
                />
                <span>
                  <span className="text-white text-sm font-medium inline-flex items-center gap-2">
                    Check-in sirf shift ke darmiyan{" "}
                    <FromPolicy name="enforce_shift_window" />
                  </span>
                  <span className="block text-gray-500 text-xs mt-0.5">
                    Shift end ({workPolicy.shift_end}) ke baad check-in band —
                    employee us din absent rahega. Check-out par koi pabandi
                    nahi. Non-working day pe yeh rule apply nahi hota.
                  </span>
                </span>
              </label>

              {workPolicy.enforce_shift_window !== false && (
                <div className="mt-3 pl-7">
                  <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Shift se kitna pehle check-in allow (minutes) <FromPolicy name="early_checkin_grace_mins" />
              </p>
                  <input
                    type="number"
                    min="0"
                    max="720"
                    value={workPolicy.early_checkin_grace_mins ?? 60}
                    onChange={(e) =>
                      setWorkPolicy({
                        ...workPolicy,
                        early_checkin_grace_mins: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full md:w-48 bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Window: {workPolicy.shift_start} se{" "}
                    {workPolicy.early_checkin_grace_mins ?? 60} min pehle →{" "}
                    {workPolicy.shift_end} tak. 0 kar do to bilkul strict.
                  </p>
                </div>
              )}
            </div>

            {/* ── Leave approval deadline ── */}
            <div className="md:col-span-2 rounded-lg border border-[#05DC7F]/20 bg-black/20 p-3">
              <p className="text-white text-sm font-medium mb-1 flex items-center gap-2">
                Leave approval deadline (ghante){" "}
                <FromPolicy name="leave_auto_approve_hours" />
              </p>
              <p className="text-gray-500 text-xs mb-2">
                Har leave request aap ke paas aati hai. Itne ghante mein jawab
                na dein aur employee ka balance maujood ho to request khud
                approve ho jayegi — employee latka na rahe.{" "}
                <b className="text-gray-400">0 = kabhi auto-approve nahi.</b>
              </p>
              <input
                type="number"
                min="0"
                max="720"
                value={workPolicy.leave_auto_approve_hours ?? 24}
                onChange={(e) =>
                  setWorkPolicy({
                    ...workPolicy,
                    leave_auto_approve_hours: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full md:w-48 bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
              <p className="text-gray-500 text-xs mt-1">
                Jin leave types pe aapne manual override lagaya hai, wo kabhi
                khud approve nahi hongi.
              </p>
            </div>

            <div>
              <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Min Daily Hours <FromPolicy name="min_daily_hours" />
              </p>
              <input
                type="number"
                step="0.5"
                value={workPolicy.min_daily_hours}
                onChange={(e) =>
                  setWorkPolicy({
                    ...workPolicy,
                    min_daily_hours: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Overtime Threshold (hours) <FromPolicy name="overtime_threshold" />
              </p>
              <input
                type="number"
                step="0.5"
                value={workPolicy.overtime_threshold}
                onChange={(e) =>
                  setWorkPolicy({
                    ...workPolicy,
                    overtime_threshold: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                Max Overtime Per Day (hours) <FromPolicy name="max_overtime_per_day" />
              </p>
              <input
                type="number"
                step="0.5"
                value={workPolicy.max_overtime_per_day}
                onChange={(e) =>
                  setWorkPolicy({
                    ...workPolicy,
                    max_overtime_per_day: parseFloat(e.target.value),
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
          </div>

          {/* ──── Break ──── */}
          <div className="mb-6 rounded-lg border border-[#05DC7F]/20 bg-black/20 p-4">
            <p className="text-white text-sm font-medium mb-1 flex items-center gap-2">
              Break <FromPolicy name="break_start" />
            </p>
            <p className="text-gray-500 text-xs mb-4">
              Employee ko apni Attendance screen par yeh dikhta hai — kab, kitni
              der, aur kaam ke ghanton mein ginta hai ya nahi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-gray-400 text-sm mb-1">Break Start</p>
                <input
                  type="time"
                  value={workPolicy.break_start || ""}
                  onChange={(e) =>
                    setWorkPolicy({ ...workPolicy, break_start: e.target.value })
                  }
                  className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
                />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1">Break End</p>
                <input
                  type="time"
                  value={workPolicy.break_end || ""}
                  onChange={(e) =>
                    setWorkPolicy({ ...workPolicy, break_end: e.target.value })
                  }
                  className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
                />
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                  Kitne minute <FromPolicy name="break_minutes" />
                </p>
                <input
                  type="number"
                  min="0"
                  max="480"
                  disabled={!!(workPolicy.break_start && workPolicy.break_end)}
                  value={
                    workPolicy.break_start && workPolicy.break_end
                      ? breakSpan(workPolicy.break_start, workPolicy.break_end)
                      : (workPolicy.break_minutes ?? 60)
                  }
                  onChange={(e) =>
                    setWorkPolicy({
                      ...workPolicy,
                      break_minutes: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Waqt diya hai to muddat usi se nikalti hai — do jagah rakhi
                hui muddat kabhi na kabhi ek dusre se alag ho jati hai */}
            <div className="mb-4 text-sm">
              {workPolicy.break_start && workPolicy.break_end ? (
                <p className="text-[#05DC7F]">
                  Muqarrar break — {to12hLabel(workPolicy.break_start)} se{" "}
                  {to12hLabel(workPolicy.break_end)} (
                  {breakSpan(workPolicy.break_start, workPolicy.break_end)} min).
                  <span className="text-gray-500">
                    {" "}
                    Minutes khud waqt se nikalte hain.
                  </span>
                </p>
              ) : (
                <p className="text-gray-400">
                  Waqt muqarrar nahi — employee{" "}
                  <b className="text-white">
                    {workPolicy.break_minutes ?? 60} minute
                  </b>{" "}
                  jab chahe le sakta hai.
                  <span className="text-gray-500">
                    {" "}
                    Waqt tay karna ho to upar dono fields bharein.
                  </span>
                </p>
              )}
            </div>

            <p className="text-gray-400 text-sm mb-2 flex items-center gap-2">
              Break ka hisaab <FromPolicy name="break_policy" />
            </p>
            <div className="flex flex-wrap gap-3">
              {["excluded", "included"].map((bp) => (
                <button
                  key={bp}
                  onClick={() =>
                    setWorkPolicy({ ...workPolicy, break_policy: bp })
                  }
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition
                    ${
                      workPolicy.break_policy === bp
                        ? "bg-[#05DC7F] text-black"
                        : "bg-black/40 text-gray-400 border border-[#05DC7F]/20"
                    }`}
                >
                  {bp === "excluded" ? "Breaks Deducted" : "Breaks Counted"}
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-2">
              {workPolicy.break_policy === "included"
                ? "Break ka waqt kaam mein ginta hai — net hours kam nahi hote."
                : `Break ka waqt net hours se katta hai — ${workPolicy.min_daily_hours} ghante poore karne ke liye utni der zyada rukna hoga.`}
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleSaveWorkPolicy}
              disabled={savingPolicy}
              className="px-6 py-2.5 bg-[#05DC7F] text-black font-semibold rounded-xl hover:bg-[#04c56f] transition disabled:opacity-50"
            >
              {savingPolicy ? "Saving..." : "Save Work Policy"}
            </button>
          </div>
        </div>
      )}

      {/* ══════════ TAB 3: POLICY DOCUMENT ══════════ */}
      {activeTab === "policy-doc" && (
        <div className="p-6 bg-black/50 border border-[#05DC7F]/30 rounded-2xl">
          <h2 className="text-white text-xl font-bold mb-6">
            Company Policy Document
          </h2>

          {/* ──── Uploaded Policies ──── */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <p className="text-gray-400 text-sm">
                Uploaded Documents ({policyList.length})
              </p>
              <button
                onClick={loadPolicyList}
                className="text-xs text-[#05DC7F] hover:text-white transition"
              >
                Refresh
              </button>
            </div>

            {policyList.length === 0 ? (
              <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-sm">
                Koi policy document upload nahi hui — Leave Agent policy parh
                nahi sakta, isliye sari leave requests aap ke paas aayengi.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {policyList.map((p) => (
                  <div
                    key={p.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border ${
                      p.is_active
                        ? "bg-[#05DC7F]/10 border-[#05DC7F]/40"
                        : "bg-black/30 border-gray-700"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {p.is_active && (
                          <FaCheckCircle className="text-[#05DC7F] shrink-0" />
                        )}
                        <span className="text-white text-sm truncate">
                          {p.policy_label || p.file_name}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] rounded-full ${
                            p.is_active
                              ? "bg-[#05DC7F]/20 text-[#05DC7F]"
                              : "bg-gray-600/30 text-gray-400"
                          }`}
                        >
                          {p.is_active ? "ACTIVE" : p.status}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                          v{p.version}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        {p.file_name} · {p.chunks_indexed} chunks
                        {!p.file_exists && (
                          <span className="text-yellow-500">
                            {" "}
                            · file disk pe nahi mili
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {/* Purani policy wapas lagane ke liye — file disk par
                          mehfooz hai, dobara upload karne ki zarurat nahi */}
                      {!p.is_active && (
                        <button
                          onClick={() => handleActivatePolicy(p)}
                          disabled={
                            !p.file_exists ||
                            activatingPolicy === p.id ||
                            policyStatus === "processing"
                          }
                          title={
                            p.file_exists
                              ? "Isi document se leave types aur working hours dobara lagayein"
                              : "File disk par nahi mili — activate nahi ho sakti"
                          }
                          className="px-3 py-1.5 rounded-lg bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30 text-xs hover:bg-[#05DC7F]/25 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
                        >
                          <FaCheckCircle className="text-[10px]" />
                          {activatingPolicy === p.id
                            ? "Lag rahi hai..."
                            : "Activate"}
                        </button>
                      )}

                      <button
                        onClick={() => handleDeletePolicy(p)}
                        disabled={deletingPolicy === p.id}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs hover:bg-red-500/25 transition disabled:opacity-40 flex items-center gap-1.5"
                      >
                        <FaTrash className="text-[10px]" />
                        {deletingPolicy === p.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ──── Upload Form ──── */}
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-1">Policy Label</p>
            <input
              type="text"
              value={policyLabel}
              onChange={(e) => setPolicyLabel(e.target.value)}
              className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
            />
          </div>

          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-1">
              Policy File (PDF or DOCX)
            </p>
            {policyFile ? (
              <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#05DC7F]/30 text-white">
                <div className="flex items-center gap-2">
                  <FaFileAlt className="text-[#05DC7F]" />
                  <span className="truncate">{policyFile.name}</span>
                </div>
                <button
                  onClick={() => setPolicyFile(null)}
                  className="text-red-400 hover:text-red-300"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#05DC7F]/30 text-[#05DC7F] cursor-pointer hover:bg-[#05DC7F]/10 transition">
                <FaUpload />
                <span>Choose PDF or DOCX</span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={(e) => setPolicyFile(e.target.files[0])}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* ──── Processing Status ──── */}
          {policyStatus === "processing" && (
            <div className="mb-4 flex items-center gap-2 text-yellow-400">
              <FaSpinner className="animate-spin" />
              <span>Policy indexing ho rahi hai... Please wait</span>
            </div>
          )}

          <div className="flex justify-center">
            <button
              onClick={handleUploadPolicy}
              disabled={uploadingPolicy || policyStatus === "processing"}
              className="px-6 py-2.5 bg-[#05DC7F] text-black font-semibold rounded-xl hover:bg-[#04c56f] transition disabled:opacity-50"
            >
              {uploadingPolicy ? "Uploading..." : "Upload Policy"}
            </button>
          </div>
        </div>
      )}
      {/* ══════════ TAB 4: OFFICE LOCATION ══════════ */}
      {activeTab === "office-location" && (
        <div className="p-6 bg-black/50 border border-[#05DC7F]/30 rounded-2xl">
          <h2 className="text-white text-xl font-bold mb-2">Office Location</h2>
          <p className="text-gray-400 text-sm mb-6">
            Employee check-in ke waqt GPS se verify hoga — office radius mein
            hai ya nahi
          </p>

          {/* ──── Office Name ──── */}
          <div className="mb-4">
            <p className="text-gray-400 text-sm mb-1">Office Name</p>
            <input
              type="text"
              value={officeLocation.office_name}
              onChange={(e) =>
                setOfficeLocation({
                  ...officeLocation,
                  office_name: e.target.value,
                })
              }
              className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              placeholder="Head Office"
            />
          </div>

          {/* ──── GPS Coordinates ──── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Latitude</p>
              <input
                type="number"
                step="0.000001"
                value={officeLocation.latitude}
                onChange={(e) =>
                  setOfficeLocation({
                    ...officeLocation,
                    latitude: e.target.value,
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
                placeholder="33.684422"
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Longitude</p>
              <input
                type="number"
                step="0.000001"
                value={officeLocation.longitude}
                onChange={(e) =>
                  setOfficeLocation({
                    ...officeLocation,
                    longitude: e.target.value,
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
                placeholder="73.047882"
              />
            </div>
          </div>

          {/* ──── Get Current Location Button ──── */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={gettingLocation}
            className="w-full mb-4 py-2 rounded-lg border border-[#05DC7F]/40 text-[#05DC7F] hover:bg-[#05DC7F]/10 transition text-sm disabled:opacity-50"
          >
            {gettingLocation
              ? "Getting location..."
              : "📍 Use Current Location"}
          </button>

          {/* ──── Radius ──── */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-1">
              Allowed Radius — {officeLocation.radius_meters} meters
            </p>
            <input
              type="range"
              min="50"
              max="1000"
              step="50"
              value={officeLocation.radius_meters}
              onChange={(e) =>
                setOfficeLocation({
                  ...officeLocation,
                  radius_meters: parseInt(e.target.value),
                })
              }
              className="w-full accent-[#05DC7F]"
            />
            <div className="flex justify-between text-gray-500 text-xs mt-1">
              <span>50m</span>
              <span>500m</span>
              <span>1000m</span>
            </div>
          </div>

          {/* ──── Map Preview ──── */}
          {officeLocation.latitude && officeLocation.longitude && (
            <div className="mb-6">
              <a
                href={`https://maps.google.com/?q=${officeLocation.latitude},${officeLocation.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-blue-400 text-sm hover:text-blue-300 transition"
              >
                🗺️ Google Maps pe dekho
              </a>
            </div>
          )}

          {/* ──── Save Button ──── */}
          <div className="flex justify-center">
            <button
              onClick={handleSaveOfficeLocation}
              disabled={savingOffice}
              className="px-6 py-2.5 bg-[#05DC7F] text-black font-semibold rounded-xl hover:bg-[#04c56f] transition disabled:opacity-50"
            >
              {savingOffice ? "Saving..." : "Save Office Location"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
