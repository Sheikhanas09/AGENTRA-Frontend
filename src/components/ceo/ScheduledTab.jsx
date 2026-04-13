"use client";

import { useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaInfoCircle,
  FaTimes,
  FaUserTie,
  FaUsers,
  FaEnvelope,
} from "react-icons/fa";

function InterviewCard({ item, onView }) {
  return (
    <div className="flex flex-col lg:flex-row justify-between gap-6 p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_10px_rgba(5,220,127,0.15)] hover:border-[#05DC7F]/45 transition-all">
      <div className="flex flex-col gap-3">
        <h3 className="text-white text-lg font-semibold">
          {item.candidate_name}
        </h3>
        <p className="text-gray-400">{item.job_title}</p>
        <div className="flex flex-wrap gap-5 text-gray-300 text-sm">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#05DC7F]" /> {item.scheduled_date}
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="text-[#05DC7F]" /> {item.scheduled_time}
          </div>
          <div className="flex items-center gap-2">
            <FaVideo className="text-[#05DC7F]" /> Video Call
          </div>
        </div>
      </div>
      <div className="flex items-center">
        <button
          onClick={() => onView(item)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition"
        >
          <FaInfoCircle /> Details
        </button>
      </div>
    </div>
  );
}

function DetailsModal({ item, onClose }) {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm px-4 pt-10 overflow-y-auto">
      <div className="relative w-[90%] max-w-lg p-6 rounded-2xl bg-black/90 border border-[#05DC7F]/40 shadow-[0_0_25px_rgba(5,220,127,0.4)] mb-10">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
        >
          <FaTimes size={20} />
        </button>
        <h2 className="text-white text-xl font-bold mb-5 text-center">
          Interview Details
        </h2>
        <div className="flex flex-col gap-4 text-gray-300 text-sm">
          <div className="flex items-center gap-2">
            <FaUserTie className="text-[#05DC7F]" />
            <span className="text-white font-semibold">
              {item.candidate_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#05DC7F]" />
            <span>
              Position:{" "}
              <span className="text-white font-medium">{item.job_title}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaClock className="text-[#05DC7F]" />
            <span>
              Date & Time:{" "}
              <span className="text-white font-medium">
                {item.scheduled_date} | {item.scheduled_time}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaVideo className="text-[#05DC7F]" />
            <span>
              Mode: <span className="text-white font-medium">Video Call</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaUsers className="text-[#05DC7F]" />
            <span>
              Interviewers:{" "}
              <span className="text-white font-medium">
                {item.interviewer_1}
                {item.interviewer_2 ? `, ${item.interviewer_2}` : ""}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FaEnvelope className="text-[#05DC7F]" />
            <span className="text-white font-medium">
              Invitation Sent via Email
            </span>
          </div>
          {item.meeting_link && (
            <a
              href={item.meeting_link}
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

export default function ScheduledTab({ interviews = [] }) {
  const scheduled = interviews.filter((i) =>
    ["upcoming", "today"].includes(i.status),
  );
  const itemsPerPage = 2;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  const totalPages = Math.ceil(scheduled.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = scheduled.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-5">
      {currentItems.length === 0 && (
        <div className="text-center text-gray-400 py-6">
          No scheduled interviews found!
        </div>
      )}
      {currentItems.map((item, index) => (
        <InterviewCard
          key={index}
          item={item}
          onView={(data) => setSelectedItem(data)}
        />
      ))}
      <div className="flex justify-end items-center gap-1 text-gray-300 text-xs sm:text-sm mt-4">
        <button
          onClick={() => goToPage(1)}
          className="px-1 py-0.5 hover:bg-[#05DC7F]/20 rounded"
        >
          «
        </button>
        <button
          onClick={() => goToPage(currentPage - 1)}
          className="px-1 py-0.5 hover:bg-[#05DC7F]/20 rounded"
        >
          ‹
        </button>
        <span className="px-1 sm:px-2 py-0.5">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => goToPage(currentPage + 1)}
          className="px-1 py-0.5 hover:bg-[#05DC7F]/20 rounded"
        >
          ›
        </button>
        <button
          onClick={() => goToPage(totalPages || 1)}
          className="px-1 py-0.5 hover:bg-[#05DC7F]/20 rounded"
        >
          »
        </button>
      </div>
      {selectedItem && (
        <DetailsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
