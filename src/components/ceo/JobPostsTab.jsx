"use client";
import { useState, useEffect } from "react";
import { FaEye, FaTrash } from "react-icons/fa";

export default function JobPostsTab({ setSelectedJob }) {
  const [jobPosts, setJobPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const token = localStorage.getItem("token");

  // ──── Real jobs fetch karo ────
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/recruitment/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setJobPosts(data.jobs || []);
    } catch (err) {
      console.error("Jobs fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // ──── Job delete ────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This job will be permanently deleted!"))
      return;
    try {
      await fetch(`http://127.0.0.1:8000/recruitment/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchJobs();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const totalPages = Math.ceil(jobPosts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = jobPosts.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page) => {
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    setCurrentPage(page);
  };

  // ──── Date format ────
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
      <div className="flex justify-between items-center">
        <h3 className="text-white text-xl sm:text-2xl font-bold">Job Posts</h3>
        <span className="text-gray-400 text-sm">Total: {jobPosts.length}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-[#05DC7F] py-10">Loading...</div>
      )}

      {/* Table Header */}
      {!loading && (
        <>
          <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-2 border-b border-gray-700 text-gray-400 font-semibold text-sm">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Job Title</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Posted On</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Rows */}
          <div className="flex flex-col divide-y divide-gray-800">
            {currentJobs.map((job, index) => (
              <div
                key={job.id}
                className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-black/20 rounded-lg transition"
              >
                <div className="col-span-1 text-gray-400 text-sm">
                  {startIndex + index + 1}
                </div>
                <div className="col-span-4 text-white font-medium text-sm">
                  {job.title}
                </div>
                <div className="col-span-2 text-gray-300 text-sm">
                  {job.department}
                </div>
                <div className="col-span-2 text-gray-300 text-sm">
                  <span className="px-2 py-0.5 rounded-full bg-[#05DC7F]/20 text-[#05DC7F] text-xs">
                    {job.employment_type}
                  </span>
                </div>
                <div className="col-span-2 text-gray-400 text-sm">
                  {formatDate(job.created_at)}
                </div>
                <div className="col-span-1 flex justify-end gap-2">
                  {/* View button */}
                  <button
                    onClick={() =>
                      setSelectedJob({
                        ...job,
                        description: job.full_description,
                      })
                    }
                    className="p-1.5 rounded-lg bg-black/40 text-white border border-gray-600 hover:border-[#05DC7F] hover:text-[#05DC7F] transition"
                  >
                    <FaEye size={14} />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(job.id)}
                    className="p-1.5 rounded-lg bg-black/40 text-white border border-gray-600 hover:border-red-500 hover:text-red-400 transition"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}

            {jobPosts.length === 0 && (
              <div className="text-center text-gray-400 py-10 text-sm">
                No job posts found — please create a job first!
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-end items-center gap-2 mt-2 text-gray-300 text-sm">
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
        </>
      )}
    </div>
  );
}
