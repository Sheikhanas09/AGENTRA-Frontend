// ══════════════════════════════════════════════
// WhatsApp — CEO apna number jorta hai
// ══════════════════════════════════════════════
// Teen halatein:
//
//   none     -> "Connect WhatsApp", phir number ka input
//   pending  -> 6-ainde ka code, aur us ka intezar
//   active   -> juda hua number + Disconnect
//
// ⚠ CODE SIRF EK DAFA AATA HAI.
// Wo `POST /hr/whatsapp/link` ke jawab mein hai aur kahin aur nahi —
// `GET` usay kabhi nahi deta, database mein sirf us ka sha256 digest
// hai. Isliye yahan wo jaan-boojh kar SIRF component ke andar rehta
// hai: na localStorage, na sessionStorage, na URL, na console.log.
//
// Safha refresh hone par wo chala jata hai aur naya banwana parta hai.
// Yeh takleef hai, magar us ka badal yeh hota ke code kisi aisi jagah
// para rehta jahan se wo baad mein parha ja sake — aur us surat mein
// 10-minute wali TTL ka koi matlab nahi bachta.
//
// Isi liye Agentra ka number bhi yahan likha hua nahi — `GET` se aata
// hai, jo usay `.env` se parhta hai. Test number se asli number par
// jate waqt ek jagah badal kar doosri bhool jana theek us qism ki
// ghalti hai jo yeh project pehle bhugat chuka hai.

import { useCallback, useEffect, useRef, useState } from "react";
import { FaWhatsapp, FaCopy, FaCheck } from "react-icons/fa";

const API = "http://127.0.0.1:8000";

// Backend ke `phone_problem` wali hi shart. Client par isliye ke CEO ko
// jawab foran mile, server par isliye ke client par lagi hui koi shart
// shart nahi hoti — koi bhi seedha API par bhej sakta hai.
const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

function onlyDigits(s) {
  return (s || "").replace(/\D/g, "");
}

// ⚠ "8-15 digits" AKELA KAAFI NAHI THA.
// `03065342421` gyarah ainde ka hai aur us shart se guzar jata tha. Wo
// LOCAL shakal hai, E.164 nahi — aur inbound webhook par Meta hamesha
// E.164 deta hai (`923065342421`), to aisi row kabhi match nahi karti.
// CEO code bhejta rehta, kuch na hota, aur wajah kahin nazar na aati.
//
// Ek asli row is se ban chuki thi: 03065342421, pending, kabhi na juri.
//
// Country code khud se lagana yahan bhi ghalat hoga: is database ke
// liye theek nikalta aur agle mulk mein kisi AUR ka number jor deta.
function phoneProblem(digits) {
  if (!digits) return "Please enter a number.";
  if (digits.startsWith("0"))
    return "Include the country code and do not start with 0 — for example 923065342421 instead of 03065342421.";
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS)
    return `A number must be ${MIN_DIGITS}–${MAX_DIGITS} digits with the country code (for example 923001234567).`;
  return "";
}

