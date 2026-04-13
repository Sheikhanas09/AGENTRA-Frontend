"use client";

import { useState } from "react";

export default function CreateJobTab() {
  const [formData, setFormData] = useState({
    title: "",
    experience: "",
    employment_type: "",
    department: "",
    skills: "",
    salary_range: "",
    additional_info: "", // ← naya
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [generatedJob, setGeneratedJob] = useState(null);

  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setGeneratedJob(null);
    setLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/recruitment/jobs/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "The job could not be created.");
        setLoading(false);
        return;
      }

      setSuccess("The job has been created successfully!.");
      setGeneratedJob(data);

      setFormData({
        title: "",
        experience: "",
        employment_type: "",
        department: "",
        skills: "",
        salary_range: "",
        additional_info: "", // ← reset
      });
    } catch (err) {
      setError("Unable to connect to the server.");
    }

    setLoading(false);
  };

  return (
    <div className="flex flex-col gap-4 sm:gap-6 text-gray-300">
      <h3 className="text-white text-xl sm:text-2xl font-semibold mb-4">
        Create a New Job
      </h3>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-[#05DC7F]/20 border border-[#05DC7F] text-[#05DC7F] text-sm rounded-xl px-4 py-3">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Job Title */}
          <div className="flex flex-col w-full">
            <label className="text-gray-400 mb-1 text-sm">Job Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Frontend Developer"
              required
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
            />
          </div>

          {/* Department */}
          <div className="flex flex-col w-full">
            <label className="text-gray-400 mb-1 text-sm">Department *</label>
            <select
              name="department"
              value={formData.department}
              onChange={handleChange}
              required
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
            >
              <option value="">Select Department</option>
              <option>Engineering</option>
              <option>Design</option>
              <option>Marketing</option>
              <option>Finance</option>
              <option>Human Resources</option>
              <option>Sales</option>
            </select>
          </div>

          {/* Experience */}
          <div className="flex flex-col w-full">
            <label className="text-gray-400 mb-1 text-sm">
              Experience Required *
            </label>
            <input
              type="text"
              name="experience"
              value={formData.experience}
              onChange={handleChange}
              placeholder="e.g., 6 months, 1 year, 2-3 years"
              required
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
            />
          </div>

          {/* Employment Type */}
          <div className="flex flex-col w-full">
            <label className="text-gray-400 mb-1 text-sm">
              Employment Type *
            </label>
            <select
              name="employment_type"
              value={formData.employment_type}
              onChange={handleChange}
              required
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
            >
              <option value="">Select Type</option>
              <option>Full Time</option>
              <option>Part Time</option>
              <option>Contract</option>
              <option>Internship</option>
              <option>Remote</option>
            </select>
          </div>

          {/* Salary Range */}
          <div className="flex flex-col w-full">
            <label className="text-gray-400 mb-1 text-sm">Salary Range *</label>
            <input
              type="text"
              name="salary_range"
              value={formData.salary_range}
              onChange={handleChange}
              placeholder="e.g., 50000-80000"
              required
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
            />
          </div>

          {/* Skills */}
          <div className="flex flex-col w-full">
            <label className="text-gray-400 mb-1 text-sm">Key Skills *</label>
            <input
              type="text"
              name="skills"
              value={formData.skills}
              onChange={handleChange}
              placeholder="e.g., React, Python, SQL"
              required
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition"
            />
          </div>

          {/* ──── Additional Info ──── */}
          <div className="flex flex-col w-full md:col-span-2">
            <label className="text-gray-400 mb-1 text-sm">
              Additional Benefits & Info
              <span className="text-gray-500 ml-1">
                (Optional — AI will only include this.)
              </span>
            </label>
            <textarea
              name="additional_info"
              value={formData.additional_info}
              onChange={handleChange}
              placeholder="e.g., Health insurance, Petrol allowance, Flexible hours, Remote work, Annual bonus..."
              rows={3}
              className="w-full bg-black/30 border border-[#05DC7F]/20 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#05DC7F] transition resize-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="relative self-start flex items-center justify-center gap-2 min-w-[180px] h-[42px] bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold px-6 rounded-xl shadow-[0_0_12px_rgba(5,220,127,0.35)] transition overflow-hidden disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center gap-2 z-10">
              <span className="text-black text-[10px] font-mono tracking-widest whitespace-nowrap">
                AI GENERATING
              </span>
              <div className="flex items-center gap-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="block w-[4px] h-[4px] rounded-full bg-black"
                    style={{
                      animation: "robotPulse 1.2s ease-in-out infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}
                  />
                ))}
              </div>
              <span
                className="absolute top-0 left-0 h-full w-[50px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none"
                style={{ animation: "scanLine 1.5s linear infinite" }}
              />
            </div>
          ) : (
            "Generate Job Post"
          )}
        </button>
      </form>

      {/* Generated Job Preview */}
      {generatedJob && (
        <div className="mt-6 p-5 rounded-xl border border-[#05DC7F]/30 bg-black/40">
          <h4 className="text-[#05DC7F] font-semibold text-lg mb-3">
            ✅ {generatedJob.title} — AI Generated
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
            {generatedJob.full_description?.substring(0, 500)}...
          </p>
          <div className="mt-3">
            <span className="text-gray-400 text-xs">Keywords: </span>
            <span className="text-[#05DC7F] text-xs">
              {generatedJob.keywords}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes robotPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.5); }
          50% { opacity: 1; transform: scaleY(1.6); }
        }
        @keyframes scanLine {
          0% { left: -50px; }
          100% { left: 110%; }
        }
      `}</style>
    </div>
  );
}
