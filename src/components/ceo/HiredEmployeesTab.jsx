"use client";

import { useState, useEffect } from "react";
import {
  FaUserTie,
  FaEnvelope,
  FaBriefcase,
  FaBuilding,
  FaStar,
  FaTrash,
  FaSync,
  FaCheckCircle,
  FaFilter,
  FaSearch,
  FaCalendarAlt,
} from "react-icons/fa";

export default function HiredEmployeesTab() {
  const [activeTab, setActiveTab] = useState("all");

  // ──── All Employees ────
  const [allEmployees, setAllEmployees] = useState([]);
  const [allLoading, setAllLoading] = useState(true);

  // ──── Hired Employees ────
  const [hiredEmployees, setHiredEmployees] = useState([]);
  const [hiredLoading, setHiredLoading] = useState(true);

  const [fireLoading, setFireLoading] = useState(null);
  const [fireSuccess, setFireSuccess] = useState(null);

  // ──── Filters ────
  const [filterDept, setFilterDept] = useState("");
  const [searchName, setSearchName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAllEmployees();
    fetchHiredEmployees();
  }, []);

  const fetchAllEmployees = async () => {
    setAllLoading(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/recruitment/all-employees",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setAllEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    }
    setAllLoading(false);
  };

  const fetchHiredEmployees = async () => {
    setHiredLoading(true);
    try {
      const res = await fetch(
        "http://127.0.0.1:8000/recruitment/hired-employees",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = await res.json();
      setHiredEmployees(data.employees || []);
    } catch (err) {
      console.error(err);
    }
    setHiredLoading(false);
  };

  const handleFire = async (emp) => {
    if (
      !window.confirm(`Kya aap ${emp.full_name} ko remove karna chahte hain?`)
    )
      return;
    setFireLoading(emp.id);
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/recruitment/fire-employee/${emp.id}`,
        { method: "PUT", headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.ok) {
        setFireSuccess(emp.full_name);
        fetchAllEmployees();
        fetchHiredEmployees();
        setTimeout(() => setFireSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
    setFireLoading(null);
  };

  const getStatusBadge = (status) => {
    if (status === "accepted")
      return "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]/40";
    if (status === "hired")
      return "bg-blue-500/20 text-blue-400 border-blue-500/40";
    if (status === "active")
      return "bg-purple-500/20 text-purple-400 border-purple-500/40";
    return "bg-gray-500/20 text-gray-400 border-gray-500/40";
  };

  const getStatusLabel = (status) => {
    if (status === "accepted") return "✓ Accepted";
    if (status === "hired") return "Hired";
    if (status === "active") return "Active";
    return status;
  };

  const getCategoryColor = (category) => {
    const map = {
      "Strong Hire": "text-[#05DC7F] bg-[#05DC7F]/20 border-[#05DC7F]/40",
      Hire: "text-blue-400 bg-blue-500/20 border-blue-500/40",
      Consider: "text-yellow-400 bg-yellow-500/20 border-yellow-500/40",
    };
    return map[category] || "text-gray-400 bg-gray-500/20 border-gray-500/40";
  };

  // ──── Current data based on tab ────
  const currentData = activeTab === "all" ? allEmployees : hiredEmployees;
  const currentLoading = activeTab === "all" ? allLoading : hiredLoading;

  // ──── Unique departments ────
  const departments = [
    ...new Set(
      currentData.map((e) => e.department).filter((d) => d && d !== "—"),
    ),
  ];

  // ──── Filter + Search ────
  const filtered = currentData.filter((emp) => {
    const deptMatch = filterDept ? emp.department === filterDept : true;
    const nameMatch = searchName
      ? emp.full_name.toLowerCase().includes(searchName.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchName.toLowerCase())
      : true;
    return deptMatch && nameMatch;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filtered.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilterDept("");
    setSearchName("");
    setCurrentPage(1);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ──── Header ──── */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-white text-xl sm:text-2xl font-bold">
            Employees
          </h3>
          <p className="text-gray-400 text-sm mt-1">
            {filtered.length} / {currentData.length} employees
          </p>
        </div>
        <button
          onClick={() => {
            fetchAllEmployees();
            fetchHiredEmployees();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#05DC7F]/30 text-[#05DC7F] text-sm hover:bg-[#05DC7F]/10 transition"
        >
          <FaSync size={12} /> Refresh
        </button>
      </div>

      {/* ──── Tabs ──── */}
      <div className="flex gap-2">
        <button
          onClick={() => handleTabChange("all")}
          className={`px-5 py-2 rounded-xl text-sm font-medium border transition ${
            activeTab === "all"
              ? "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]"
              : "text-gray-400 border-gray-700 hover:border-[#05DC7F]/40"
          }`}
        >
          All Employees ({allEmployees.length})
        </button>
        <button
          onClick={() => handleTabChange("hired")}
          className={`px-5 py-2 rounded-xl text-sm font-medium border transition ${
            activeTab === "hired"
              ? "bg-[#05DC7F]/20 text-[#05DC7F] border-[#05DC7F]"
              : "text-gray-400 border-gray-700 hover:border-[#05DC7F]/40"
          }`}
        >
          Hired Employees ({hiredEmployees.length})
        </button>
      </div>

      {/* ──── Filters ──── */}
      <div className="flex flex-wrap gap-3 items-center">
        <FaFilter className="text-gray-400" size={12} />

        {/* Search */}
        <div className="relative">
          <FaSearch
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={11}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchName}
            onChange={(e) => {
              setSearchName(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 pr-3 py-2 bg-black/30 border border-[#05DC7F]/20 rounded-xl text-white text-sm focus:outline-none focus:border-[#05DC7F] transition w-52"
          />
        </div>

        {/* Department Filter */}
        <select
          value={filterDept}
          onChange={(e) => {
            setFilterDept(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-black/30 border border-[#05DC7F]/20 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>
              {dept}
            </option>
          ))}
        </select>

        {(filterDept || searchName) && (
          <button
            onClick={() => {
              setFilterDept("");
              setSearchName("");
              setCurrentPage(1);
            }}
            className="text-xs text-gray-400 hover:text-white transition"
          >
            Clear
          </button>
        )}
      </div>

      {/* ──── Fire Success ──── */}
      {fireSuccess && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-3">
          <FaCheckCircle className="text-red-400" size={18} />
          <p className="text-red-400 font-medium">
            {fireSuccess} remove ho gaya!
          </p>
        </div>
      )}

      {currentLoading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* ──── ALL EMPLOYEES TAB ──── */}
      {!currentLoading && activeTab === "all" && (
        <>
          <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 border-b border-gray-700 text-gray-400 font-semibold text-xs">
            <div className="col-span-1">#</div>
            <div className="col-span-2">Name</div>
            <div className="col-span-2">Email</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2">Joining Date</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Action</div>
          </div>

          <div className="flex flex-col divide-y divide-gray-800">
            {currentEmployees.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                Koi employee nahi mila!
              </div>
            )}

            {currentEmployees.map((emp, i) => (
              <div
                key={emp.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-4 hover:bg-black/20 rounded-lg transition"
              >
                <div className="col-span-1 text-gray-400 text-sm">
                  {startIndex + i + 1}
                </div>

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

                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaEnvelope size={10} className="text-[#05DC7F]" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaBuilding size={10} className="text-[#05DC7F]" />
                    <span>{emp.department || "—"}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaCalendarAlt size={10} className="text-[#05DC7F]" />
                    <span>{emp.joining_date || "—"}</span>
                  </div>
                </div>

                <div className="col-span-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                      emp.employee_type === "hired"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                        : "bg-purple-500/20 text-purple-400 border-purple-500/40"
                    }`}
                  >
                    {emp.employee_type === "hired" ? "Hired" : "Created"}
                  </span>
                </div>

                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadge(emp.status)}`}
                  >
                    {getStatusLabel(emp.status)}
                  </span>
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleFire(emp)}
                    disabled={fireLoading === emp.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <FaTrash size={10} />
                    <span className="hidden sm:inline">
                      {fireLoading === emp.id ? "..." : "Remove"}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ──── HIRED EMPLOYEES TAB ──── */}
      {!currentLoading && activeTab === "hired" && (
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

          <div className="flex flex-col divide-y divide-gray-800">
            {currentEmployees.length === 0 && (
              <div className="text-center text-gray-400 py-10">
                Koi hired employee nahi mila!
              </div>
            )}

            {currentEmployees.map((emp, i) => (
              <div
                key={emp.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-4 hover:bg-black/20 rounded-lg transition"
              >
                <div className="col-span-1 text-gray-400 text-sm">
                  {startIndex + i + 1}
                </div>

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

                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaEnvelope size={10} className="text-[#05DC7F]" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-gray-300 text-xs">
                    <FaBriefcase size={10} className="text-[#05DC7F]" />
                    <span>{emp.job_title || "—"}</span>
                  </div>
                </div>

                <div className="col-span-1">
                  <div className="flex items-center gap-1 text-gray-400 text-xs">
                    <FaBuilding size={10} className="text-[#05DC7F]" />
                    <span>{emp.department || "—"}</span>
                  </div>
                </div>

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

                <div className="col-span-1">
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(emp.ranking_category)}`}
                  >
                    {emp.ranking_category || "—"}
                  </span>
                </div>

                <div className="col-span-1">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadge(emp.status)}`}
                  >
                    {getStatusLabel(emp.status)}
                  </span>
                </div>

                <div className="col-span-1 flex justify-end">
                  <button
                    onClick={() => handleFire(emp)}
                    disabled={fireLoading === emp.id}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                  >
                    <FaTrash size={10} />
                    <span className="hidden sm:inline">
                      {fireLoading === emp.id ? "..." : "Remove"}
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ──── Pagination ──── */}
      {!currentLoading && (
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
      )}
    </div>
  );
}
