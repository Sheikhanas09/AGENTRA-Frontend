"use client";
import { useState, useEffect } from "react";
import {
  FaHourglassHalf,
  FaCheckCircle,
  FaCalendarCheck,
  FaTimesCircle,
  FaEye,
  FaTimes,
  FaThumbsUp,
  FaThumbsDown,
  FaRobot,
  FaSpinner,
} from "react-icons/fa";

function LeaveStatCard({ title, value, valueColor, icon }) {
  return (
    <div className="flex justify-between items-center p-5 rounded-xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_8px_rgba(5,220,127,0.25)] hover:border-[#05DC7F]/45 transition-all duration-300">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <h3 className={`text-3xl font-bold ${valueColor}`}>{value}</h3>
      </div>
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#05DC7F]/15 border border-[#05DC7F]/40">
        {icon}
      </div>
    </div>
  );
}

const statusStyles = {
  pending: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/40",
  approved: "bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/40",
  rejected: "bg-red-500/15 text-red-400 border border-red-500/40",
  evaluating: "bg-blue-500/15 text-blue-400 border border-blue-500/40",
};

export default function LeaveManagment() {
  const token = localStorage.getItem("token");

  const [allLeaves, setAllLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [ceoNote, setCeoNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  // ──── Stats ────
  const [stats, setStats] = useState({
    pending: 0,
    autoApproved: 0,
    approved: 0,
    rejected: 0,
  });

  // ──── Pagination ────
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ──── Fetch Data ────
  const fetchData = async () => {
    setLoading(true);
    try {
      // ──── All leaves ────
      const allRes = await fetch("http://127.0.0.1:8000/leave/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const allData = await allRes.json();
      setAllLeaves(allData.requests || []);

      // ──── Pending leaves ────
      const pendRes = await fetch("http://127.0.0.1:8000/leave/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const pendData = await pendRes.json();
      setPendingLeaves(pendData.pending_requests || []);

      // ──── Stats ────
      const all = allData.requests || [];
      setStats({
        pending: all.filter((r) => r.status === "pending").length,
        autoApproved: all.filter((r) => r.auto_approved).length,
        approved: all.filter((r) => r.status === "approved").length,
        rejected: all.filter((r) => r.status === "rejected").length,
      });
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ──── Approve ────
  const handleApprove = async (leaveId) => {
    setDeciding(true);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/leave/approve/${leaveId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ceo_note: ceoNote }),
        },
      );
      if (res.ok) {
        setSelected(null);
        setCeoNote("");
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
    setDeciding(false);
  };

  // ──── Reject ────
  const handleReject = async (leaveId) => {
    setDeciding(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/leave/reject/${leaveId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ceo_note: ceoNote }),
      });
      if (res.ok) {
        setSelected(null);
        setCeoNote("");
        await fetchData();
      }
    } catch (e) {
      console.error(e);
    }
    setDeciding(false);
  };

  // ──── Display list ────
  const displayList = activeTab === "pending" ? pendingLeaves : allLeaves;
  const totalPages = Math.ceil(displayList.length / itemsPerPage);
  const current = displayList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const leaveTypeColor = {
    annual: "bg-blue-500/20 text-blue-400",
    casual: "bg-purple-500/20 text-purple-400",
    sick: "bg-red-500/20 text-red-400",
    unpaid: "bg-gray-500/20 text-gray-400",
    emergency: "bg-orange-500/20 text-orange-400",
  };

  return (
    <div className="flex flex-col gap-8">
      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <LeaveStatCard
          title="Pending Requests"
          value={stats.pending}
          valueColor="text-yellow-400"
          icon={<FaHourglassHalf className="text-[#05DC7F] text-xl" />}
        />
        <LeaveStatCard
          title="Auto-Approved"
          value={stats.autoApproved}
          valueColor="text-[#05DC7F]"
          icon={<FaCheckCircle className="text-[#05DC7F] text-xl" />}
        />
        <LeaveStatCard
          title="Total Approved"
          value={stats.approved}
          valueColor="text-white"
          icon={<FaCalendarCheck className="text-[#05DC7F] text-xl" />}
        />
        <LeaveStatCard
          title="Rejected"
          value={stats.rejected}
          valueColor="text-red-500"
          icon={<FaTimesCircle className="text-[#05DC7F] text-xl" />}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setActiveTab("pending");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition
            ${
              activeTab === "pending"
                ? "bg-[#05DC7F] text-black"
                : "bg-black/40 text-gray-400 border border-[#05DC7F]/20"
            }`}
        >
          Pending ({stats.pending})
        </button>
        <button
          onClick={() => {
            setActiveTab("all");
            setCurrentPage(1);
          }}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition
            ${
              activeTab === "all"
                ? "bg-[#05DC7F] text-black"
                : "bg-black/40 text-gray-400 border border-[#05DC7F]/20"
            }`}
        >
          All Requests
        </button>
        <button
          onClick={fetchData}
          className="ml-auto px-3 py-2 text-xs bg-black/40 text-gray-400 border border-[#05DC7F]/20 rounded-xl hover:border-[#05DC7F]/50 transition"
        >
          Refresh
        </button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading...</div>
      ) : displayList.length === 0 ? (
        <div className="text-center text-gray-400 py-10">
          {activeTab === "pending"
            ? "Koi pending request nahi hai"
            : "Koi leave request nahi hai"}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {current.map((item) => (
            <div
              key={item.leave_id}
              className="flex flex-col lg:flex-row justify-between gap-4 p-5 rounded-2xl bg-black/40 border border-[#05DC7F]/25 hover:border-[#05DC7F]/45 transition-all"
            >
              <div className="flex flex-col gap-2">
                <h3 className="text-white font-semibold">
                  {item.employee_name}
                </h3>

                <div className="flex flex-wrap gap-2">
                  {/* Leave type */}
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${leaveTypeColor[item.leave_type] || "bg-gray-500/20 text-gray-400"}`}
                  >
                    {item.leave_type?.toUpperCase()}
                  </span>

                  {/* Status */}
                  <span
                    className={`px-2 py-0.5 text-xs rounded-full ${statusStyles[item.status] || ""}`}
                  >
                    {item.status}
                  </span>

                  {/* Auto approved badge */}
                  {item.auto_approved && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                      <FaRobot className="text-xs" /> AI Approved
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm">
                  {item.start_date} → {item.end_date}
                  <span className="ml-2 text-gray-500">
                    ({item.total_days} days)
                  </span>
                </p>

                {/* Agent reason — pending mein show karo */}
                {item.agent_reason && (
                  <p className="text-yellow-400 text-xs mt-1">
                    🤖 Agent: {item.agent_reason}
                  </p>
                )}
              </div>

              {/* View button — sirf pending mein */}
              {item.status === "pending" && (
                <div className="flex items-center">
                  <button
                    onClick={() => {
                      setSelected(item);
                      setCeoNote("");
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition whitespace-nowrap"
                  >
                    <FaEye /> Review
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 text-gray-300 text-sm">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
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
                className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
              >
                ›
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ Modal — CEO Review ══ */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-black border border-[#05DC7F]/40 rounded-2xl p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <FaTimes size={20} />
            </button>

            <h2 className="text-white text-xl font-bold mb-4">
              Leave Request — {selected.employee_name}
            </h2>

            <div className="space-y-3 text-gray-300 text-sm mb-4">
              <div className="flex gap-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${leaveTypeColor[selected.leave_type] || ""}`}
                >
                  {selected.leave_type?.toUpperCase()}
                </span>
                <span>{selected.total_days} days</span>
              </div>

              <p>
                <span className="text-white">From:</span> {selected.start_date}
              </p>
              <p>
                <span className="text-white">To:</span> {selected.end_date}
              </p>
              <p>
                <span className="text-white">Medical Cert:</span>{" "}
                {selected.has_medical_cert ? "✅ Yes" : "❌ No"}
              </p>
            </div>

            {/* ──── Agent Decision ──── */}
            {selected.agent_reason && (
              <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <p className="text-purple-400 text-xs font-semibold mb-1 flex items-center gap-1">
                  <FaRobot /> AI Agent Decision
                </p>
                <p className="text-gray-300 text-sm">{selected.agent_reason}</p>
                {selected.policy_reference && (
                  <p className="text-gray-500 text-xs mt-1">
                    Policy: {selected.policy_reference}
                  </p>
                )}
              </div>
            )}

            {/* ──── CEO Note ──── */}
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">CEO Note (optional)</p>
              <textarea
                value={ceoNote}
                onChange={(e) => setCeoNote(e.target.value)}
                rows={3}
                placeholder="Approval ya rejection ka reason..."
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none text-sm resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => handleApprove(selected.leave_id)}
                disabled={deciding}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition disabled:opacity-50"
              >
                {deciding ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaThumbsUp />
                )}
                Approve
              </button>
              <button
                onClick={() => handleReject(selected.leave_id)}
                disabled={deciding}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-50"
              >
                {deciding ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaThumbsDown />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
