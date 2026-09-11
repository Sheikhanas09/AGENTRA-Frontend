/**
 * Home — jo pehla safha hai
 * ─────────────────────────
 * Pehle website khulte hi splash aati thi aur us ke baad SEEDHA login.
 * Yani jo shakhs abhi tak faisla nahi kar chuka, us ke saamne pehla
 * sawal "email aur password" tha — us se pehle yeh bataye baghair ke
 * cheez hai kya.
 *
 * Ab splash is safhe se pehle aati hai (neeche `showSplash`), aur login
 * ek raasta hai — manzil nahi.
 *
 * ═══════════════════════════════════════════════════════════
 * SHAKAL WAHI HAI JO BAQI APP KI HAI
 * ═══════════════════════════════════════════════════════════
 * Rang, glow, glass cards aur bara radius — sab `Login.jsx` se liye
 * gaye hain, kyunke agla safha wohi hai. Ek landing page jo apne hi
 * product se alag dikhe, wo aitmaad kam karta hai, barhata nahi.
 *
 *     bg-[#1F1F1F]          poori app ka background
 *     #05DC7F               accent (tokens.js)
 *     bg.png                wohi ghooma hua glow
 *     border-white/20 +     wohi glass card
 *     backdrop-blur
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠ JO LIKHA HAI WO SACH HAI
 * ═══════════════════════════════════════════════════════════
 * Har feature is repo mein waqai mojood hai. Landing pages par jhoot
 * likhna aasan hota hai aur us ki qeemat pehle demo par milti hai —
 * jahan koi wo cheez maangta hai jo hai hi nahi.
 *
 * ═══════════════════════════════════════════════════════════
 * MATN ANGREZI MEIN — AUR YEH POORE SYSTEM KA USOOL HAI
 * ═══════════════════════════════════════════════════════════
 * Product ki zaban English hai: safhe, buttons, error messages, sab.
 * Sirf CHAT alag hai — wo us zaban mein jawab deti hai jis mein CEO
 * likhta hai, aur wo faisla `decide_language` karta hai.
 *
 * Yeh safha chat nahi hai, to yahan koi zaban ka faisla nahi — English.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  Fingerprint,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import bgGlow from "../../images/bg.png";
import HrBot from "./HrBot";
import logo from "../../images/logo.png";
import SplashScreen from "./SplashScreen";

const ACCENT = "#05DC7F";

// Har ek wo hai jo repo mein waqai bana hua hai.
const FEATURES = [
  {
    icon: Users,
    title: "Recruitment",
    body:
      "From job post to offer letter. CVs arrive from the mailbox, get " +
      "screened, and reach the shortlist already ranked.",
  },
  {
    icon: Fingerprint,
    title: "Attendance",
    body:
      "Face check-in with office location verified. Shift hours, late " +
      "tolerance and overtime all come from the company's own policy.",
  },
  {
    icon: CalendarCheck,
    title: "Leave",
    body:
      "The company uploads its own policy PDF, and every request is " +
      "read against it. Balance, entitlement and approval in one place.",
  },
  {
    icon: Wallet,
    title: "Payroll",
    body:
      "Each company picks its own payday, and payroll runs itself that " +
      "morning for the month just gone. Payslip PDFs go out by email.",
  },
  {
    icon: Bot,
    title: "HR Console",
    body:
      "Ask about the company and the answer comes from its own records. " +
      "It acts too — approve leave, resend a payslip — each one behind " +
      "a confirmation.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp",
    body:
      "The same console on the CEO's phone. The number is linked once, " +
      "and their role is checked again on every single message.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create your company",
    body:
      "Sign up. Once approved, your company has its own space — your " +
      "people, your data, your policy.",
  },
  {
    n: "02",
    title: "Upload your policy",
    body:
      "Your leave and work policy PDFs. Decisions are read from those, " +
      "not from some rule we picked for you.",
  },
  {
    n: "03",
    title: "Add your team",
    body:
      "Add employees. They can see their own attendance, leave and " +
      "payslips from their own help desk.",
  },
];

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  // ⚠ Splash ab YAHAN hai, `Login.jsx` mein nahi.
  // Wo is safhe se pehle aati thi kyunke `/` par login tha. Ab `/` par
  // yeh safha hai, to splash bhi yahin — warna wo har dafa login par
  // aati aur home par kabhi nahi.
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <div className="relative min-h-screen w-full bg-[#1F1F1F] overflow-x-hidden">
      {/* Wohi glow jo login/signup par hai — sirf doosri taraf, taake
          hero ka matn us ke upar na aaye. */}
      <div
        className="absolute pointer-events-none right-0 top-0 w-[600px] h-[600px] sm:w-[760px] sm:h-[760px] lg:w-[900px] lg:h-[900px]"
        style={{
          backgroundImage: `url(${bgGlow})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "1100px",
          transform: "translate(30%, -34%) rotate(24deg)",
          borderRadius: "50%",
          opacity: 1.4,
        }}
      />
      <div
        className="absolute pointer-events-none left-0 bottom-0 w-[500px] h-[500px] lg:w-[700px] lg:h-[700px]"
        style={{
          backgroundImage: `url(${bgGlow})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "900px",
          transform: "translate(-34%, 38%) rotate(80deg)",
          borderRadius: "50%",
          opacity: 0.9,
        }}
      />

      {/* ──── Nav ──── */}
      <header className="relative z-20 max-w-[1180px] mx-auto px-5 sm:px-8 pt-5 flex items-center justify-between gap-4">
        <img src={logo} alt="Agentra" className="w-24 sm:w-28 lg:w-32" />

        <nav className="hidden md:flex items-center gap-8 text-[13.5px] text-white/60">
          <a href="#features" className="hover:text-white transition">
            Features
          </a>
          <a href="#how" className="hover:text-white transition">
            How it works
          </a>
          <button
            onClick={() => navigate("/jobs")}
            className="hover:text-white transition"
          >
            Careers
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => navigate("/login")}
            className="px-4 sm:px-5 py-2 rounded-full text-[13.5px] text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition"
          >
            Login
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-4 sm:px-5 py-2 rounded-full text-[13.5px] font-semibold text-black bg-[#05DC7F] hover:brightness-110 transition"
          >
            Get started
          </button>
        </div>
      </header>

      {/* ──── Hero ──── */}
      {/* Do column: baat baayen, bot daayen. `lg` se neeche bot matn ke
          NEECHE aata hai, us ke aage nahi — chhoti screen par pehli cheez
          wo jumla hona chahiye jo batata hai yeh hai kya. */}
      <section className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 pt-14 sm:pt-20 pb-12 grid lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-8 items-center">
        <div className="max-w-[640px]">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#05DC7F]/35 bg-[#05DC7F]/10 text-[#05DC7F] text-[12px] font-medium mb-7">
            <Sparkles size={13} />
            HR that does the work
          </div>

          <h1 className="text-white font-bold leading-[1.06] tracking-tight text-[38px] sm:text-[54px] lg:text-[64px]">
            Your company&rsquo;s
            <br />
            <span style={{ color: ACCENT }}>entire HR</span>, in one place.
          </h1>

          <p className="mt-6 text-white/60 text-[15.5px] sm:text-[17px] leading-relaxed max-w-[600px]">
            Hiring through payroll &mdash; CV screening, attendance, leave,
            salaries, and a console that answers from your own records.
            Every company&rsquo;s data stays entirely its own.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/signup")}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-full text-[14.5px] font-semibold text-black bg-[#05DC7F] hover:brightness-110 transition"
            >
              Create your company
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
            <button
              onClick={() => navigate("/jobs")}
              className="px-6 py-3 rounded-full text-[14.5px] text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition"
            >
              Looking for a job?
            </button>
          </div>
        </div>

        {/* ──── Bot ──── */}
        {/* Pehle is ke neeche ek console preview bhi tha. Hata
            diya gaya: do cheezein ek doosre se tawajjo cheen rahi
            thin, aur bot khud hi yeh keh deta hai ke yeh HR hai.
            Jo wo karta hai, wo neeche feature cards batate hain. */}
        <div className="relative flex justify-center lg:justify-end">
          <HrBot />
        </div>
      </section>

      {/* ──── Wo cheezein jo ginI ja sakti hain ──── */}
      {/* ⚠ Yeh chaar figures repo se hain, banaye hue nahi: 35 read
          tools + 8 actions (`console_actions.REGISTRY`), do channels
          (web + WhatsApp), aur do deewarein (ORM guard + Postgres RLS).
          Landing page par ek jhoota number likhna aasan hai aur us ki
          qeemat pehle sawal par milti hai. */}
      <section className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 pb-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-[24px] overflow-hidden border border-white/10 bg-white/[0.06]">
          {[
            ["35", "things it can look up"],
            ["8", "things it can do for you"],
            ["2", "ways to reach it"],
            ["2", "walls around your data"],
          ].map(([n, label]) => (
            <div key={label} className="bg-[#1F1F1F] px-5 py-6 text-center">
              <div className="text-[#05DC7F] text-[26px] font-bold leading-none">
                {n}
              </div>
              <div className="mt-2 text-white/45 text-[12px] leading-snug">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Features ──── */}
      <section
        id="features"
        className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 py-14 sm:py-20"
      >
        <h2 className="text-white text-[26px] sm:text-[34px] font-bold tracking-tight">
          What is inside
        </h2>
        <p className="mt-3 text-white/50 text-[15px] max-w-[560px]">
          Not separate tools &mdash; one system, where every part already
          knows what the others hold.
        </p>

        <div className="mt-10 grid gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* ⚠ `f.icon` — destructure kar ke `<Icon/>` likhna zyada saaf
              lagta hai, magar is repo mein `eslint-plugin-react` hai
              hi nahi, to JSX ke andar us ka istemal eslint ko nazar
              nahi aata aur wo usay "unused" keh deta hai. Dotted naam
              JSX mein bilkul jaiz hai aur us masle se bachta hai. */}
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-[26px] border border-white/12 bg-white/[0.03] backdrop-blur-[18px] p-6 hover:border-[#05DC7F]/35 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#05DC7F]/12 border border-[#05DC7F]/25 flex items-center justify-center mb-4">
                <f.icon size={18} className="text-[#05DC7F]" />
              </div>
              <h3 className="text-white text-[16.5px] font-semibold mb-2">
                {f.title}
              </h3>
              <p className="text-white/55 text-[13.5px] leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ──── How it works ──── */}
      <section
        id="how"
        className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 py-14 sm:py-20"
      >
        <h2 className="text-white text-[26px] sm:text-[34px] font-bold tracking-tight">
          How to start
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {STEPS.map(({ n, title, body }) => (
            <div key={n} className="relative">
              <div className="text-[#05DC7F]/35 text-[38px] font-bold leading-none mb-3">
                {n}
              </div>
              <h3 className="text-white text-[17px] font-semibold mb-2">
                {title}
              </h3>
              <p className="text-white/55 text-[13.5px] leading-relaxed max-w-[300px]">
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ──── Tenancy — yeh kehne layak baat hai ──── */}
      <section
        id="security"
        className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 pb-14 sm:pb-20"
      >
        <div className="rounded-[32px] border border-white/12 bg-white/[0.03] backdrop-blur-[18px] p-7 sm:p-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-12 h-12 rounded-2xl bg-[#05DC7F]/12 border border-[#05DC7F]/25 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} className="text-[#05DC7F]" />
          </div>
          <div>
            <h3 className="text-white text-[18px] sm:text-[20px] font-semibold mb-2">
              Every company&rsquo;s data stays its own
            </h3>
            <p className="text-white/55 text-[14px] leading-relaxed max-w-[720px]">
              Every row carries the company it belongs to, and the database
              enforces that boundary itself &mdash; not just the application
              code. Chats and HR requests are encrypted at rest.
            </p>
          </div>
        </div>
      </section>

      {/* ──── Aakhri CTA ──── */}
      <section className="relative z-10 max-w-[1180px] mx-auto px-5 sm:px-8 pb-20">
        <div className="rounded-[32px] border border-[#05DC7F]/25 bg-[#05DC7F]/[0.07] backdrop-blur-[18px] p-8 sm:p-12 text-center">
          <h2 className="text-white text-[24px] sm:text-[32px] font-bold tracking-tight">
            Start your company
          </h2>
          <p className="mt-3 text-white/55 text-[14.5px] max-w-[520px] mx-auto">
            Sign up, upload your policy, and add your team.
          </p>
          <button
            onClick={() => navigate("/signup")}
            className="mt-7 inline-flex items-center gap-2 px-7 py-3 rounded-full text-[14.5px] font-semibold text-black bg-[#05DC7F] hover:brightness-110 transition"
          >
            Get started
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      {/* ──── Footer ──── */}
      {/* Pehle yahan sirf ek qatar thi: logo, do link, aur copyright.
          Footer wo jagah hai jahan wo shakhs pohanchta hai jo poora
          safha parh chuka aur abhi tak faisla nahi kar saka — us ke
          saamne "Login" rakh dena us ka sawal nahi hai.

          ⚠ Har link yahan ASLI hai: teen anchors un sections ke jo isi
          safhe par hain (#features, #how, #security), aur teen raaste
          jo `App.jsx` mein waqai mojood hain (/signup, /login, /jobs).
          Ek toota hua footer link poore safhe ka aitmaad le jata hai. */}
      <footer className="relative z-10 border-t border-white/10 mt-6">
        <div className="max-w-[1180px] mx-auto px-5 sm:px-8 pt-12 pb-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
            {/* ─ Kaun ─ */}
            <div>
              <img src={logo} alt="Agentra" className="w-24 opacity-80" />
              <p className="mt-4 text-white/45 text-[13.5px] leading-relaxed max-w-[300px]">
                One HR system for the whole company — hiring, attendance,
                leave and payroll — with an assistant that can actually
                do the work, not just look it up.
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#05DC7F]/25 bg-[#05DC7F]/[0.06] px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#05DC7F]" />
                <span className="text-[#05DC7F]/85 text-[11.5px]">
                  Your data never leaves your company
                </span>
              </div>
            </div>

            {/* ─ Safhe ke hissay ─ */}
            <div>
              <h4 className="text-white/85 text-[12px] font-semibold tracking-[0.14em] uppercase">
                Product
              </h4>
              <ul className="mt-4 space-y-2.5 text-[13.5px]">
                <li>
                  <a href="#features" className="text-white/45 hover:text-white/85 transition">
                    What is inside
                  </a>
                </li>
                <li>
                  <a href="#how" className="text-white/45 hover:text-white/85 transition">
                    How to start
                  </a>
                </li>
                <li>
                  <a href="#security" className="text-white/45 hover:text-white/85 transition">
                    Your data
                  </a>
                </li>
              </ul>
            </div>

            {/* ─ Raaste ─ */}
            <div>
              <h4 className="text-white/85 text-[12px] font-semibold tracking-[0.14em] uppercase">
                Get started
              </h4>
              <ul className="mt-4 space-y-2.5 text-[13.5px]">
                <li>
                  <button
                    onClick={() => navigate("/signup")}
                    className="text-white/45 hover:text-white/85 transition"
                  >
                    Create a company
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/login")}
                    className="text-white/45 hover:text-white/85 transition"
                  >
                    Log in
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => navigate("/jobs")}
                    className="text-white/45 hover:text-white/85 transition"
                  >
                    Open positions
                  </button>
                </li>
              </ul>
            </div>

            {/* ─ Do channel ─ asli, `whatsapp.py` aur console dono chaltay hain ─ */}
            <div>
              <h4 className="text-white/85 text-[12px] font-semibold tracking-[0.14em] uppercase">
                Reach your HR
              </h4>
              <ul className="mt-4 space-y-3 text-[13.5px] text-white/45">
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#05DC7F]/70 flex-none" />
                  <span>
                    Web console
                    <span className="block text-white/30 text-[12px]">
                      Inside your dashboard
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#05DC7F]/70 flex-none" />
                  <span>
                    WhatsApp
                    <span className="block text-white/30 text-[12px]">
                      Link your number once
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>

          {/* ─ Neechay ki patti ─ */}
          <div className="mt-12 pt-6 border-t border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-white/30 text-[12.5px]">
              &copy; {new Date().getFullYear()} Agentra. All rights reserved.
            </span>
            <span className="text-white/25 text-[12.5px]">
              Built for one company at a time.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
