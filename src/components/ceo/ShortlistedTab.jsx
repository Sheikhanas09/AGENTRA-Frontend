"use client";

import { useState, useEffect } from "react";
import {
  FaFileAlt,
  FaCalendarCheck,
  FaTimes,
  FaTrash,
  FaSync,
  FaCheckCircle,
} from "react-icons/fa";

export default function ShortlistedTab() {
  const [shortlisted, setShortlisted] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const [showCVModal, setShowCVModal] = useState(false);
  const [cvCandidate, setCVCandidate] = useState(null);

  // ──── Real Employees ────
  const [employees, setEmployees] = useState([]);

  // ──── Schedule Success ────
  const [scheduleSuccess, setScheduleSuccess] = useState(null);
  const [scheduling, setScheduling] = useState(false);

  const token = localStorage.getItem("token");

  // ──── Jobs fetch ────
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/recruitment/jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(data.jobs || []);
        if (data.jobs?.length > 0) setSelectedJobId(data.jobs[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    fetchJobs();
  }, []);

  // ──── Real Employees fetch ────
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/recruitment/employees", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setEmployees(data.employees || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployees();
  }, []);

  // ──── Shortlisted fetch ────
  const fetchShortlisted = async (jobId) => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/applications/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      const shortlistedOnly = (data.applications || []).filter(
        (a) => a.status === "shortlisted" || a.status === "interview_scheduled",
      );
      setShortlisted(shortlistedOnly);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedJobId) fetchShortlisted(selectedJobId);
  }, [selectedJobId]);

  const getScoreColor = (score) => {
    if (score >= 80) return "text-[#05DC7F]";
    if (score >= 60) return "text-yellow-400";
    return "text-orange-400";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "bg-[#05DC7F]/20 border-[#05DC7F]/40";
    if (score >= 60) return "bg-yellow-500/20 border-yellow-500/40";
    return "bg-orange-500/20 border-orange-500/40";
  };

  const totalPages = Math.ceil(shortlisted.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCandidates = shortlisted.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [heldBy, setHeldBy] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);

  const openScheduleModal = (candidate) => {
    setSelectedCandidate(candidate);
    setHeldBy([]);
    setDate("");
    setTime("");
    setOpenDropdown(false);
    setScheduleSuccess(null);
    setShowModal(true);
  };

  const toggleHeldBy = (emp) => {
    setHeldBy((prev) => {
      if (prev.find((e) => e.id === emp.id)) return prev;
      const updated = prev.length < 2 ? [...prev, emp] : prev;
      if (updated.length === 2) setOpenDropdown(false);
      return updated;
    });
  };

  const removeHeldBy = (emp) => {
    setHeldBy((prev) => prev.filter((e) => e.id !== emp.id));
  };

  // ──── Schedule Handler — Real API ────
  const handleSchedule = async () => {
    if (!date || !time || heldBy.length === 0) {
      alert("⚠️ Please complete all fields before scheduling.");
      return;
    }

    setScheduling(true);
    try {
      const form = new FormData();
      form.append("application_id", selectedCandidate.application_id);
      form.append("candidate_id", selectedCandidate.candidate_id);
      form.append("job_id", selectedJobId);
      form.append("scheduled_date", date);
      form.append("scheduled_time", time);
      form.append("interviewer_1_email", heldBy[0].email);
      if (heldBy[1]) form.append("interviewer_2_email", heldBy[1].email);

      const res = await fetch(
        "http://127.0.0.1:8000/recruitment/schedule-interview",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );

      const data = await res.json();

      if (res.ok) {
        setScheduleSuccess(data);
        fetchShortlisted(selectedJobId);
      } else {
        alert(`Error: ${data.detail || "Schedule nahi ho saka"}`);
      }
    } catch (err) {
      alert("Server se connection nahi ho saka");
    }
    setScheduling(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // ──── CV Text Formatter ────
  const renderCVText = (text) => {
    if (!text)
      return <p className="text-gray-500">CV text is not available.</p>;
    return text.split("\n").map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2" />;
      if (
        trimmed === trimmed.toUpperCase() &&
        trimmed.length > 2 &&
        !/^\d/.test(trimmed) &&
        !/^[•\-\*]/.test(trimmed)
      ) {
        return (
          <h3
            key={index}
            className="text-[#05DC7F] font-bold text-sm mt-5 mb-1 border-b border-[#05DC7F]/20 pb-1"
          >
            {trimmed}
          </h3>
        );
      }
      if (/^[•\-\*]\s/.test(trimmed)) {
        return (
          <div key={index} className="flex gap-2 ml-3 my-0.5">
            <span className="text-[#05DC7F] flex-shrink-0">•</span>
            <span className="text-gray-300 text-xs sm:text-sm">
              {trimmed.replace(/^[•\-\*]\s*/, "")}
            </span>
          </div>
        );
      }
      if (trimmed.includes("@") && trimmed.includes(".")) {
        return (
          <p key={index} className="text-blue-400 text-xs sm:text-sm my-0.5">
            {trimmed}
          </p>
        );
      }
      if (trimmed.endsWith(":") && trimmed.length < 40) {
        return (
          <p
            key={index}
            className="text-white font-semibold text-xs sm:text-sm mt-3 mb-0.5"
          >
            {trimmed}
          </p>
        );
      }
      return (
        <p
          key={index}
          className="text-gray-300 text-xs sm:text-sm my-0.5 leading-relaxed"
        >
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-white text-xl sm:text-2xl font-bold">
          Shortlisted Candidates
        </h3>
        <span className="px-3 py-1 rounded-lg bg-[#05DC7F]/20 text-[#05DC7F] text-xs font-medium self-start sm:self-auto">
          ⭐ {shortlisted.length} Shortlisted
        </span>
      </div>

      {/* ──── Job Selector ──── */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-gray-400 text-sm">Job:</label>
        <select
          value={selectedJobId}
          onChange={(e) => {
            setSelectedJobId(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-black/30 border border-[#05DC7F]/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
        >
          {jobs.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </select>
        <button
          onClick={() => fetchShortlisted(selectedJobId)}
          className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:text-[#05DC7F] hover:border-[#05DC7F] transition"
        >
          <FaSync size={12} />
        </button>
      </div>

      {loading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* ──── Table ──── */}
      {!loading && (
        <>
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-700 text-gray-400 font-semibold text-sm">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Candidate</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-3">AI Summary</div>
            <div className="col-span-1">Applied On</div>
            <div className="col-span-2 text-right">Actions</div>
          </div>

          <div className="flex flex-col divide-y divide-gray-800">
            {currentCandidates.map((c, i) => (
              <div
                key={c.application_id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-center px-3 sm:px-4 py-3 sm:py-4 hover:bg-black/20 rounded-lg transition"
              >
                <div className="col-span-1 text-gray-400 text-sm">
                  {startIndex + i + 1}
                </div>
                <div className="col-span-2">
                  <p className="text-white font-medium text-sm">
                    {c.full_name}
                  </p>
                  {c.status === "interview_scheduled" && (
                    <span className="text-xs text-[#05DC7F]">
                      ✓ Interview Scheduled
                    </span>
                  )}
                </div>
                <div className="col-span-2 text-gray-400 text-xs truncate">
                  {c.email}
                </div>
                <div className="col-span-1">
                  <span
                    className={`px-2 py-1 rounded-lg border text-xs font-bold ${getScoreBg(c.match_score)} ${getScoreColor(c.match_score)}`}
                  >
                    {Math.round(c.match_score)}%
                  </span>
                </div>
                <div className="col-span-3 text-gray-400 text-xs leading-relaxed">
                  {c.summary || "—"}
                </div>
                <div className="col-span-1 text-gray-400 text-xs">
                  {formatDate(c.applied_at)}
                </div>

                <div className="col-span-2 flex flex-wrap gap-2 justify-start md:justify-end">
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem("token");
                      const res = await fetch(
                        `http://127.0.0.1:8000/recruitment/download-cv/${c.application_id}`,
                        { headers: { Authorization: `Bearer ${token}` } },
                      );
                      const blob = await res.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${c.full_name}_CV.pdf`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg bg-black/40 text-white border border-gray-600 hover:border-[#05DC7F] hover:text-[#05DC7F] transition"
                  >
                    <FaFileAlt size={12} />
                    <span className="hidden sm:inline">View CV</span>
                  </button>
                  {c.status === "interview_scheduled" ? (
                    <span className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs text-[#05DC7F] font-medium border border-[#05DC7F]/30 rounded-lg">
                      <FaCalendarCheck size={12} />
                      <span className="hidden sm:inline">Scheduled ✓</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => openScheduleModal(c)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-[#05DC7F] text-black rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#04c56f] transition"
                    >
                      <FaCalendarCheck size={12} />
                      <span className="hidden sm:inline">Schedule</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {shortlisted.length === 0 && !loading && (
              <div className="text-center text-gray-400 py-10 text-sm">
                No shortlisted candidates found — please fetch from the “All
                Candidates” tab!
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap justify-end items-center gap-2 mt-2 sm:mt-4 text-gray-300 text-sm sm:text-base">
            <button
              onClick={() => goToPage(1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              «
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              ‹
            </button>
            <span className="px-2 sm:px-3 py-1">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              ›
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              »
            </button>
          </div>
        </>
      )}

      {/* ──── CV Modal ──── */}
      {showCVModal && cvCandidate && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#1F1F1F] w-full max-w-2xl rounded-xl border border-[#05DC7F]/20 shadow-[0_0_30px_rgba(5,220,127,0.15)] flex flex-col max-h-[90vh] sm:max-h-[85vh]">
            <div className="flex justify-between items-start px-5 sm:px-6 py-4 border-b border-gray-700">
              <div>
                <h4 className="text-white font-bold text-base sm:text-lg">
                  {cvCandidate.full_name}
                </h4>
                <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                  {cvCandidate.email} • {cvCandidate.cv_filename || "CV"}
                </p>
              </div>
              <button
                onClick={() => setShowCVModal(false)}
                className="text-gray-400 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition"
              >
                <FaTimes />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
              <div className="text-gray-300 leading-relaxed">
                {renderCVText(cvCandidate.cv_text)}
              </div>
            </div>
            <div className="flex justify-end px-5 sm:px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => setShowCVModal(false)}
                className="px-5 py-2 rounded-lg bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── Schedule Modal ──── */}
      {showModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#1F1F1F] w-full max-w-lg rounded-xl p-5 sm:p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <FaTimes />
            </button>

            <h4 className="text-white text-lg font-bold mb-4">
              Schedule Interview
            </h4>

            {/* ──── Success Message ──── */}
            {scheduleSuccess ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <FaCheckCircle size={48} className="text-[#05DC7F]" />
                <p className="text-white font-semibold text-lg">
                  Interview Scheduled!
                </p>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>
                    📅 Date:{" "}
                    <span className="text-white">
                      {scheduleSuccess.scheduled_date}
                    </span>
                  </p>
                  <p>
                    ⏰ Time:{" "}
                    <span className="text-white">
                      {scheduleSuccess.scheduled_time}
                    </span>
                  </p>
                  <p>
                    {scheduleSuccess.email_sent
                      ? "✅ Email successfully sent to candidate & interviewers!"
                      : "⚠️ The interview has been saved, but the email could not be sent."}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="mt-2 px-6 py-2.5 bg-[#05DC7F] text-black font-semibold rounded-xl hover:bg-[#04c56f] transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Candidate Email */}
                <div>
                  <label className="text-gray-400 text-sm">
                    Candidate Email
                  </label>
                  <input
                    value={selectedCandidate?.email}
                    disabled
                    className="w-full mt-1 p-2 rounded bg-black/40 text-white border border-gray-700"
                  />
                </div>

                {/* Date */}
                <div>
                  <label className="text-gray-400 text-sm">
                    Interview Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-black/40 text-white border border-gray-700 focus:outline-none focus:border-[#05DC7F]"
                  />
                </div>

                {/* Time */}
                <div>
                  <label className="text-gray-400 text-sm">
                    Interview Time
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full mt-1 p-2 rounded bg-black/40 text-white border border-gray-700 focus:outline-none focus:border-[#05DC7F]"
                  />
                </div>

                {/* ──── Real Employees Dropdown ──── */}
                <div className="relative">
                  <label className="text-gray-400 text-sm">
                    Held By (max 2)
                    {employees.length === 0 && (
                      <span className="text-red-400 text-xs ml-2">
                        — First, create employees.
                      </span>
                    )}
                  </label>
                  <div
                    onClick={() =>
                      employees.length > 0 && setOpenDropdown(!openDropdown)
                    }
                    className={`mt-1 p-2 bg-black/40 border border-gray-700 rounded text-sm ${employees.length > 0 ? "cursor-pointer text-white" : "cursor-not-allowed text-gray-600"}`}
                  >
                    {heldBy.length > 0
                      ? `${heldBy.length} interviewer(s) selected`
                      : "Select interviewers"}
                  </div>

                  {openDropdown && (
                    <div className="absolute w-full bg-[#121212] border border-gray-700 rounded mt-1 z-10 max-h-48 overflow-y-auto">
                      {employees.map((emp) => (
                        <div
                          key={emp.id}
                          onClick={() => toggleHeldBy(emp)}
                          className={`px-3 py-2 cursor-pointer text-sm transition ${
                            heldBy.find((e) => e.id === emp.id)
                              ? "bg-[#05DC7F]/20 text-[#05DC7F]"
                              : "text-white hover:bg-[#05DC7F]/10"
                          }`}
                        >
                          <p className="font-medium">{emp.full_name}</p>
                          <p className="text-xs text-gray-400">
                            {emp.email} • {emp.department || "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Interviewers */}
                {heldBy.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {heldBy.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center gap-2 bg-[#05DC7F]/20 text-white px-3 py-1 rounded-full text-sm"
                      >
                        {emp.full_name}
                        <FaTrash
                          onClick={() => removeHeldBy(emp)}
                          className="cursor-pointer text-red-400"
                          size={10}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Schedule Button */}
                <button
                  onClick={handleSchedule}
                  disabled={scheduling}
                  className="w-full bg-[#05DC7F] py-2.5 rounded-lg font-semibold text-black hover:bg-[#04c56f] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scheduling ? "Scheduling..." : "Schedule Interview"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
