import { useState, useEffect } from "react";

export default function AllCompanies() {
  const [activeTab, setActiveTab] = useState("Active");
  const [companies, setCompanies] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  const fetchCompanies = async (tab) => {
    setLoading(true);
    try {
      let url = "";
      if (tab === "Active") url = "http://127.0.0.1:8000/admin/approved-ceos";
      else if (tab === "Inactive")
        url = "http://127.0.0.1:8000/admin/inactive-ceos";
      else if (tab === "Requests")
        url = "http://127.0.0.1:8000/admin/pending-ceos";

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCompanies(data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
    setLoading(false);
  };

  const fetchPendingCount = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/admin/pending-ceos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setPendingCount(data.length);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCompanies(activeTab);
    fetchPendingCount();
  }, [activeTab]);

  const handleApprove = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/admin/approve-ceo/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies(activeTab);
      fetchPendingCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/admin/reject-ceo/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies(activeTab);
      fetchPendingCount();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/admin/deactivate-ceo/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies(activeTab);
    } catch (err) {
      console.error(err);
    }
  };

  const handleActivate = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/admin/activate-ceo/${id}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies(activeTab);
    } catch (err) {
      console.error(err);
    }
  };

  // ──── Yeh naya add hua ────
  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Kya aap sure hain? Yeh CEO permanently delete ho jayega!",
      )
    )
      return;
    try {
      await fetch(`http://127.0.0.1:8000/admin/delete-ceo/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies(activeTab);
      fetchPendingCount();
    } catch (err) {
      console.error(err);
    }
  };

  const totalPages = Math.ceil(companies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCompanies = companies.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const goToPage = (page) => {
    if (page < 1) return setCurrentPage(1);
    if (page > totalPages) return setCurrentPage(totalPages);
    setCurrentPage(page);
  };

  return (
    <div className="text-white/70">
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-[#05DC7F]/25 pb-2">
        {["Active", "Inactive", "Requests"].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-t-lg transition flex items-center gap-2 ${
              activeTab === tab
                ? "bg-[#05DC7F] text-black font-semibold"
                : "hover:bg-[#05DC7F]/20"
            }`}
          >
            {tab}
            {tab === "Requests" && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* Table */}
      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-[#05DC7F]/25 backdrop-blur-sm shadow-[0_0_10px_rgba(5,220,127,0.25)]">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-[#0A0F18]">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400 uppercase">
                  CEO Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400 uppercase">
                  Status
                </th>
                {activeTab === "Active" && (
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-400 uppercase">
                    Days Left
                  </th>
                )}
                <th className="px-6 py-3 text-right text-sm font-semibold text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {currentCompanies.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-500">
                    Koi data nahi
                  </td>
                </tr>
              ) : (
                currentCompanies.map((company) => (
                  <tr
                    key={company.id}
                    className="hover:bg-[#05DC7F]/10 transition"
                  >
                    <td className="px-6 py-4">{company.company_name}</td>
                    <td className="px-6 py-4">{company.full_name}</td>
                    <td className="px-6 py-4 text-gray-400">{company.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          activeTab === "Active"
                            ? "bg-[#05DC7F]/20 text-[#05DC7F]"
                            : activeTab === "Inactive"
                              ? "bg-gray-500/20 text-gray-400"
                              : "bg-yellow-500/20 text-yellow-400"
                        }`}
                      >
                        {activeTab === "Active"
                          ? "Active"
                          : activeTab === "Inactive"
                            ? "Inactive"
                            : "Pending"}
                      </span>
                    </td>

                    {activeTab === "Active" && (
                      <td className="px-6 py-4">
                        {company.days_left !== null &&
                        company.days_left !== undefined ? (
                          <span
                            className={`font-semibold ${
                              company.days_left <= 5
                                ? "text-red-400"
                                : company.days_left <= 10
                                  ? "text-yellow-400"
                                  : "text-[#05DC7F]"
                            }`}
                          >
                            {company.days_left} days
                          </span>
                        ) : (
                          <span className="text-gray-500">—</span>
                        )}
                      </td>
                    )}

                    <td className="px-6 py-4 text-right">
                      {/* ──── Active tab actions ──── */}
                      {activeTab === "Active" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleDeactivate(company.id)}
                            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 border border-red-500/40 text-sm font-medium hover:bg-red-500 hover:text-white transition"
                          >
                            Set Inactive
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="px-3 py-1 rounded-lg bg-red-700/30 text-red-400 border border-red-700/40 text-sm font-medium hover:bg-red-700 hover:text-white transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {/* ──── Inactive tab actions ──── */}
                      {activeTab === "Inactive" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleActivate(company.id)}
                            className="px-3 py-1 rounded-lg bg-[#05DC7F]/20 text-[#05DC7F] border border-[#05DC7F]/40 text-sm font-medium hover:bg-[#05DC7F] hover:text-black transition"
                          >
                            Set Active
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
                            className="px-3 py-1 rounded-lg bg-red-700/30 text-red-400 border border-red-700/40 text-sm font-medium hover:bg-red-700 hover:text-white transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}

                      {/* ──── Requests tab actions ──── */}
                      {activeTab === "Requests" && (
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(company.id)}
                            className="px-3 py-1 rounded-lg bg-[#05DC7F] text-black text-sm font-medium hover:bg-green-600 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(company.id)}
                            className="px-3 py-1 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap gap-1 justify-end items-center mt-3 text-gray-300 text-xs md:text-sm">
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
      )}
    </div>
  );
}
