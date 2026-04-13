"use client";

import { useState, useEffect } from "react"; // ← add
import { FaBriefcase, FaCheck, FaTimes } from "react-icons/fa";

export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalCompanies: "...",
    activeCompanies: "...",
    pendingRequests: "...",
  });

  const token = localStorage.getItem("token");

  // ──── Real stats fetch karo ────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Teeno APIs ek saath call karo
        const [activeRes, pendingRes, inactiveRes, rejectedRes] =
          await Promise.all([
            fetch("http://127.0.0.1:8000/admin/approved-ceos", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("http://127.0.0.1:8000/admin/pending-ceos", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("http://127.0.0.1:8000/admin/inactive-ceos", {
              headers: { Authorization: `Bearer ${token}` },
            }),
            fetch("http://127.0.0.1:8000/admin/rejected-ceos", {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);

        const active = await activeRes.json();
        const pending = await pendingRes.json();
        const inactive = await inactiveRes.json();
        const rejected = await rejectedRes.json();

        setStats({
          totalCompanies: active.length + inactive.length + rejected.length,
          activeCompanies: active.length,
          pendingRequests: pending.length,
        });
      } catch (err) {
        console.error("Stats fetch error:", err);
        setStats({
          totalCompanies: "—",
          activeCompanies: "—",
          pendingRequests: "—",
        });
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="text-white/70">
      <h2 className="text-2xl font-semibold mb-4">Overview</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Companies */}
        <div className="flex justify-between items-center p-5 rounded-2xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_10px_rgba(5,220,127,0.25)] hover:border-[#05DC7F]/45 hover:shadow-[0_0_18px_rgba(5,220,127,0.45)] transition-all duration-300">
          <div>
            <p className="text-gray-400 text-sm">Total Companies</p>
            <h3 className="text-3xl font-bold text-white mt-2">
              {stats.totalCompanies}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#05DC7F]/15 border border-[#05DC7F]/40 text-[#05DC7F] text-xl">
            <FaBriefcase />
          </div>
        </div>

        {/* Active Companies */}
        <div className="flex justify-between items-center p-5 rounded-2xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_10px_rgba(5,220,127,0.25)] hover:border-[#05DC7F]/45 hover:shadow-[0_0_18px_rgba(5,220,127,0.45)] transition-all duration-300">
          <div>
            <p className="text-gray-400 text-sm">Active Companies</p>
            <h3 className="text-3xl font-bold text-[#05DC7F] mt-2">
              {stats.activeCompanies}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#05DC7F]/15 border border-[#05DC7F]/40 text-[#05DC7F] text-xl">
            <FaCheck />
          </div>
        </div>

        {/* Pending Requests */}
        <div className="flex justify-between items-center p-5 rounded-2xl backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_10px_rgba(5,220,127,0.25)] hover:border-[#05DC7F]/45 hover:shadow-[0_0_18px_rgba(5,220,127,0.45)] transition-all duration-300">
          <div>
            <p className="text-gray-400 text-sm">Pending Requests</p>
            <h3 className="text-3xl font-bold text-yellow-400 mt-2">
              {stats.pendingRequests}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#05DC7F]/15 border border-[#05DC7F]/40 text-[#05DC7F] text-xl">
            <FaTimes />
          </div>
        </div>
      </div>
    </div>
  );
}
