"use client";
import { useState, useEffect } from "react";
import { FaUserCheck, FaSync, FaEnvelope, FaFileAlt } from "react-icons/fa";

export default function AllCandidatesTab({ onShortlist }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

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

  // ──── Candidates fetch ────
  const fetchCandidates = async (jobId) => {
    if (!jobId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/applications/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      setCandidates(data.applications || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedJobId) fetchCandidates(selectedJobId);
  }, [selectedJobId]);

  // ──── Gmail Fetch + Auto Screen ────
  const handleFetchFromGmail = async () => {
    if (!selectedJobId) return;
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/fetch-and-screen/${selectedJobId}`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await res.json();
      if (res.ok) {
        setFetchResult(data);
        fetchCandidates(selectedJobId);
      }
    } catch (err) {
      console.error(err);
    }
    setFetching(false);
  };

  // ──── Manual Shortlist ────
  const handleShortlist = async (candidate) => {
    try {
      await fetch(
        `http://127.0.0.1:8000/recruitment/shortlist/${candidate.application_id}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } },
      );
      fetchCandidates(selectedJobId);
    } catch (err) {
      console.error(err);
    }
    if (onShortlist) onShortlist(candidate);
  };

  // ──── CV Download ────
  const handleDownloadCV = async (candidate) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/download-cv/${candidate.application_id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${candidate.full_name}_CV.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // ──── Score colors ────
  const getScoreColor = (score) => {
    if (score === null || score === undefined) return "text-gray-400";
    if (score >= 80) return "text-[#05DC7F]";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getScoreBg = (score) => {
    if (score === null || score === undefined)
      return "bg-gray-500/20 border-gray-500/40";
    if (score >= 80) return "bg-[#05DC7F]/20 border-[#05DC7F]/40";
    if (score >= 60) return "bg-yellow-500/20 border-yellow-500/40";
    if (score >= 40) return "bg-orange-500/20 border-orange-500/40";
    return "bg-red-500/20 border-red-500/40";
  };

  const getStatusBadge = (status) => {
    const map = {
      applied: "bg-blue-500/20 text-blue-400",
      screened: "bg-purple-500/20 text-purple-300",
      shortlisted: "bg-[#05DC7F]/20 text-[#05DC7F]",
    };
    return map[status] || "bg-gray-500/20 text-gray-400";
  };

  const totalPages = Math.ceil(candidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCandidates = candidates.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-PK", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-white text-xl sm:text-2xl font-bold">
          All Candidates
        </h3>
        <button
          onClick={handleFetchFromGmail}
          disabled={fetching || !selectedJobId}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:bg-[#04c56f] hover:shadow-[0_0_12px_rgba(5,220,127,0.4)] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FaEnvelope size={14} />
          {fetching ? (
            <span className="flex items-center gap-1">
              AI Screening...
              <span className="flex gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="block w-[4px] h-[4px] rounded-full bg-black"
                    style={{
                      animation: "pulse 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </span>
            </span>
          ) : (
            "Fetch CVs from Gmail & Screen"
          )}
        </button>
      </div>

      {/* ──── Fetch Result ──── */}
      {fetchResult && (
        <div className="p-4 rounded-xl bg-[#05DC7F]/10 border border-[#05DC7F]/30">
          <p className="text-[#05DC7F] text-sm font-medium">
            ✅ {fetchResult.message}
          </p>
          <div className="flex gap-4 mt-2 text-xs text-gray-400">
            <span>
              📧 Fetched:{" "}
              <strong className="text-white">
                {fetchResult.total_fetched}
              </strong>
            </span>
            <span>
              🤖 Screened:{" "}
              <strong className="text-white">{fetchResult.screened}</strong>
            </span>
            <span>
              ⭐ Shortlisted:{" "}
              <strong className="text-[#05DC7F]">
                {fetchResult.shortlisted}
              </strong>
            </span>
          </div>
        </div>
      )}

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
          onClick={() => fetchCandidates(selectedJobId)}
          className="p-2 rounded-lg border border-gray-600 text-gray-400 hover:text-[#05DC7F] hover:border-[#05DC7F] transition"
        >
          <FaSync size={12} />
        </button>
        <span className="text-gray-500 text-sm">
          Total: {candidates.length}
        </span>
      </div>

      {loading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* ──── Table ──── */}
      {!loading && (
        <>
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-gray-700 text-gray-400 font-semibold text-xs">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2">Skill Gap</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          <div className="flex flex-col divide-y divide-gray-800">
            {currentCandidates.map((candidate, index) => (
              <div
                key={candidate.application_id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-black/20 rounded-lg transition"
              >
                <div className="col-span-1 text-gray-400 text-xs">
                  {startIndex + index + 1}
                </div>

                <div className="col-span-2">
                  <p className="text-white font-medium text-sm">
                    {candidate.full_name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {candidate.phone || "—"}
                  </p>
                </div>

                <div className="col-span-2 text-gray-400 text-xs truncate">
                  {candidate.email}
                </div>

                <div className="col-span-1">
                  {candidate.match_score !== null &&
                  candidate.match_score !== undefined ? (
                    <span
                      className={`px-2 py-1 rounded-lg border text-xs font-bold ${getScoreBg(candidate.match_score)} ${getScoreColor(candidate.match_score)}`}
                    >
                      {Math.round(candidate.match_score)}%
                    </span>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </div>

                <div className="col-span-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(candidate.status)}`}
                  >
                    {candidate.status}
                  </span>
                </div>

                <div className="col-span-2 text-gray-500 text-xs">
                  {candidate.skill_gap || "—"}
                </div>

                {/* ──── Actions ──── */}
                <div className="col-span-3 flex flex-wrap gap-2 justify-start md:justify-end">
                  {/* View CV — Download */}
                  <button
                    onClick={() => handleDownloadCV(candidate)}
                    className="flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs rounded-lg bg-black/40 text-white border border-gray-600 hover:border-[#05DC7F] hover:text-[#05DC7F] transition"
                  >
                    <FaFileAlt size={10} />
                    <span className="hidden sm:inline">View CV</span>
                  </button>

                  {["applied", "screened"].includes(candidate.status) && (
                    <button
                      onClick={() => handleShortlist(candidate)}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold rounded-lg transition text-xs"
                    >
                      <FaUserCheck size={10} />
                      <span className="hidden sm:inline">Shortlist</span>
                    </button>
                  )}

                  {candidate.status === "shortlisted" && (
                    <span className="px-2 py-1.5 text-xs text-[#05DC7F] font-medium">
                      ⭐ Shortlisted
                    </span>
                  )}

                  {candidate.status === "interview_scheduled" && (
                    <span className="px-2 py-1.5 text-xs text-blue-400 font-medium">
                      📅 Interview Scheduled
                    </span>
                  )}

                  {["hired", "accepted"].includes(candidate.status) && (
                    <span className="px-2 py-1.5 text-xs text-[#05DC7F] font-medium">
                      ✓ Hired
                    </span>
                  )}

                  {candidate.status === "rejected" && (
                    <span className="px-2 py-1.5 text-xs text-red-400 font-medium">
                      ✗ Rejected
                    </span>
                  )}

                  {candidate.status === "fired" && (
                    <span className="px-2 py-1.5 text-xs text-orange-400 font-medium">
                      🔥 Fired
                    </span>
                  )}
                </div>
              </div>
            ))}

            {candidates.length === 0 && !loading && (
              <div className="text-center text-gray-400 py-10 text-sm">
                No candidates found — click the "Fetch CVs from Gmail" button!
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-wrap justify-end items-center gap-2 mt-2 sm:mt-4 text-gray-300 text-sm">
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
            <span className="px-3">
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.5); }
          50% { opacity: 1; transform: scaleY(1.6); }
        }
      `}</style>
    </div>
  );
}
