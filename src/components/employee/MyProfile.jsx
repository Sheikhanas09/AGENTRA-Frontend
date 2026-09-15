/**
 * My Profile — apna record, aur payment ka tareeqa
 * ────────────────────────────────────────────────
 * Pehle employee apna record kahin dekh nahi sakta tha.
 *
 * ═══════════════════════════════════════════════════════════
 * KYA BADLA JA SAKTA HAI AUR KYA NAHI — AUR YEH SIRF UI KI BAAT NAHI
 * ═══════════════════════════════════════════════════════════
 *     badla ja sakta hai : naam, phone, payment ka tareeqa
 *     dikhta hai, band   : department, designation, joining date, status
 *
 * Doosri qatar CEO ke faisle hain. Agar employee apna department badal
 * sakta to wo apni attendance policy aur payroll dono badal leta, bina
 * kisi ke jaane.
 *
 * ⚠ Aur yeh rukawat sirf yahan nahi hai: `EmployeeProfileUpdate` mein
 * wo khane hain hi nahi, to unhein bhejna bhi be-asar hai. Yeh safha wo
 * qanoon DIKHATA hai, banata nahi.
 *
 * ═══════════════════════════════════════════════════════════
 * IBAN CHHUPA HUA MILTA HAI, MAGAR HAI POORA
 * ═══════════════════════════════════════════════════════════
 * Screen par default masked hai — us ka maqsad hifazat nahi, aadat hai:
 * log apna portal doosron ke saamne kholte hain. "Show" par poora dikh
 * jata hai, kyunke wo apna hi account hai.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

const METHOD_LABEL = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
};

function maskIban(iban) {
  if (!iban) return "—";
  const s = iban.replace(/\s/g, "");
  return `${s.slice(0, 2)}•• •••• •••• ${s.slice(-4)}`;
}

function groups(iban) {
  return (iban || "").replace(/(.{4})/g, "$1 ").trim();
}

function Row({ k, v, locked }) {
  return (
    <div>
      <div className="text-white/35 text-[10.5px] tracking-[0.13em] uppercase mb-1">
        {k}
      </div>
      <div
        className={`text-[14px] ${locked ? "text-white/50" : "text-white"}`}
      >
        {v || "—"}
      </div>
    </div>
  );
}

export default function MyProfile() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ full_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [showIban, setShowIban] = useState(false);

  const token = localStorage.getItem("token");
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/employee/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not load your profile");
      else {
        setMe(data);
        setDraft({ full_name: data.full_name || "", phone: data.phone || "" });
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveProfile() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/employee/profile`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not save");
      else {
        // Navbar `full_name` localStorage se parhta hai — wahan purana
        // naam reh jata to safha aadha badla hua dikhta.
        if (draft.full_name) localStorage.setItem("full_name", draft.full_name);
        setEditing(false);
        await load();
      }
    } catch {
      setError("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="flex items-center gap-2 text-white/50 p-6">
        <Loader2 size={16} className="animate-spin" /> Loading your profile…
      </div>
    );

  if (!me)
    return (
      <div className="flex items-center gap-2 text-rose-400 p-6">
        <AlertTriangle size={16} /> {error || "Profile unavailable"}
      </div>
    );

  const pay = me.payment || {};
  const initials = (me.full_name || "E")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  return (
    <div className="max-w-[900px]">
      {/* ──── Sar ──── */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 flex-none rounded-full bg-[#05DC7F] text-black font-bold text-[17px] flex items-center justify-center shadow-[0_0_16px_rgba(5,220,127,0.35)]">
          {initials}
        </div>
        <div className="min-w-0">
          <h2 className="text-white text-[20px] font-semibold truncate">
            {me.full_name}
          </h2>
          <p className="text-white/45 text-[13px] truncate">
            {[me.designation, me.department].filter(Boolean).join(" · ") ||
              "Employee"}
          </p>
        </div>
      </div>

      {/* ──── Khane ──── */}
      <div className="flex flex-wrap gap-2 mb-5">
        {[
          ["personal", "Personal"],
          ["employment", "Employment"],
          ["payment", "Payment"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-[13px] border transition ${
              tab === id
                ? "border-[#05DC7F]/45 bg-[#05DC7F]/10 text-[#05DC7F]"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3.5 py-2.5 text-rose-300 text-[13px]">
          <AlertTriangle size={14} className="mt-0.5 flex-none" />
          {error}
        </div>
      )}

      {/* ══════════ Personal ══════════ */}
      {tab === "personal" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {editing ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-white/60 text-[12px] mb-1.5">
                  Full name
                </span>
                <input
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-white text-[14px] outline-none focus:border-[#05DC7F]/50"
                  value={draft.full_name}
                  onChange={(e) =>
                    setDraft({ ...draft, full_name: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="block text-white/60 text-[12px] mb-1.5">
                  Phone
                </span>
                <input
                  className="w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 text-white text-[14px] outline-none focus:border-[#05DC7F]/50"
                  value={draft.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                />
              </label>
              <div className="sm:col-span-2 flex gap-2.5 pt-1">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-[13px] font-semibold hover:brightness-110 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Check size={13} />
                  )}
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft({
                      full_name: me.full_name || "",
                      phone: me.phone || "",
                    });
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/12 text-white/60 text-[13px]"
                >
                  <X size={13} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <Row k="Full name" v={me.full_name} />
                <Row k="Email" v={me.email} locked />
                <Row k="Phone" v={me.phone} />
              </div>
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 mt-5 px-3.5 py-2 rounded-xl border border-white/12 text-white/65 text-[12.5px] hover:text-white hover:border-white/25 transition"
              >
                <Pencil size={12} /> Edit
              </button>
            </>
          )}
        </div>
      )}

      {/* ══════════ Employment ══════════ */}
      {tab === "employment" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Row k="Company" v={me.company_name} locked />
            <Row k="Department" v={me.department} locked />
            <Row k="Designation" v={me.designation} locked />
            <Row
              k="Joining date"
              v={
                me.joining_date
                  ? new Date(me.joining_date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : null
              }
              locked
            />
            <Row k="Status" v={me.status} locked />
          </div>
          <p className="flex items-center gap-1.5 mt-5 text-white/30 text-[12px]">
            <Building2 size={12} />
            These are set by your company. Ask your CEO if something here is
            wrong.
          </p>
        </div>
      )}

      {/* ══════════ Payment ══════════ */}
      {tab === "payment" && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {/* ⚠ Tareeqa `me` se aata hai, `pay` se nahi — wo CEO ka mojooda
              faisla hai, aur qatar par jo likha hai wo us waqt ka snapshot
              hai. Farq us lamhe dikhta hai jab CEO kisi ko abhi abhi cash
              par le gaya ho. */}
          <div className="flex flex-wrap items-center gap-2.5 mb-4 pb-4 border-b border-white/8">
            <span className="text-white/45 text-[13px]">
              Your company pays you by
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#05DC7F]/12 text-[#05DC7F] text-[12.5px] font-semibold">
              {METHOD_LABEL[me.payment_method] || "Bank transfer"}
            </span>
            <span className="text-white/25 text-[12px]">
              — set by your company
            </span>
          </div>

          {me.payment_method !== "bank_transfer" ? (
            <p className="text-white/50 text-[14px]">
              No bank account is needed.
            </p>
          ) : !pay.has_details ? (
            <p className="text-white/50 text-[14px]">
              No payment details on file.
            </p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-5">
                <Row k="Account title" v={pay.account_title} />
                <Row
                  k="Bank"
                  v={[pay.bank_name, pay.branch].filter(Boolean).join(" · ")}
                />
              </div>

              {pay.iban && (
                <div className="mt-5 pt-4 border-t border-white/8 flex flex-wrap items-end gap-4">
                  <div>
                    <div className="text-white/35 text-[10.5px] tracking-[0.13em] uppercase mb-1">
                      IBAN
                    </div>
                    <div className="text-white text-[15px] font-mono tracking-wide">
                      {showIban ? groups(pay.iban) : maskIban(pay.iban)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIban((v) => !v)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/12 text-white/65 text-[12.5px] hover:text-white transition"
                  >
                    {showIban ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showIban ? "Hide" : "Show"}
                  </button>
                  {pay.updated_at && (
                    <span className="ml-auto text-white/30 text-[12px]">
                      Last updated{" "}
                      {new Date(pay.updated_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          <div className="mt-5 pt-4 border-t border-white/8 flex flex-wrap items-center gap-3">
            {me.payment_method === "bank_transfer" && (
            <button
              onClick={() => navigate("/employee/onboarding?change=1")}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/12 text-white/65 text-[12.5px] hover:text-white hover:border-white/25 transition"
            >
              <Pencil size={12} />
              {pay.has_details ? "Change" : "Add payment details"}
            </button>
            )}
            <span className="text-white/30 text-[12px] leading-relaxed max-w-[52ch]">
              Your previous account stays on record, so your CEO can see that
              it changed.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
