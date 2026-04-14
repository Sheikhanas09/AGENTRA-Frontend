"use client";

import { useState, useEffect } from "react";
import {
  FaTimes,
  FaTrophy,
  FaMedal,
  FaCheckCircle,
  FaUserCheck,
  FaCalendarAlt,
  FaClock,
  FaUsers,
  FaInfoCircle,
  FaVideo,
  FaEnvelope,
  FaTimesCircle,
} from "react-icons/fa";

export default function Hiring() {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [showPopup, setShowPopup] = useState(true);
  const [rankedList, setRankedList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hiringResult, setHiringResult] = useState(null);
  const [hiringLoading, setHiringLoading] = useState(null);

  // ──── Reject states ────
  const [rejectLoading, setRejectLoading] = useState(null);
  const [rejectResult, setRejectResult] = useState(null);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [filterDate, setFilterDate] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/recruitment/jobs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchJobs();
  }, []);

  const fetchRanked = async (jobId) => {
    setLoading(true);
    setRankedList([]);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/ranked-candidates/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setRankedList(data.ranked_list || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSelectJob = (jobId) => {
    setSelectedJobId(Number(jobId));
    setShowPopup(false);
    setHiringResult(null);
    setRejectResult(null);
    setFilterDate("");
    setCurrentPage(1);
    fetchRanked(Number(jobId));
  };

  const handleHire = async (candidate) => {
    setHiringLoading(candidate.application_id);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/hire/${candidate.application_id}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (res.ok) {
        setHiringResult({
          candidate_name: candidate.full_name,
          email_sent: data.email_sent,
        });
        fetchRanked(selectedJobId);
      }
    } catch (err) {
      console.error(err);
    }
    setHiringLoading(null);
  };

  // ──── Reject Handler ────
  const handleReject = async (candidate) => {
    if (
      !window.confirm(
        `Kya aap ${candidate.full_name} ko reject karna chahte hain?`,
      )
    )
      return;
    setRejectLoading(candidate.application_id);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/reject/${candidate.application_id}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (res.ok) {
        setRejectResult({
          candidate_name: candidate.full_name,
          email_sent: data.email_sent,
        });
        fetchRanked(selectedJobId);
      }
    } catch (err) {
      console.error(err);
    }
    setRejectLoading(null);
  };

  const getCategoryColor = (category) => {
    const map = {
      "Strong Hire": "text-[#05DC7F] bg-[#05DC7F]/20 border-[#05DC7F]/40",
      Hire: "text-blue-400 bg-blue-500/20 border-blue-500/40",
      Consider: "text-yellow-400 bg-yellow-500/20 border-yellow-500/40",
      Reject: "text-red-400 bg-red-500/20 border-red-500/40",
    };
    return map[category] || "text-gray-400 bg-gray-500/20 border-gray-500/40";
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <FaTrophy className="text-yellow-400" size={18} />;
    if (rank === 2) return <FaMedal className="text-gray-300" size={18} />;
    if (rank === 3) return <FaMedal className="text-orange-400" size={18} />;
    return <span className="text-gray-400 font-bold text-sm">#{rank}</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "—") return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-PK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr || timeStr === "—") return "—";
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

  const filteredList = filterDate
    ? rankedList.filter((c) => c.interview_date === filterDate)
    : rankedList;

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCandidates = filteredList.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const uniqueDates = [
    ...new Set(
      rankedList.map((c) => c.interview_date).filter((d) => d && d !== "—"),
    ),
  ];

  const selectedJob = jobs.find((j) => j.id === selectedJobId);

  return (
    <div className="flex flex-col gap-6">
      {/* ──── Job Select Popup ──── */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="w-full max-w-md bg-black/90 border border-[#05DC7F]/40 rounded-2xl p-6 shadow-[0_0_25px_rgba(5,220,127,0.4)] relative">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <FaTimes />
            </button>
            <h2 className="text-white text-lg font-bold mb-4 text-center">
              Select Job Post
            </h2>
            <select
              onChange={(e) => handleSelectJob(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-black border border-[#05DC7F]/30 text-white focus:outline-none focus:border-[#05DC7F]"
              defaultValue=""
            >
              <option value="" disabled>
                Choose a job...
              </option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-white text-xl sm:text-2xl font-bold">
          Hiring — Ranked Candidates
        </h3>
        {selectedJob && (
          <div className="flex items-center gap-3 bg-black/40 border border-[#05DC7F]/30 rounded-xl px-4 py-2">
            <span className="text-gray-400 text-sm">Hiring For:</span>
            <select
              value={selectedJobId}
              onChange={(e) => handleSelectJob(e.target.value)}
              className="bg-transparent text-[#05DC7F] font-semibold outline-none cursor-pointer"
            >
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ──── Date Filter ──── */}
      {rankedList.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-gray-400 text-sm">Filter by Post Date:</label>
          <select
            value={filterDate}
            onChange={(e) => {
              setFilterDate(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-black/30 border border-[#05DC7F]/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
          >
            <option value="">All Dates</option>
            {uniqueDates.map((date) => (
              <option key={date} value={date}>
                {formatDate(date)}
              </option>
            ))}
          </select>
          {filterDate && (
            <button
              onClick={() => {
                setFilterDate("");
                setCurrentPage(1);
              }}
              className="text-xs text-gray-400 hover:text-white transition"
            >
              Clear Filter
            </button>
          )}
          <span className="text-gray-500 text-sm">
            Showing {filteredList.length} of {rankedList.length}
          </span>
        </div>
      )}

      {/* ──── Hiring Success ──── */}
      {hiringResult && (
        <div className="p-4 rounded-xl bg-[#05DC7F]/10 border border-[#05DC7F]/30 flex items-center gap-3">
          <FaCheckCircle className="text-[#05DC7F]" size={20} />
          <div>
            <p className="text-[#05DC7F] font-semibold">
              {hiringResult.candidate_name} hired successfully!
            </p>
            <p className="text-gray-400 text-sm">
              {hiringResult.email_sent
                ? "✅ Offer letter email sent!"
                : "⚠️ Hired, but the email could not be sent."}
            </p>
          </div>
        </div>
      )}

      {/* ──── Reject Result ──── */}
      {rejectResult && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <FaTimesCircle className="text-red-400" size={20} />
          <div>
            <p className="text-red-400 font-semibold">
              {rejectResult.candidate_name} rejected!
            </p>
            <p className="text-gray-400 text-sm">
              {rejectResult.email_sent
                ? "✅ Rejection email sent!"
                : "⚠️ Rejected, but the email could not be sent."}
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-[#05DC7F] py-10">
          Agent 4 is performing ranking...
        </div>
      )}

      {!loading && selectedJobId && rankedList.length === 0 && (
        <div className="text-center text-gray-400 py-10">
          No evaluated candidates found — please complete interviews first and
          submit feedback!
        </div>
      )}

      {/* ──── Ranked List ──── */}
      {!loading && filteredList.length > 0 && (
        <div className="flex flex-col gap-4">
          {currentCandidates.map((candidate) => (
            <div
              key={candidate.candidate_id}
              className={`p-5 rounded-xl border transition ${
                candidate.rank === 1
                  ? "border-yellow-400/50 bg-yellow-400/5 shadow-[0_0_15px_rgba(250,204,21,0.1)]"
                  : "border-gray-700 bg-black/20"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                {/* ──── Left ──── */}
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-black/40 border border-gray-700 flex items-center justify-center flex-shrink-0">
                    {getRankIcon(candidate.rank)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-bold text-base">
                        {candidate.full_name}
                      </h4>
                      {candidate.hired && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-[#05DC7F]/20 text-[#05DC7F] border border-[#05DC7F]/40">
                          ✓ Hired
                        </span>
                      )}
                      {candidate.rejected && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 border border-red-500/40">
                          ✗ Rejected
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{candidate.email}</p>

                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <FaCalendarAlt className="text-[#05DC7F]" size={10} />
                        {formatDate(candidate.interview_date)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <FaClock className="text-[#05DC7F]" size={10} />
                        {formatTime(candidate.interview_time)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-2">
                      <div className="text-xs text-gray-400">
                        Resume:{" "}
                        <span className="text-white font-medium">
                          {candidate.resume_score?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Technical:{" "}
                        <span className="text-white font-medium">
                          {candidate.technical_score?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        Communication:{" "}
                        <span className="text-white font-medium">
                          {candidate.communication_score?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ──── Right ──── */}
                <div className="flex flex-col items-end gap-3">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs">Final Score</p>
                    <p className="text-white font-bold text-2xl">
                      {candidate.final_score?.toFixed(1)}%
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(candidate.ranking_category)}`}
                  >
                    {candidate.ranking_category}
                  </span>

                  <div className="flex flex-wrap gap-2">
                    {/* Details Button */}
                    <button
                      onClick={() => {
                        setSelectedCandidate(candidate);
                        setShowDetails(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs border border-gray-600 text-gray-300 hover:border-[#05DC7F] hover:text-[#05DC7F] transition"
                    >
                      <FaInfoCircle size={11} /> Details
                    </button>

                    {/* Hire Button — Strong Hire, Hire, Consider */}
                    {!candidate.hired &&
                      !candidate.rejected &&
                      candidate.ranking_category !== "Reject" && (
                        <button
                          onClick={() => handleHire(candidate)}
                          disabled={hiringLoading === candidate.application_id}
                          className="flex items-center gap-2 px-4 py-2 bg-[#05DC7F] text-black rounded-lg text-sm font-semibold hover:bg-[#04c56f] transition disabled:opacity-50"
                        >
                          <FaUserCheck size={12} />
                          {hiringLoading === candidate.application_id
                            ? "Hiring..."
                            : "Approve & Hire"}
                        </button>
                      )}

                    {/* Reject Button — sab pe dikhega except hired/rejected */}
                    {!candidate.hired && !candidate.rejected && (
                      <button
                        onClick={() => handleReject(candidate)}
                        disabled={rejectLoading === candidate.application_id}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                      >
                        <FaTimesCircle size={12} />
                        {rejectLoading === candidate.application_id
                          ? "Rejecting..."
                          : "Reject"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* ──── Pagination ──── */}
          <div className="flex flex-wrap justify-end items-center gap-2 mt-2 sm:mt-4 text-gray-300 text-sm">
            <button
              onClick={() => setCurrentPage(1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              «
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              ‹
            </button>
            <span className="px-2 sm:px-3 py-1">
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              ›
            </button>
            <button
              onClick={() => setCurrentPage(totalPages || 1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              »
            </button>
          </div>
        </div>
      )}

      {/* ──── No Job Selected ──── */}
      {!selectedJobId && !showPopup && (
        <div className="text-center text-gray-400 py-10">
          <button
            onClick={() => setShowPopup(true)}
            className="px-4 py-2 rounded-xl border border-[#05DC7F]/30 text-[#05DC7F] hover:bg-[#05DC7F]/10 transition"
          >
            Please select a job.
          </button>
        </div>
      )}

      {/* ──── Details Modal ──── */}
      {showDetails && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-10 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#1F1F1F] rounded-xl border border-[#05DC7F]/20 shadow-[0_0_30px_rgba(5,220,127,0.15)] mb-10">
            <div className="flex justify-between items-start px-5 py-4 border-b border-gray-700">
              <div>
                <h4 className="text-white font-bold text-base">
                  {selectedCandidate.full_name}
                </h4>
                <p className="text-gray-400 text-xs mt-0.5">
                  {selectedCandidate.email}
                </p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-black/30 border border-gray-700">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
                  Interview Details
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FaCalendarAlt className="text-[#05DC7F]" size={12} />
                    <span className="text-gray-400">Date:</span>
                    <span className="text-white font-medium">
                      {formatDate(selectedCandidate.interview_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FaClock className="text-[#05DC7F]" size={12} />
                    <span className="text-gray-400">Time:</span>
                    <span className="text-white font-medium">
                      {formatTime(selectedCandidate.interview_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FaVideo className="text-[#05DC7F]" size={12} />
                    <span className="text-gray-400">Mode:</span>
                    <span className="text-white font-medium">Video Call</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FaUsers className="text-[#05DC7F]" size={12} />
                    <span className="text-gray-400">Interviewers:</span>
                    <span className="text-white font-medium">
                      {selectedCandidate.interviewer_1}
                      {selectedCandidate.interviewer_2
                        ? `, ${selectedCandidate.interviewer_2}`
                        : ""}
                    </span>
                  </div>
                  {selectedCandidate.meeting_link && (
                    <div className="flex items-center gap-2 text-sm">
                      <FaEnvelope className="text-[#05DC7F]" size={12} />
                      <span className="text-gray-400">Meeting:</span>
                      <a
                        href={selectedCandidate.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#05DC7F] hover:underline text-xs"
                      >
                        Join Link
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-black/30 border border-gray-700">
                <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
                  Evaluation Scores
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    {
                      label: "Resume Score",
                      value: selectedCandidate.resume_score,
                    },
                    {
                      label: "Technical Score",
                      value: selectedCandidate.technical_score,
                    },
                    {
                      label: "Communication Score",
                      value: selectedCandidate.communication_score,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-400 text-sm">
                        {item.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#05DC7F] rounded-full"
                            style={{ width: `${item.value?.toFixed(0)}%` }}
                          />
                        </div>
                        <span className="text-white font-medium text-sm w-12 text-right">
                          {item.value?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-700 pt-2 mt-1 flex justify-between items-center">
                    <span className="text-white font-semibold text-sm">
                      Final Score
                    </span>
                    <span className="text-[#05DC7F] font-bold text-lg">
                      {selectedCandidate.final_score?.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold border ${getCategoryColor(selectedCandidate.ranking_category)}`}
                >
                  {selectedCandidate.ranking_category}
                </span>
                <span className="text-gray-500 text-xs">
                  Evaluated: {formatDate(selectedCandidate.evaluated_at)}
                </span>
              </div>
            </div>

            <div className="flex justify-end px-5 py-4 border-t border-gray-700">
              <button
                onClick={() => setShowDetails(false)}
                className="px-5 py-2 rounded-lg bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] transition text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
