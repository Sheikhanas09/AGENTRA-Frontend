import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo.png";
import bgGlow from "../../images/bg.png";

export default function JobPortal() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:8000/recruitment/public/jobs",
        );
        const data = await response.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("Jobs fetch error:", err);
      }
      setLoading(false);
    };
    fetchJobs();
  }, []);

  const filteredJobs = jobs.filter(
    (job) =>
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.department?.toLowerCase().includes(search.toLowerCase()) ||
      job.skills?.toLowerCase().includes(search.toLowerCase()),
  );

  const handleApplyNow = (job) => {
    const subject = encodeURIComponent(
      `Application for ${job.title} — ${job.company_name}`,
    );
    const body = encodeURIComponent(
      `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company_name}.`,
    );
    const toEmail = job.ceo_email || "";
    window.open(
      `https://mail.google.com/mail/?view=cm&to=${toEmail}&su=${subject}&body=${body}`,
      "_blank",
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-[#0d0d0d] overflow-x-hidden">
      {/* ──── Background Glow ──── */}
      <div
        className="fixed pointer-events-none left-0 bottom-0 w-[600px] h-[600px] sm:w-[800px] sm:h-[800px] opacity-60"
        style={{
          backgroundImage: `url(${bgGlow})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          transform: "translate(-30%, 40%) rotate(80deg)",
        }}
      />
      <div
        className="fixed pointer-events-none right-0 top-0 w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] opacity-30"
        style={{
          backgroundImage: `url(${bgGlow})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          transform: "translate(30%, -40%) rotate(260deg)",
        }}
      />

      {/* ──── Navbar ──── */}
      <nav className="relative z-20 flex justify-between items-center px-4 sm:px-8 py-4 border-b border-white/10 backdrop-blur-sm bg-black/20">
        <img src={logo} alt="Agentra" className="w-24 sm:w-32" />
        <div className="flex items-center gap-3">
          <span className="hidden sm:block text-gray-400 text-sm">
            {jobs.length} open positions
          </span>
          <button
            onClick={() => navigate("/")}
            className="text-[#05DC7F] border border-[#05DC7F]/40 px-3 sm:px-5 py-1.5 sm:py-2 rounded-xl text-sm font-medium hover:bg-[#05DC7F] hover:text-black transition"
          >
            Login
          </button>
        </div>
      </nav>

      {/* ──── Hero Section ──── */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 pt-10 sm:pt-16 pb-6 sm:pb-10">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-white text-3xl sm:text-4xl lg:text-5xl font-bold mb-3">
            Find Your Next
            <span className="text-[#05DC7F]"> Opportunity</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
            Browse open positions and join innovative teams
          </p>

          {/* Search Bar */}
          <div className="mt-6 max-w-xl mx-auto">
            <div className="flex items-center bg-black/40 border border-[#05DC7F]/20 rounded-2xl px-4 py-3 focus-within:border-[#05DC7F]/60 transition backdrop-blur-sm">
              <svg
                className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by title, department, or skills..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-white text-sm focus:outline-none placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* ──── Loading ──── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="flex gap-[5px]">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="block w-[6px] h-[6px] rounded-full bg-[#05DC7F]"
                  style={{
                    animation: "robotPulse 1.2s ease-in-out infinite",
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-gray-400 text-sm">Loading positions...</p>
          </div>
        )}

        {/* ──── No Jobs ──── */}
        {!loading && filteredJobs.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg">
              {search
                ? "Koi result nahi mila"
                : "Abhi koi position available nahi"}
            </p>
          </div>
        )}

        {/* ──── Jobs Grid ──── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {filteredJobs.map((job) => (
            <div
              key={job.id}
              className="group p-5 sm:p-6 rounded-2xl border border-white/10 bg-black/30 backdrop-blur-sm hover:border-[#05DC7F]/40 hover:bg-black/50 hover:shadow-[0_0_20px_rgba(5,220,127,0.1)] transition-all duration-300"
            >
              {/* Job Header */}
              <div className="flex justify-between items-start gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                    {job.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {job.company_name} • {job.department}
                  </p>
                </div>
                <span className="flex-shrink-0 px-2 py-1 rounded-lg bg-[#05DC7F]/10 border border-[#05DC7F]/30 text-[#05DC7F] text-xs font-medium">
                  {job.employment_type}
                </span>
              </div>

              {/* Info Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs">
                  📅 {job.experience} exp
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-300 text-xs">
                  💰 {job.salary_range}
                </span>
              </div>

              {/* Skills */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {job.skills
                  ?.split(",")
                  .slice(0, 4)
                  .map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs"
                    >
                      {skill.trim()}
                    </span>
                  ))}
                {job.skills?.split(",").length > 4 && (
                  <span className="px-2 py-0.5 rounded-full bg-white/5 text-gray-400 text-xs">
                    +{job.skills.split(",").length - 4} more
                  </span>
                )}
              </div>

              {/* ──── Action Buttons ──── */}
              <div className="flex gap-2 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    setSelectedJob(job);
                    setShowApplyForm(false);
                  }}
                  className="flex-1 py-2 rounded-xl border border-gray-600 text-gray-300 text-sm hover:border-[#05DC7F]/50 hover:text-[#05DC7F] transition"
                >
                  View Details
                </button>
                <button
                  onClick={() => handleApplyNow(job)}
                  className="flex-1 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:bg-[#04c56f] hover:shadow-[0_0_12px_rgba(5,220,127,0.4)] transition"
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-10 sm:mt-16 pb-6">
          <p className="text-gray-500 text-xs sm:text-sm">
            Powered by <span className="text-[#05DC7F]">Agentra</span> —
            AI-powered HR & Agent Management System
          </p>
        </div>
      </div>

      {/* ──── Modal ──── */}
      {selectedJob && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          />
          <div className="relative bg-[#0d0d0d] w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-[#05DC7F]/20 shadow-[0_0_40px_rgba(5,220,127,0.15)] flex flex-col max-h-[92vh] sm:max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-start px-5 sm:px-6 py-4 border-b border-white/10">
              <div className="flex-1 min-w-0 mr-3">
                <h3 className="text-white font-bold text-base sm:text-lg truncate">
                  {selectedJob.title}
                </h3>
                <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
                  {selectedJob.company_name} • {selectedJob.department} •{" "}
                  {selectedJob.employment_type}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-white text-xl flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10">
              <button
                onClick={() => setShowApplyForm(false)}
                className={`flex-1 sm:flex-none px-5 sm:px-8 py-3 text-sm font-medium transition border-b-2 ${!showApplyForm ? "text-[#05DC7F] border-[#05DC7F]" : "text-gray-400 border-transparent hover:text-white"}`}
              >
                Job Details
              </button>
              <button
                onClick={() => setShowApplyForm(true)}
                className={`flex-1 sm:flex-none px-5 sm:px-8 py-3 text-sm font-medium transition border-b-2 ${showApplyForm ? "text-[#05DC7F] border-[#05DC7F]" : "text-gray-400 border-transparent hover:text-white"}`}
              >
                Apply via Email
              </button>
            </div>

            {/* Modal Content */}
            <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4">
              {!showApplyForm ? (
                <div>
                  <pre className="text-gray-300 text-sm leading-relaxed whitespace-pre-line break-words font-sans">
                    {selectedJob.full_description}
                  </pre>
                  {/* Apply button inside modal */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <button
                      onClick={() => handleApplyNow(selectedJob)}
                      className="w-full py-3 rounded-xl bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] hover:shadow-[0_0_20px_rgba(5,220,127,0.4)] transition"
                    >
                      Apply Now via Gmail →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 py-2">
                  <div className="p-4 rounded-xl bg-[#05DC7F]/5 border border-[#05DC7F]/20">
                    <h4 className="text-white font-semibold mb-1">
                      {selectedJob.title}
                    </h4>
                    <p className="text-gray-400 text-sm">
                      {selectedJob.company_name}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Click the button below to open Gmail with a pre-filled
                      email. Attach your CV as PDF and send it to apply.
                    </p>
                  </div>
                  <button
                    onClick={() => handleApplyNow(selectedJob)}
                    className="w-full py-3 rounded-xl bg-[#05DC7F] text-black font-semibold hover:bg-[#04c56f] hover:shadow-[0_0_20px_rgba(5,220,127,0.4)] transition flex items-center justify-center gap-2"
                  >
                    <span>Open Gmail to Apply</span>
                    <span>→</span>
                  </button>
                  <p className="text-gray-500 text-xs text-center">
                    Gmail will open with pre-filled subject and message. Attach
                    your CV as PDF before sending.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes robotPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.5); }
          50% { opacity: 1; transform: scaleY(1.6); }
        }
      `}</style>
    </div>
  );
}
