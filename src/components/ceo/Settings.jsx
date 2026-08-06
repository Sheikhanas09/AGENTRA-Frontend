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
} from "react-icons/fa";

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
    min_daily_hours: 8,
    overtime_threshold: 9,
    max_overtime_per_day: 3,
    break_policy: "excluded",
  });

  // ──── Policy Document ────
  const [policyFile, setPolicyFile] = useState(null);
  const [policyLabel, setPolicyLabel] = useState("Company Policy v1");
  const [activePolicy, setActivePolicy] = useState(null);
  const [uploadingPolicy, setUploadingPolicy] = useState(false);
  const [policyStatus, setPolicyStatus] = useState(null);

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

      // ──── Work Policy fetch ────
      try {
        const res = await fetch("http://127.0.0.1:8000/settings/work-policy", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.policy) setWorkPolicy(data.policy);
      } catch (e) {
        console.error(e);
      }

      // ──── Active Policy fetch ────
      try {
        const res = await fetch(
          "http://127.0.0.1:8000/settings/policy/active",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await res.json();
        if (data.policy) setActivePolicy(data.policy);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

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

      // ──── Poll status ────
      const poll = setInterval(async () => {
        try {
          const r = await fetch(
            `http://127.0.0.1:8000/settings/policy/status/${data.policy_id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          const s = await r.json();
          setPolicyStatus(s.status);

          if (s.status === "active") {
            clearInterval(poll);
            setSuccess(`Policy indexed! ${s.chunks_indexed} chunks ready.`);
            setPolicyFile(null);
            // ──── Active policy refresh ────
            const ar = await fetch(
              "http://127.0.0.1:8000/settings/policy/active",
              {
                headers: { Authorization: `Bearer ${token}` },
              },
            );
            const ad = await ar.json();
            if (ad.policy) setActivePolicy(ad.policy);
          }
          if (s.status === "failed") {
            clearInterval(poll);
            setError("Policy indexing failed!");
          }
        } catch (e) {
          clearInterval(poll);
        }
      }, 3000);
    } catch (e) {
      setError("Upload error");
    }
    setUploadingPolicy(false);
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
          <h2 className="text-white text-xl font-bold mb-6">
            Working Hours Policy
          </h2>

          {/* ──── Working Days ──── */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-3">Working Days</p>
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
              <p className="text-gray-400 text-sm mb-1">Shift Start</p>
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
              <p className="text-gray-400 text-sm mb-1">Shift End</p>
              <input
                type="time"
                value={workPolicy.shift_end}
                onChange={(e) =>
                  setWorkPolicy({ ...workPolicy, shift_end: e.target.value })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none"
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">
                Late Tolerance (minutes)
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
                  <span className="text-white text-sm font-medium">
                    Check-in sirf shift ke darmiyan
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
                  <p className="text-gray-400 text-sm mb-1">
                    Shift se kitna pehle check-in allow (minutes)
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

            <div>
              <p className="text-gray-400 text-sm mb-1">Min Daily Hours</p>
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
              <p className="text-gray-400 text-sm mb-1">
                Overtime Threshold (hours)
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
              <p className="text-gray-400 text-sm mb-1">
                Max Overtime Per Day (hours)
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

          {/* ──── Break Policy ──── */}
          <div className="mb-6">
            <p className="text-gray-400 text-sm mb-2">Break Policy</p>
            <div className="flex gap-3">
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

          {/* ──── Active Policy ──── */}
          {activePolicy && (
            <div className="mb-6 p-4 rounded-xl bg-[#05DC7F]/10 border border-[#05DC7F]/30">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="text-[#05DC7F]" />
                <span className="text-[#05DC7F] font-semibold">
                  Active Policy
                </span>
              </div>
              <p className="text-white">{activePolicy.policy_label}</p>
              <p className="text-gray-400 text-sm">{activePolicy.file_name}</p>
              <p className="text-gray-400 text-sm">
                {activePolicy.chunks_indexed} chunks indexed
              </p>
            </div>
          )}

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
