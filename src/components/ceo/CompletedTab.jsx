"use client";

import { useState } from "react";
import {
  FaCheckCircle,
  FaInfoCircle,
  FaTimes,
  FaUserTie,
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaUsers,
  FaEnvelope,
} from "react-icons/fa";

function CompletedInterviewCard({ item, onView }) {
  return (
    <div className="flex flex-col lg:flex-row justify-between gap-6 p-6 rounded-2xl bg-black/40 backdrop-blur-sm border border-[#05DC7F]/25 shadow-[0_0_10px_rgba(5,220,127,0.15)] hover:border-[#05DC7F]/45 transition-all">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-white text-lg font-semibold">
            {item.candidate_name}
          </h3>
          <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#05DC7F]/15 border border-[#05DC7F]/40 text-[#05DC7F] text-xs font-semibold">
            <FaCheckCircle /> Completed
          </span>
        </div>
        <p className="text-gray-400">{item.job_title}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Date:</span>
          <span className="text-white font-semibold">
            {item.scheduled_date}
          </span>
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

function DetailsModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-black/90 border border-[#05DC7F]/40 p-6 shadow-[0_0_25px_rgba(5,220,127,0.4)] relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FaTimes />
        </button>
        <h2 className="text-white text-xl font-bold mb-4 text-center">
          Interview Details
        </h2>
        <div className="flex flex-col gap-3 text-gray-300 text-sm">
          <p className="flex items-center gap-2">
            <FaUserTie className="text-[#05DC7F]" />
            <span className="text-white font-semibold">
              {data.candidate_name}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <FaCalendarAlt className="text-[#05DC7F]" />
            Position:{" "}
            <span className="text-white font-medium ml-1">
              {data.job_title}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <FaClock className="text-[#05DC7F]" />
            Date & Time:{" "}
            <span className="text-white font-medium ml-1">
              {data.scheduled_date} | {data.scheduled_time}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <FaVideo className="text-[#05DC7F]" />
            Mode:{" "}
            <span className="text-white font-medium ml-1">Video Call</span>
          </p>
          <p className="flex items-center gap-2">
            <FaUsers className="text-[#05DC7F]" />
            Interviewers:{" "}
            <span className="text-white font-medium ml-1">
              {data.interviewer_1}
              {data.interviewer_2 ? `, ${data.interviewer_2}` : ""}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <FaEnvelope className="text-[#05DC7F]" />
            Invitation Sent via Email
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CompletedTab({ interviews = [] }) {
  const completed = interviews.filter((i) => i.status === "completed");
  const itemsPerPage = 2;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  const totalPages = Math.ceil(completed.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = completed.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-5">
      {currentItems.length === 0 && (
        <div className="text-center text-gray-400 py-6">
          Koi completed interview nahi!
        </div>
      )}
      {currentItems.map((item, index) => (
        <CompletedInterviewCard
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
          data={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
