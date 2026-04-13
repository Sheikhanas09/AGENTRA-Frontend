"use client";

import { useState, useEffect } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaEnvelope,
  FaVideo,
  FaMapMarkerAlt,
  FaUserTie,
  FaUsers,
  FaTimes,
} from "react-icons/fa";

import ScheduledTab from "./ScheduledTab";
import CompletedTab from "./CompletedTab";
import NoResponseTab from "./NoResponseTab";

function DetailsModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg sm:max-w-xl md:max-w-2xl rounded-2xl bg-black/90 border border-[#05DC7F]/40 p-5 sm:p-6 md:p-8 shadow-[0_0_25px_rgba(5,220,127,0.4)] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FaTimes />
        </button>
        <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-bold mb-4">
          Interview Details
        </h2>
        <div className="flex flex-col gap-3 text-gray-300 text-sm sm:text-base">
          <p className="flex items-center gap-2">
            <FaUserTie className="text-[#05DC7F]" />
            <span className="text-white font-semibold">
              {data.candidate_name}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#05DC7F]" />
            Position: {data.job_title}
          </p>
          <p className="flex items-center gap-2">
            <FaClock className="text-[#05DC7F]" />
            Date: {data.scheduled_date} | Time: {data.scheduled_time}
          </p>
          <p className="flex items-center gap-2">
            <FaVideo className="text-[#05DC7F]" />
            Mode: Video Call
          </p>
          <p className="flex items-center gap-2">
            <FaUsers className="text-[#05DC7F]" />
            Interviewers: {data.interviewer_1}
            {data.interviewer_2 ? `, ${data.interviewer_2}` : ""}
          </p>
          <p className="flex items-center gap-2">
            <FaEnvelope className="text-[#05DC7F]" />
            Invitation Sent via Email
          </p>
          {data.meeting_link && (
            <a
              href={data.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] transition"
            >
              <FaVideo /> Join Meeting
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ data, onDetails }) {
  return (
    <div className="p-4 sm:p-6 rounded-2xl border border-[#05DC7F] bg-[#0b2a1f] shadow-[0_0_20px_rgba(5,220,127,0.25)] flex flex-col lg:flex-row justify-between gap-5 sm:gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-white text-lg sm:text-xl font-bold">
          {data.candidate_name}
        </h3>
        <p className="text-gray-300">{data.job_title}</p>
        <div className="flex flex-wrap gap-4 sm:gap-6 text-gray-300 text-xs sm:text-sm mt-2">
          <span className="flex items-center gap-2">
            <FaClock className="text-[#05DC7F]" /> {data.scheduled_time}
          </span>
          <span className="flex items-center gap-2">
            <FaVideo className="text-[#05DC7F]" /> Video Call
          </span>
          <span className="flex items-center gap-2">
            <FaEnvelope className="text-[#05DC7F]" /> Email Sent
          </span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full lg:w-auto mt-4 lg:mt-0">
        {data.meeting_link && (
          <a
            href={data.meeting_link}
            target="_blank"
            rel="noreferrer"
            className="px-6 py-3 rounded-xl font-semibold bg-[#05DC7F] text-black flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(5,220,127,0.7)] transition-all"
          >
            <FaVideo /> Join Call
          </a>
        )}
        <button
          onClick={() => onDetails(data)}
          className="px-6 py-3 rounded-xl font-semibold border border-[#05DC7F]/40 text-white hover:bg-[#05DC7F]/10 transition-all flex items-center justify-center gap-2"
        >
          <FaCalendarAlt /> Details
        </button>
      </div>
    </div>
  );
}

export default function InterviewsTab() {
  const [activeTab, setActiveTab] = useState("Scheduled");
  const [selected, setSelected] = useState(null);
  const [todayInterviews, setTodayInterviews] = useState([]);
  const [allInterviews, setAllInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2;

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/recruitment/interviews", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const all = data.interviews || [];
      setAllInterviews(all);
      setTodayInterviews(all.filter((i) => i.status === "today"));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(todayInterviews.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentSchedules = todayInterviews.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const tabs = ["Scheduled", "Completed", "No Response"];

  return (
    <div className="flex flex-col gap-8">
      {/* ===== TODAY'S SCHEDULE ===== */}
      <div className="flex flex-col gap-6 relative">
        <h2 className="text-white text-xl sm:text-2xl md:text-3xl font-bold">
          Today's Schedule
        </h2>

        {/* Pagination top right */}
        <div className="absolute right-0 top-0 flex flex-wrap sm:flex-nowrap items-center gap-2 text-xs sm:text-sm text-gray-300">
          <button
            onClick={() => setCurrentPage(1)}
            className="px-2 py-1 rounded hover:bg-[#05DC7F]/20 hover:text-white transition-all duration-200"
          >
            «
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 rounded hover:bg-[#05DC7F]/20 hover:text-white transition-all duration-200"
          >
            ‹
          </button>
          <span>
            Page {currentPage} of {totalPages || 1}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 rounded hover:bg-[#05DC7F]/20 hover:text-white transition-all duration-200"
          >
            ›
          </button>
          <button
            onClick={() => setCurrentPage(totalPages || 1)}
            className="px-2 py-1 rounded hover:bg-[#05DC7F]/20 hover:text-white transition-all duration-200"
          >
            »
          </button>
        </div>

        {loading && (
          <div className="text-[#05DC7F] text-center py-4">Loading...</div>
        )}

        {!loading && currentSchedules.length === 0 && (
          <div className="text-gray-400 text-center py-6">
            No interviews are scheduled for today!
          </div>
        )}

        {!loading &&
          currentSchedules.map((item, index) => (
            <ScheduleCard key={index} data={item} onDetails={setSelected} />
          ))}
      </div>

      {/* ===== STATUS TABS ===== */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide bg-black/30 p-3 rounded-xl backdrop-blur-sm border border-[#05DC7F]/20">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-full font-semibold transition-all ${
              activeTab === tab
                ? "bg-[#05DC7F]/20 text-white border border-[#05DC7F]"
                : "text-gray-400 hover:bg-[#05DC7F]/10 hover:text-white"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="bg-black/30 rounded-2xl p-4 sm:p-6 md:p-8 backdrop-blur-sm border border-[#05DC7F]/20 min-h-[200px] sm:min-h-[260px]">
        {activeTab === "Scheduled" && (
          <ScheduledTab interviews={allInterviews} />
        )}
        {activeTab === "Completed" && (
          <CompletedTab interviews={allInterviews} />
        )}
        {activeTab === "No Response" && (
          <NoResponseTab interviews={allInterviews} />
        )}
      </div>

      {selected && (
        <DetailsModal data={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
