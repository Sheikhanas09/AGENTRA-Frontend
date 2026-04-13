"use client";

import { useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaVideo,
  FaInfoCircle,
  FaTimes,
  FaUserTie,
  FaExclamationTriangle,
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

function DetailsModal({ data, onClose }) {
  if (!data) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-black/90 border border-[#05DC7F]/40 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <FaTimes />
        </button>
        <h2 className="text-white text-xl font-bold mb-5 text-center">
          Interview Details
        </h2>
        <div className="flex flex-col gap-4 text-sm text-gray-300">
          <p className="flex items-center gap-2">
            <FaUserTie className="text-[#05DC7F]" />
            <span className="text-white font-semibold">
              {data.candidate_name}
            </span>
          </p>
          <p>
            Position:{" "}
            <span className="text-white font-medium">{data.job_title}</span>
          </p>
          <p>
            Schedule:{" "}
            <span className="text-white font-medium">
              {data.scheduled_date} | {data.scheduled_time}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <FaExclamationTriangle className="text-yellow-400" />
            <span className="text-white font-medium">
              Interview passed — No feedback submitted
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NoResponseTab({ interviews = [] }) {
  const noResponse = interviews.filter((i) => i.status === "pending");
  const itemsPerPage = 2;
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);

  const totalPages = Math.ceil(noResponse.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = noResponse.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  return (
    <div className="flex flex-col gap-5">
      {currentItems.length === 0 && (
        <div className="text-center text-gray-400 py-6">
          No pending interviews found!
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
          data={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
