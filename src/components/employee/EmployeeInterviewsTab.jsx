"use client";

import { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaUser,
  FaFileAlt,
  FaTimes,
  FaStar,
  FaCheckCircle,
  FaBell,
  FaExternalLinkAlt,
} from "react-icons/fa";

export default function EmployeeInterviewsTab() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [technicalScore, setTechnicalScore] = useState(5);
  const [communicationScore, setCommunicationScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/recruitment/my-interviews",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setInterviews(data.interviews || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ──── CV Download ────
  const handleDownloadCV = async (interview) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/download-cv/${interview.application_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${interview.candidate_name}_CV.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = interviews.filter((i) => {
    if (activeFilter === "all") return true;
    return i.status === activeFilter;
  });

  const getStatusBadge = (status) => {
    const map = {
      today: "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]/40",
      upcoming: "bg-blue-500/20 text-blue-400 border-blue-500/40",
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
      completed: "bg-gray-500/20 text-gray-400 border-gray-500/40",
    };
    return map[status] || "bg-gray-500/20 text-gray-400 border-gray-500/40";
  };

  const getStatusLabel = (status) => {
    const map = {
      today: "🟢 Today",
      upcoming: "🔵 Upcoming",
      pending: "🟡 Pending Feedback",
      completed: "✅ Completed",
    };
    return map[status] || status;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "—";
    try {
      const [h, m] = timeStr.split(":");
      const dt = new Date();
      dt.setHours(parseInt(h), parseInt(m));
      return dt.toLocaleTimeString("en-PK", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timeStr;
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedInterview) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("technical_score", technicalScore);
      form.append("communication_score", communicationScore);
      form.append("notes", notes);
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/interviews/${selectedInterview.interview_id}/feedback`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        },
      );
      if (res.ok) {
        setFeedbackSuccess(true);
        fetchInterviews();
      }
    } catch (err) {
      console.error(err);
    }
    setSubmitting(false);
  };

  const ScoreSlider = ({ label, value, onChange }) => (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="text-gray-400 text-sm">{label}</label>
        <span className="text-[#05DC7F] font-bold text-lg">{value}/10</span>
      </div>
      <input
        type="range"
        min="0"
        max="10"
        step="0.5"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#05DC7F]"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Poor</span>
        <span>Average</span>
        <span>Excellent</span>
      </div>
    </div>
  );

  const canJoin = (status) => ["today", "upcoming"].includes(status);
  const canFeedback = (status) =>
    ["pending", "today", "completed"].includes(status);

  return (
    <div className="flex flex-col gap-6">
      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-white text-xl sm:text-2xl font-bold flex items-center gap-2">
            <FaBell className="text-[#05DC7F]" /> My Interviews
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Aapko {interviews.filter((i) => i.status === "today").length}{" "}
            interview(s) aaj hain
          </p>
        </div>
        <button
          onClick={fetchInterviews}
          className="px-4 py-2 rounded-xl border border-[#05DC7F]/30 text-[#05DC7F] text-sm hover:bg-[#05DC7F]/10 transition"
        >
          Refresh
        </button>
      </div>

      {/* ──── Filter Tabs ──── */}
      <div className="flex gap-2 flex-wrap">
        {["all", "today", "upcoming", "pending", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
              activeFilter === f
                ? "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]"
                : "text-gray-400 border-gray-700 hover:border-[#05DC7F]/40"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* ──── Interviews List ──── */}
      {!loading && (
        <div className="flex flex-col gap-4">
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              Koi interview nahi mili!
            </div>
          )}

          {filtered.map((interview) => (
            <div
              key={interview.interview_id}
              className={`p-5 rounded-xl border transition ${
                interview.status === "today"
                  ? "border-[#05DC7F]/50 bg-[#05DC7F]/5 shadow-[0_0_15px_rgba(5,220,127,0.1)]"
                  : "border-gray-700 bg-black/20"
              }`}
            >
              {/* Top Row */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(interview.status)}`}
                    >
                      {getStatusLabel(interview.status)}
                    </span>
                    {interview.feedback_submitted && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/40">
                        ✓ Feedback Submitted
                      </span>
                    )}
                  </div>
                  <h4 className="text-white font-bold text-base">
                    {interview.job_title}
                  </h4>
                  <p className="text-gray-400 text-sm">
                    {interview.company_name}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-300 text-sm flex items-center gap-1 justify-end">
                    <FaCalendarAlt className="text-[#05DC7F]" size={12} />
                    {formatDate(interview.scheduled_date)}
                  </p>
                  <p className="text-gray-300 text-sm flex items-center gap-1 justify-end mt-1">
                    <FaClock className="text-[#05DC7F]" size={12} />
                    {formatTime(interview.scheduled_time)}
                  </p>
                </div>
              </div>

              {/* Candidate Info */}
              <div className="p-3 rounded-lg bg-black/30 border border-gray-700 mb-4">
                <p className="text-gray-400 text-xs mb-2 font-semibold uppercase tracking-wide">
                  Candidate
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#05DC7F]/20 border border-[#05DC7F]/40 flex items-center justify-center">
                    <FaUser className="text-[#05DC7F]" size={14} />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {interview.candidate_name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      {interview.candidate_email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Interviewers */}
              <div className="text-xs text-gray-400 mb-4">
                <span className="text-gray-500">Interviewers: </span>
                <span className="text-gray-300">{interview.interviewer_1}</span>
                {interview.interviewer_2 && (
                  <span className="text-gray-300">
                    , {interview.interviewer_2}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                {/* Join Meeting */}
                {interview.meeting_link && canJoin(interview.status) && (
                  <a
                    href={interview.meeting_link}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[#05DC7F] text-black rounded-lg text-sm font-semibold hover:bg-[#04c56f] transition"
                  >
                    <FaVideo size={12} />
                    <span>Join Meeting</span>
                    <FaExternalLinkAlt size={10} />
                  </a>
                )}

                {/* View CV — Download */}
                <button
                  onClick={() => handleDownloadCV(interview)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-gray-600 text-gray-300 hover:border-[#05DC7F] hover:text-[#05DC7F] transition"
                >
                  <FaFileAlt size={12} />
                  <span>View CV</span>
                </button>

                {/* Submit Feedback */}
                {!interview.feedback_submitted &&
                  canFeedback(interview.status) && (
                    <button
                      onClick={() => {
                        setSelectedInterview(interview);
                        setTechnicalScore(5);
                        setCommunicationScore(5);
                        setNotes("");
                        setFeedbackSuccess(false);
                        setShowFeedbackModal(true);
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 transition"
                    >
                      <FaStar size={12} />
                      <span>Submit Feedback</span>
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ──── Feedback Modal ──── */}
      {showFeedbackModal && selectedInterview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-[#1F1F1F] w-full max-w-lg rounded-xl border border-[#05DC7F]/20 p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            {feedbackSuccess ? (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <FaCheckCircle size={48} className="text-[#05DC7F]" />
                <p className="text-white font-bold text-lg">
                  Feedback Submitted!
                </p>
                <p className="text-gray-400 text-sm">
                  Agent 3 ne evaluation complete kar diya!
                </p>
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="px-6 py-2.5 bg-[#05DC7F] text-black font-semibold rounded-xl hover:bg-[#04c56f] transition"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center mb-5">
                  <h4 className="text-white font-bold text-base">
                    Submit Interview Feedback
                  </h4>
                  <button
                    onClick={() => setShowFeedbackModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>

                <div className="p-3 rounded-lg bg-black/30 border border-gray-700 mb-5">
                  <p className="text-white font-medium text-sm">
                    {selectedInterview.candidate_name}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {selectedInterview.job_title}
                  </p>
                </div>

                <div className="flex flex-col gap-5">
                  <ScoreSlider
                    label="Technical Score"
                    value={technicalScore}
                    onChange={setTechnicalScore}
                  />
                  <ScoreSlider
                    label="Communication Score"
                    value={communicationScore}
                    onChange={setCommunicationScore}
                  />

                  <div>
                    <label className="text-gray-400 text-sm">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder="Candidate ke baare mein kuch notes..."
                      className="w-full mt-1 p-3 rounded-lg bg-black/40 text-white border border-gray-700 focus:outline-none focus:border-[#05DC7F] text-sm resize-none"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-[#05DC7F]/10 border border-[#05DC7F]/20">
                    <p className="text-gray-400 text-xs mb-1">
                      Estimated Final Score:
                    </p>
                    <p className="text-[#05DC7F] font-bold text-xl">
                      {(
                        technicalScore * 10 * 0.4 +
                        communicationScore * 10 * 0.2
                      ).toFixed(1)}
                      %
                      <span className="text-gray-400 text-xs font-normal ml-2">
                        (+ Resume Score)
                      </span>
                    </p>
                  </div>

                  <button
                    onClick={handleFeedbackSubmit}
                    disabled={submitting}
                    className="w-full py-2.5 bg-[#05DC7F] text-black font-semibold rounded-lg hover:bg-[#04c56f] transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
