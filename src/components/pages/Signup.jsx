import { useState } from "react";
import { useNavigate } from "react-router-dom";
import bgGlow from "../../images/bg.png";
import logo from "../../images/logo.png";

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    setSuccess("");

    if (!fullName || !email || !company || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/ceo-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          company_name: company,
          password: password,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Signup failed");
        setLoading(false);
        return;
      }

      setSuccess("The request has been sent! Please wait for admin approval.");
      setTimeout(() => navigate("/"), 3000);
    } catch (err) {
      setError("The connection to the server could not be established.");
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#1F1F1F] overflow-hidden flex items-center justify-center px-4">
      <div
        className="absolute pointer-events-none left-0 bottom-0 w-[700px] h-[700px]"
        style={{
          backgroundImage: `url(${bgGlow})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "1100px",
          transform: "translate(-28%, 40%) rotate(80.48deg)",
          borderRadius: "50%",
          opacity: 1.7,
        }}
      />

      <div className="absolute z-20 top-4 left-1/2 -translate-x-1/2 md:left-4 md:translate-x-0">
        <img src={logo} alt="Agentra Logo" className="w-24 sm:w-28 md:w-32" />
      </div>

      <div className="relative z-10 w-full max-w-[480px] rounded-[56px] sm:rounded-[70px] border border-white/20 bg-transparent backdrop-blur-[41px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-6 sm:px-8 py-6 sm:py-8">
        <h1 className="text-white text-[30px] sm:text-[38px] font-bold text-center mb-6">
          Create <br /> Account
        </h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 text-sm rounded-xl px-4 py-3 mb-4 text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-[#05DC7F]/20 border border-[#05DC7F] text-[#05DC7F] text-sm rounded-xl px-4 py-3 mb-4 text-center">
            {success}
          </div>
        )}

        {/* Full Name */}
        <div className="flex items-center h-[48px] sm:h-[52px] border-2 border-[#DBE3E6] rounded-[12px] mb-4 hover:border-[#05DC7F]">
          <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="flex-1 px-4 bg-transparent text-white focus:outline-none"
          />
        </div>

        {/* Email */}
        <div className="flex items-center h-[48px] sm:h-[52px] border-2 border-[#DBE3E6] rounded-[12px] mb-4 hover:border-[#05DC7F]">
          <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-4 bg-transparent text-white focus:outline-none"
          />
        </div>

        {/* Company Name */}
        <div className="flex items-center h-[48px] sm:h-[52px] border-2 border-[#DBE3E6] rounded-[12px] mb-4 hover:border-[#05DC7F]">
          <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
          <input
            type="text"
            placeholder="Company Name"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="flex-1 px-4 bg-transparent text-white focus:outline-none"
          />
        </div>

        {/* Password */}
        <div className="flex items-center h-[48px] sm:h-[52px] border-2 border-[#DBE3E6] rounded-[12px] mb-4 hover:border-[#05DC7F]">
          <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-4 bg-transparent text-white focus:outline-none"
          />
        </div>

        {/* Confirm Password */}
        <div className="flex items-center h-[48px] sm:h-[52px] border-2 border-[#DBE3E6] rounded-[12px] mb-5 hover:border-[#05DC7F]">
          <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="flex-1 px-4 bg-transparent text-white focus:outline-none"
          />
        </div>

        {/* ──── Animated REGISTER BUTTON ──── */}
        <div className="flex justify-center">
          <button
            onClick={handleSignup}
            disabled={loading}
            className="relative w-full sm:w-[200px] h-[42px] flex items-center justify-center border border-[#05DC7F] text-[#05DC7F] rounded-[14px] hover:bg-[#05DC7F] hover:text-black transition overflow-hidden disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2 z-10">
                <span className="text-[#05DC7F] text-[9px] font-mono tracking-widest whitespace-nowrap">
                  CREATING ACCOUNT
                </span>
                <div className="flex items-center gap-[3px]">
                  {[0, 1, 2, 3].map((i) => (
                    <span
                      key={i}
                      className="block w-[4px] h-[4px] rounded-full bg-[#05DC7F]"
                      style={{
                        animation: "robotPulse 1.2s ease-in-out infinite",
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
                <span
                  className="absolute top-0 left-0 h-full w-[50px] bg-gradient-to-r from-transparent via-[#05DC7F]/25 to-transparent pointer-events-none"
                  style={{ animation: "scanLine 1.5s linear infinite" }}
                />
              </div>
            ) : (
              <span className="font-semibold tracking-widest">REGISTER</span>
            )}
          </button>
        </div>

        {/* LOGIN LINK */}
        <p className="text-center text-white/70 text-sm mt-5">
          Already have an account?{" "}
          <span
            onClick={() => navigate("/")}
            className="text-[#05DC7F] cursor-pointer hover:underline"
          >
            Login
          </span>
        </p>
      </div>

      <div className="absolute bottom-3 right-4 text-white/70 text-xs sm:text-sm text-right">
        AI-powered HR & Agent <br />
        Management System
      </div>

      {/* ──── Global Animations ──── */}
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