export default function WhatsAppLink() {
  const token = localStorage.getItem("token");

  const [status, setStatus] = useState(null); // null = abhi load ho raha
  const [phone, setPhone] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // ⚠ Code SIRF yahan. Ye state kabhi persist nahi hoti.
  const [code, setCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/whatsapp/link`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) {
        setError("This is for the CEO only.");
        setStatus({ status: "none", linked: false });
        return null;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setStatus(data);
      return data;
    } catch {
      setError("Could not reach the server.");
      return null;
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // ──── Polling: pending se active tak ────
  // Sirf tab chalti hai jab code zinda ho, aur TTL khatam hote hi ruk
  // jati hai. Jab tab peeche chali jaye tab bhi ruk jati hai —
  // `document.hidden` — kyunke ek chhupi hui tab ka har teen second
  // server ko poochna faltu hai.
  const pollRef = useRef(null);
  useEffect(() => {
    const pending = status?.status === "pending" && secondsLeft > 0;
    if (!pending) {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return undefined;
    }
    pollRef.current = setInterval(async () => {
      if (document.hidden) return;
      const data = await load();
      if (data?.status === "active") {
        setCode("");
        setSecondsLeft(0);
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [status?.status, secondsLeft, load]);

  // ──── TTL countdown ────
  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const connect = async (e) => {
    e?.preventDefault();
    setError("");
    const digits = onlyDigits(phone);
    const problem = phoneProblem(digits);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/hr/whatsapp/link`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: digits }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // 400 = number kisi aur se juda, ya shakal ghalat.
        // 403 = CEO nahi.
        setError(
          data.detail ||
            (res.status === 403
              ? "This is for the CEO only."
              : "The code could not be created."),
        );
        return;
      }
      setCode(data.code || "");
      setSecondsLeft((data.expires_in_minutes || 10) * 60);
      setShowForm(false);
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (
      !window.confirm(
        "Disconnect WhatsApp? No further replies will go to that number.",
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/hr/whatsapp/link`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error(String(res.status));
      setCode("");
      setSecondsLeft(0);
      await load();
    } catch {
      setError("Could not disconnect.");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard mana kar de to code screen par likha hi hua hai */
    }
  };

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="bg-black/40 border border-[#05DC7F]/20 rounded-2xl p-6 mt-6">
      <div className="flex items-center gap-2 mb-2">
        <FaWhatsapp className="text-[#05DC7F]" size={20} />
        <h2 className="text-white text-xl font-bold">WhatsApp</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6 leading-relaxed">
        Link your WhatsApp and ask the same questions from there that you
        ask here in the console — headcount, attendance, leave, payroll.
        <br />
        <br />
        Replies only ever go to the number you link yourself. Your role is
        checked again on every message, so the link stops working on its own
        if you are no longer the CEO.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      {status === null ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : /* ══════════ STATE 3 — jur gaya ══════════ */
      status.linked ? (
        <>
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#05DC7F]/10 border border-[#05DC7F]/30 mb-4">
            <span className="text-[#05DC7F] text-lg leading-none">●</span>
            <div>
              <div className="text-white font-semibold">
                Jura hua — •••• {status.phone_tail}
              </div>
              <div className="text-gray-400 text-xs mt-1">
                {status.verified_at
                  ? `${status.verified_at.slice(0, 16).replace("T", " ")} se`
                  : ""}
                {status.last_message_at
                  ? ` · aakhri message ${status.last_message_at
                      .slice(0, 16)
                      .replace("T", " ")}`
                  : ""}
              </div>
            </div>
          </div>
          <button
            onClick={disconnect}
            disabled={busy}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-red-500/40 text-red-300 hover:bg-red-500/10 transition disabled:opacity-50"
          >
            {busy ? "…" : "Disconnect"}
          </button>
        </>
      ) : /* ══════════ STATE 2 — code mil gaya ══════════ */
      code ? (
        <div>
          <div className="p-5 rounded-xl bg-[#05DC7F]/[0.07] border border-[#05DC7F]/30 mb-4">
            <div className="text-gray-400 text-xs mb-2">Your code</div>
            <div className="flex items-center gap-3">
              <span className="text-[#05DC7F] text-4xl font-bold tracking-[0.3em] tabular-nums">
                {code}
              </span>
              <button
                onClick={copy}
                title="Copy"
                className="p-2 rounded-lg border border-[#05DC7F]/30 text-[#05DC7F] hover:bg-[#05DC7F]/10 transition"
              >
                {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
              </button>
            </div>
            <div className="text-gray-400 text-sm mt-4 leading-relaxed">
              Send this code from your own WhatsApp to{" "}
              <b className="text-white">
                {status.send_to || "Agentra ke number"}
              </b>{" "}
              .
            </div>
            {status.wa_link && (
              <a
                href={status.wa_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:opacity-90 transition"
              >
                <FaWhatsapp size={15} />
                WhatsApp kholein
              </a>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs mb-4">
            <span className="text-gray-400">
              Baqi waqt:{" "}
              <b className="text-white tabular-nums">
                {secondsLeft > 0 ? mmss : "khatam"}
              </b>
            </span>
            <span className="text-gray-500">
              The code stops working after three wrong attempts.
            </span>
          </div>

          {/* ⚠ Yeh CEO ko pehle se batana zaroori hai, warna refresh ke
              baad wo samjhega kuch toot gaya. */}
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 text-xs leading-relaxed">
            This code is shown once and is never stored anywhere.
            Refresh the page and it is gone — request a new one.
          </div>

          <div className="mt-4 text-gray-500 text-xs">
            {secondsLeft > 0
              ? "This page updates itself the moment your message arrives…"
              : "Code khatam ho gaya."}
            {secondsLeft <= 0 && (
              <button
                onClick={() => {
                  setCode("");
                  setShowForm(true);
                }}
                className="ml-2 text-[#05DC7F] hover:underline"
              >
                naya code banayein
              </button>
            )}
          </div>
        </div>
      ) : /* ══════════ STATE 1 — juda hua nahi ══════════ */
      showForm ? (
        <form onSubmit={connect} className="flex flex-col gap-3 max-w-md">
          <label className="text-gray-400 text-sm">
            Your WhatsApp number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="923143228399"
            autoFocus
            className="bg-white/[0.03] border border-white/[0.08] text-white rounded-xl px-4 py-3 outline-none focus:border-[#05DC7F]/50 transition tabular-nums"
          />
          <span className="text-gray-600 text-xs">
            With the country code, not starting with 0 — 923… instead of 03…
          </span>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? "…" : "Code bhejein"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
              className="px-4 py-2 rounded-xl text-sm text-gray-400 border border-white/[0.08] hover:text-white transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {status.status === "pending" && (
            // Code ban chuka tha magar ye safha refresh ho gaya — code
            // ab kahin nahi hai, aur ye batana zaroori hai.
            <div className="mb-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-gray-400 text-xs">
              A code has already been sent but is no longer on this page.
              If you have already sent it this will update itself —
              otherwise request a new one.
            </div>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:opacity-90 transition"
          >
            <FaWhatsapp size={16} />
            Connect WhatsApp
          </button>
        </>
      )}
    </div>
  );
}
