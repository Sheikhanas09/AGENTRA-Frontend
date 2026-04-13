"use client";

import { useState, useEffect } from "react";
import {
  FaUserTie,
  FaEnvelope,
  FaPhone,
  FaBriefcase,
  FaBuilding,
  FaStar,
  FaTrash,
  FaSync,
  FaCheckCircle,
} from "react-icons/fa";

export default function HiredEmployeesTab() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fireLoading, setFireLoading] = useState(null);
  const [fireSuccess, setFireSuccess] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/recruitment/hired-employees",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleFire = async (emp) => {
    if (!window.confirm(`Do you want ${emp.full_name} to remove it?`)) return;
    setFireLoading(emp.application_id);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/fire-employee/${emp.application_id}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      if (res.ok) {
        setFireSuccess(emp.full_name);
        fetchEmployees();
        setTimeout(() => setFireSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
    setFireLoading(null);
  };

  const getCategoryColor = (category) => {
    const map = {
      "Strong Hire": "text-[#05DC7F] bg-[#05DC7F]/20 border-[#05DC7F]/40",
      Hire: "text-blue-400 bg-blue-500/20 border-blue-500/40",
      Consider: "text-yellow-400 bg-yellow-500/20 border-yellow-500/40",
    };
    return map[category] || "text-gray-400 bg-gray-500/20 border-gray-500/40";
  };

  const getStatusBadge = (status) => {
    if (status === "accepted")
      return "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]/40";
    if (status === "hired")
      return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    return "bg-gray-500/20 text-gray-400 border-gray-500/40";
  };

  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = employees.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-white text-xl sm:text-2xl font-bold">
            Hired Employees
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            Total: {employees.length} employees
          </p>
        </div>
        <button
          onClick={fetchEmployees}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#05DC7F]/30 text-[#05DC7F] text-sm hover:bg-[#05DC7F]/10 transition"
        >
          <FaSync size={12} /> Refresh
        </button>
      </div>

      {/* ──── Fire Success ──── */}
      {fireSuccess && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <FaCheckCircle className="text-red-400" size={18} />
          <p className="text-red-400 font-medium">
            {fireSuccess} removed successfully!
          </p>
        </div>
      )}

      {loading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* ──── Table Header ──── */}
      {!loading && (
        <>
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-gray-700 text-gray-400 font-semibold text-xs">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Position</div>
            <div className="col-span-1">Department</div>
            <div className="col-span-1">Score</div>
            <div className="col-span-1">Category</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          {/* ──── Rows ──── */}
          <div className="flex flex-col divide-y divide-gray-800">
            {currentEmployees.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                No hired employees found — please hire candidates first!
              </div>
            )}

            {currentEmployees.map((emp, i) => (
              <div
                key={emp.application_id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-4 hover:bg-black/20 rounded-lg transition"
              >
                {/* # */}
                <div className="col-span-1 text-gray-400 text-sm">
                  {startIndex + i + 1}
                </div>

                {/* Name */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#05DC7F]/20 border border-[#05DC7F]/40 flex items-center justify-center flex-shrink-0">
                      <FaUserTie className="text-[#05DC7F]" size={12} />
                    </div>
                    <p className="text-white font-medium text-sm">
                      {emp.full_name}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaEnvelope size={10} className="text-[#05DC7F]" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>

                {/* Position */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-300 text-xs">
                    <FaBriefcase size={10} className="text-[#05DC7F]" />
                    <span>{emp.job_title}</span>
                  </div>
                </div>

                {/* Department */}
                <div className="col-span-1">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaBuilding size={10} className="text-[#05DC7F]" />
                    <span>{emp.department || "—"}</span>
                  </div>
                </div>

                {/* Score */}
                <div className="col-span-1">
                  {emp.final_score ? (
                    <div className="flex items-center gap-1">
                      <FaStar size={10} className="text-yellow-400" />
                      <span className="text-white font-medium text-xs">
                        {emp.final_score.toFixed(1)}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs">—</span>
                  )}
                </div>

                {/* Category */}
                <div className="col-span-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(emp.ranking_category)}`}
                  >
                    {emp.ranking_category}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center gap-0.5 px-0.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadge(emp.status)}`}
                  >
                    {emp.status === "accepted" ? "✓ Accepted" : "Hired"}
                  </span>
                </div>

                {/* Action */}
                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleFire(emp)}
                    disabled={fireLoading === emp.application_id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <FaTrash size={10} />
                    <span className="hidden sm:inline">
                      {fireLoading === emp.application_id ? "..." : "Remove"}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ──── Pagination ──── */}
          <div className="flex flex-wrap justify-end items-center gap-2 mt-2 text-gray-300 text-sm">
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
              Page {currentPage} of {totalPages || 1}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              ›
            </button>
            <button
              onClick={() => goToPage(totalPages || 1)}
              className="px-2 py-1 hover:bg-[#05DC7F]/20 rounded"
            >
              »
            </button>
          </div>
        </>
      )}
    </div>
  );
}
