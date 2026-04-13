import { useState } from "react";
import bgGlow from "../../images/bg.png";
import logo from "../../images/logo.png";
import SplashScreen from "./SplashScreen";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem("role", data.role);
      localStorage.setItem("full_name", data.full_name);

      if (data.role === "superadmin") navigate("/admin/dashboard");
      else if (data.role === "ceo") navigate("/ceo/dashboard");
      else if (data.role === "employee") navigate("/employee/dashboard");
    } catch (err) {
      setError("The connection to the server could not be established.");
    }

    setLoading(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="relative min-h-screen w-full bg-[#1F1F1F] overflow-hidden">
      <div
        className="absolute pointer-events-none left-0 bottom-0 w-[600px] h-[600px] sm:w-[700px] sm:h-[700px] lg:w-[800px] lg:h-[800px]"
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
        <img
          src={logo}
          alt="Agentra Logo"
          className="w-24 sm:w-28 md:w-32 lg:w-42"
        />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6">
        <div className="w-full max-w-[520px] rounded-[56px] sm:rounded-[76px] border border-white/20 bg-transparent backdrop-blur-[41px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] px-6 sm:px-10 py-10 sm:py-12">
          <h1 className="text-white text-[32px] sm:text-[44px] font-bold text-center mb-8">
            Welcome <br /> Back!
          </h1>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-400 text-sm rounded-xl px-4 py-3 mb-5 text-center">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="flex items-center h-[54px] sm:h-[58px] border-2 border-[#DBE3E6] rounded-[12px] mb-5 hover:border-[#05DC7F]">
            <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-4 bg-transparent text-white focus:outline-none"
            />
          </div>

          {/* Password */}
          <div className="flex items-center h-[54px] sm:h-[58px] border-2 border-[#DBE3E6] rounded-[12px] mb-7 hover:border-[#05DC7F]">
            <div className="w-[12px] h-full bg-[#05DC7F] rounded-[7px]" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 px-4 bg-transparent text-white focus:outline-none"
            />
          </div>

          {/* Remember + Forgot */}
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4 text-sm text-white/70 mb-8">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="accent-emerald-400" /> Remember
              me
            </label>
            <button className="hover:text-[#05DC7F] transition-colors">
              Forgot Password?
            </button>
          </div>

          {/* ──── Animated LOGIN BUTTON ──── */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="relative w-full sm:w-[160px] h-[44px] mx-auto flex items-center justify-center border border-[#05DC7F] text-[#05DC7F] rounded-[14px] hover:bg-[#05DC7F] hover:text-black transition overflow-hidden disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center gap-2 z-10">
                <span className="text-[#05DC7F] text-[10px] font-mono tracking-widest">
                  AUTHENTICATING
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
                {/* ──── Scanning line ──── */}
                <span
                  className="absolute top-0 left-0 h-full w-[50px] bg-gradient-to-r from-transparent via-[#05DC7F]/25 to-transparent pointer-events-none"
                  style={{ animation: "scanLine 1.5s linear infinite" }}
                />
              </div>
            ) : (
              <span className="font-semibold tracking-widest">LOGIN</span>
            )}
          </button>

          {/* SIGNUP LINK */}
          <p className="text-center text-white/70 text-sm mt-6">
            Don't have an account?{" "}
            <span
              onClick={() => navigate("/signup")}
              className="text-[#05DC7F] cursor-pointer hover:underline"
            >
              Sign Up
            </span>
          </p>
        </div>
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
