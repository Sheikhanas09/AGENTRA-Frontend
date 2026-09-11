"use client";
import { useState } from "react";
import logo from "../../images/logo.png";

export default function Layout({ sidebar, navbar, content }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="relative w-full h-screen flex overflow-hidden bg-transparent">
      {/* ===== BASE BACKGROUND COLOR ===== */}
      <div className="absolute inset-0 -z-20 bg-[#1F1F1F]" />

      {/* ===== EXTRA LITE NEON GRADIENT GLOW (SAME AS BEFORE) ===== */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(5,220,127,0.05) 0%, transparent 70%),
            radial-gradient(circle at 70% 20%, rgba(5,220,127,0.04) 0%, transparent 70%),
            radial-gradient(circle at 50% 50%, rgba(5,220,127,0.03) 0%, transparent 80%)
          `,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          filter: "blur(100px)",
        }}
      />

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className="
          hidden lg:flex
          fixed left-0 top-0 h-full w-64
          backdrop-blur-sm
          border-r border-[#05DC7F]/30
          flex flex-col
        "
      >
        {/* LOGO */}
        <div className="h-24 lg:h-32 flex items-center justify-center border-b border-[#05DC7F]/25">
          <div className="w-20 h-20 lg:w-28 lg:h-28 rounded-full flex items-center justify-center shadow-[0_0_18px_rgba(5,220,127,0.35)] hover:scale-105 transition-transform duration-300">
            <img
              src={logo}
              alt="AGENTRA Logo"
              className="w-16 h-16 lg:w-24 lg:h-24 object-contain"
            />
          </div>
        </div>

        {/* SIDEBAR CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {sidebar}
        </div>

        {/* FOOTER */}
        <div className="h-12 flex items-center justify-center border-t border-[#05DC7F]/25 text-[#05DC7F]/45 text-xs">
          © 2026 AGENTRA
        </div>
      </aside>

      {/* ===== MOBILE SIDEBAR ===== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] bg-[#1F1F1F] backdrop-blur-sm border-r border-[#05DC7F]/30 flex flex-col transform transition-transform duration-300 lg:hidden ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <div className="h-24 flex items-center justify-center border-b border-[#05DC7F]/25">
          <div className="w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_18px_rgba(5,220,127,0.35)] hover:scale-105 transition-transform duration-300">
            <img
              src={logo}
              alt="AGENTRA Logo"
              className="w-16 h-16 object-contain"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {sidebar}
        </div>

        <div className="h-12 flex items-center justify-center border-t border-[#05DC7F]/25 text-[#05DC7F]/45 text-xs">
          © 2026 AGENTRA
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 flex flex-col h-full overflow-y-auto p-4 sm:p-5 lg:p-6 lg:ml-64">
        {/* Hamburger for mobile */}
        <div className="lg:hidden flex items-center gap-3 mb-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open menu"
            className="w-10 h-10 flex-none grid place-items-center rounded-xl border border-[#05DC7F]/30 text-[#05DC7F] hover:bg-[#05DC7F]/10 active:scale-95 transition"
          >
            <span className="text-xl leading-none">☰</span>
          </button>
          <img src={logo} alt="AGENTRA" className="h-7 w-auto opacity-80" />
        </div>

        {/* NAVBAR */}
        {navbar}

        {/* CONTENT */}
        <div className="flex-1 mt-4">{content}</div>
      </main>
    </div>
  );
}
