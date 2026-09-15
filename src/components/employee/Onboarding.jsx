/**
 * Onboarding — pehli dafa andar aane se pehle
 * ───────────────────────────────────────────
 * Ek hi sawal: tankhwah kahan bhejni hai. Jab tak is ka jawab nahi
 * milta, employee portal nahi khulta.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠ ASAL ROKAWAT YAHAN NAHI, BACKEND PAR HAI
 * ═══════════════════════════════════════════════════════════
 * Yeh safha sirf SAFAR bachata hai. Rokna backend karta hai:
 * `get_tenant` har employee request par dekhta hai ke onboarding hui ya
 * nahi, aur na hui ho to **428** deta hai.
 *
 * Yeh farq maani rakhta hai. Frontend ka faisla `localStorage` par hota
 * hai, aur wo wohi shakhs badal sakta hai jise rokna maqsood hai — ek
 * console mein do lafz likh kar. Agar rokna sirf yahan hota to rokna
 * hota hi nahi.
 *
 * ═══════════════════════════════════════════════════════════
 * "BAAD MEIN KAR LOONGA" JAAN BUJH KAR NAHI HAI
 * ═══════════════════════════════════════════════════════════
 * Pehle tajweez mein tha. CEO ne hataya (12 Sep 2026): bina bank
 * details ke aage nahi barha ja sakta.
 *
 * Us faisle ki ek shart hai jo yahan poori ki gayi hai: **naqad aur
 * cheque ka raasta**. Jis shakhs ka bank account hai hi nahi, us ke
 * liye sirf "IBAN do" ka darwaza matlab hai "andar mat aao" — hamesha
 * ke liye. Aisa shakhs farzi nahi hota.
 *
 * ═══════════════════════════════════════════════════════════
 * IBAN YAHAN BHI JAANCHA JATA HAI, AUR BACKEND PAR BHI
 * ═══════════════════════════════════════════════════════════
 * Do jagah ek hi hisab — aur yeh dohrav jaan bujh kar hai. Yahan wo
 * TURANT jawab deta hai (typing ke saath), backend wala QANOON hai.
 * Ek ghalat IBAN ka natija ek error message nahi hota: wo ek transfer
 * hota hai jo do hafte baad wapas aata hai, ya kisi aur ke account
 * mein chala jata hai.
 */

"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  Check,
  Landmark,
  Loader2,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import logo from "../../images/logo.png";
import { ACCENT } from "../ui/tokens";

const API = "http://127.0.0.1:8000";

// ⚠ Wohi hisab jo `app/schemas/bank.py` mein hai (ISO 13616, mod-97).
// Ek hindsa badal jaye ya do hindse aapas mein badal jayein — dono
// surat mein yeh pakar leta hai, aur wohi do sab se aam typo hain.
function ibanChecksumOk(raw) {
  const iban = (raw || "").replace(/[\s-]/g, "").toUpperCase();
  if (iban.length < 15 || iban.length > 34) return false;
  if (!/^[A-Z]{2}/.test(iban)) return false;
  const moved = iban.slice(4) + iban.slice(0, 4);
  let rem = 0;
  for (const ch of moved) {
    let part;
    if (ch >= "0" && ch <= "9") part = ch;
    else if (ch >= "A" && ch <= "Z") part = String(ch.charCodeAt(0) - 55);
    else return false;
    // ⚠ Poora adad JavaScript ke Number mein nahi samata (IBAN 34 harf
    // tak jata hai). Isliye baqi tukron mein nikala jata hai.
    for (const d of part) rem = (rem * 10 + Number(d)) % 97;
  }
  return rem === 1;
}

// ⚠ Har mulk ka IBAN TAY lambai ka hota hai — wohi fehrist jo
// `app/schemas/bank.py` mein hai. Is se shakhs ko "ghalat hai" ki jagah
// "teen harf kam hain" kaha ja sakta hai, aur wo bilkul doosra paighaam
// hai.
const IBAN_LENGTH = {
  PK: 24, AE: 23, SA: 24, GB: 22, DE: 22, FR: 27,
  TR: 26, QA: 29, KW: 30, BH: 22, OM: 23, EG: 29,
};

const METHOD_LABEL = {
  bank_transfer: "bank transfer",
  cash: "cash",
  cheque: "cheque",
};

const METHOD_ICON = {
  bank_transfer: Landmark,
  cash: Wallet,
  cheque: Banknote,
};

function Field({ label, hint, error, children }) {
  return (
    <label className="block mb-4">
      <span className="block text-white/70 text-[12.5px] mb-1.5">
        {label}
        {hint && <span className="text-white/35"> · {hint}</span>}
      </span>
      {children}
      {error && (
        <span className="flex items-center gap-1.5 mt-1.5 text-rose-400 text-[12px]">
          <AlertTriangle size={12} /> {error}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-3.5 py-2.5 " +
  "text-white text-[14px] placeholder-white/25 outline-none " +
  "focus:border-[#05DC7F]/50 focus:bg-white/[0.06] transition";

export default function Onboarding() {
  const navigate = useNavigate();
  // ⚠ Wohi safha do kaam karta hai. `?change=1` ka matlab hai ke shakhs
  // pehle hi andar hai aur sirf account badal raha hai — us surat mein
  // usay dashboard par wapas bhejna (jo neeche hota hai) usay form tak
  // pohanchne hi nahi deta.
  const [params] = useSearchParams();
  const changing = params.get("change") === "1";

  const [me, setMe] = useState(null);
  // ⚠ Yeh CHUNA nahi jata — parha jata hai.
  //
  // Pehle yahan teen buttons thay aur employee khud chunta tha. Wo
  // ghalat tha: tareeqa company tay karti hai. Aur us ghalti ka natija
  // sirf UI ka nahi tha — jis ko bank transfer milna tha wo "cash" chun
  // kar darwaza khol leta aur bank ki file se KHAMOSHI se ghayab reh
  // jata.
  const [method, setMethod] = useState("bank_transfer");
  // IBAN ka error kab dikhana hai. Tafseel neeche.
  const [ibanTouched, setIbanTouched] = useState(false);
  const [form, setForm] = useState({
    account_title: "",
    bank_name: "",
    branch: "",
    iban: "",
    account_number: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/employee/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) return;
        setMe(data);
        setMethod(data.payment_method || "bank_transfer");
        // Jo shakhs pehle hi kar chuka, usay yahan rokna be-maani hai —
        // illa yeh ke wo KHUD badalne aaya ho.
        if (data.onboarding_complete && !changing)
          navigate("/employee/dashboard");
        else if (data.payment?.has_details) {
          // Badalte waqt purani qeematein pehle se bhari hon — aksar
          // sirf ek khana badalna hota hai, aur poora form dobara likhna
          // wohi jagah hai jahan naya typo aata hai.
          setForm({
            account_title: data.payment.account_title || "",
            bank_name: data.payment.bank_name || "",
            branch: data.payment.branch || "",
            iban: data.payment.iban || "",
            account_number: data.payment.account_number || "",
          });
        }
        // Account ka naam taqreeban hamesha apna naam hota hai — pehle
        // se bhar dena ek kam khana hai, aur wohi khana jis ka bank se
        // na milna sab se aam wajah hoti hai transfer ke wapas aane ki.
        else if (data.full_name)
          setForm((f) => ({ ...f, account_title: data.full_name }));
      } catch {
        /* neeche error dikh jayega */
      }
    })();
  }, [token, navigate, changing]);

  const isBank = method === "bank_transfer";
  const ibanClean = form.iban.replace(/[\s-]/g, "").toUpperCase();
  const ibanBad = isBank && ibanClean.length > 0 && !ibanChecksumOk(ibanClean);

  // ═══════════════════════════════════════════════════════════
  // ⚠ ERROR KAB DIKHANA HAI — AUR YEH EK ASLI BUG THA
  // ═══════════════════════════════════════════════════════════
  // Pehle shart yeh thi: `ibanClean.length > 4 && !ibanChecksumOk(...)`
  //
  // Aur mod-97 15 harf se chhote har matn par false deta hai. Yani
  // PAANCHVE HARF SE hi laal error aa jata tha, aur 24 harf poore hone
  // tak wahin khara rehta. Shakhs bilkul durust IBAN likh raha hota aur
  // safha usay poori der "not valid" keh raha hota.
  //
  // Yeh us qism ka bug hai jo banane wale ko kabhi nazar nahi aata:
  // testing mein IBAN paste kiya jata hai (ek hi lamhe mein poora), aur
  // us surat mein ghalat halat aati hi nahi.
  //
  // Ab error SIRF tab dikhta hai jab shakhs khana chhor chuka ho
  // (`onBlur`). Us ke baad live chalta hai, taake theek karte waqt wo
  // foran ghayab ho jaye.
  const wantLen = IBAN_LENGTH[ibanClean.slice(0, 2)];
  const ibanMessage = !ibanBad
    ? ""
    : wantLen && ibanClean.length !== wantLen
      ? `A ${ibanClean.slice(0, 2)} IBAN is ${wantLen} characters — this one is ${ibanClean.length}.`
      : "That IBAN did not pass its check digits — one character is wrong somewhere. Compare it with your bank app.";
  const showIbanError = ibanTouched && ibanBad;
  const canSave =
    !saving &&
    (!isBank ||
      (form.account_title.trim() &&
        form.bank_name.trim() &&
        ibanClean &&
        !ibanBad));

  async function save() {
    setSaving(true);
    setError("");
    try {
      // ⚠ `payment_method` yahan NAHI bheja jata — backend usay
      // `users.payment_method` se khud leta hai. Bhejne se wo ek aisi
      // qeemat ban jati jo do jagah se aa sakti hai.
      const body = { ...form, iban: ibanClean };
      const res = await fetch(`${API}/employee/bank`, {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        // 422 par FastAPI ki shakal alag hoti hai — pehla masla dikhao,
        // poora JSON nahi.
        const d = data?.detail;
        setError(
          typeof d === "string"
            ? d
            : Array.isArray(d) && d[0]?.msg
              ? d[0].msg.replace(/^Value error, /, "")
              : "Could not save. Please check the details."
        );
        return;
      }
      localStorage.setItem("profile_complete", "1");
      navigate("/employee/dashboard");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen w-full bg-[#1F1F1F] overflow-x-hidden">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(5,220,127,0.05) 0%, transparent 70%),
            radial-gradient(circle at 70% 20%, rgba(5,220,127,0.04) 0%, transparent 70%)`,
          filter: "blur(100px)",
        }}
      />

      <div className="max-w-[980px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <img src={logo} alt="Agentra" className="w-16 opacity-80 mb-8" />

        <div className="grid lg:grid-cols-[1.25fr_1fr] gap-8 lg:gap-12 items-start">
          {/* ──── Form ──── */}
          <div>
            <p className="text-[#05DC7F] text-[11.5px] tracking-[0.16em] uppercase mb-3">
              {changing ? "Update payment details" : "One step before you start"}
            </p>
            <h1 className="text-white text-[26px] sm:text-[34px] font-bold tracking-tight leading-tight">
              Where should your salary go?
            </h1>
            <p className="mt-3 text-white/50 text-[14.5px] leading-relaxed max-w-[460px]">
              {me?.full_name ? `${me.full_name}, y` : "Y"}our payslip can be
              produced without this &mdash; the money cannot. Agentra needs it
              once.
            </p>

            {/* ⚠ Tareeqa DIKHAYA jata hai, chuna nahi jata — wo company
                ka faisla hai. */}
            <div className="inline-flex items-center gap-2.5 mt-7 mb-6 px-4 py-2.5 rounded-xl border border-white/12 bg-white/[0.03]">
              {(() => {
                const Icon = METHOD_ICON[method] || Landmark;
                return <Icon size={15} className="text-[#05DC7F]" />;
              })()}
              <span className="text-white/75 text-[13px]">
                Your company pays you by{" "}
                <b className="text-white">{METHOD_LABEL[method]}</b>
              </span>
            </div>

            {isBank ? (
              <>
                <Field label="Account title" hint="exactly as your bank has it">
                  <input
                    className={inputCls}
                    value={form.account_title}
                    onChange={(e) =>
                      setForm({ ...form, account_title: e.target.value })
                    }
                    placeholder="Your name on the account"
                  />
                </Field>

                <div className="grid sm:grid-cols-2 gap-x-4">
                  <Field label="Bank">
                    <input
                      className={inputCls}
                      value={form.bank_name}
                      onChange={(e) =>
                        setForm({ ...form, bank_name: e.target.value })
                      }
                      placeholder="Meezan Bank"
                    />
                  </Field>
                  <Field label="Branch" hint="optional">
                    <input
                      className={inputCls}
                      value={form.branch}
                      onChange={(e) =>
                        setForm({ ...form, branch: e.target.value })
                      }
                      placeholder="Gulberg III"
                    />
                  </Field>
                </div>

                <Field
                  label="IBAN"
                  hint={
                    ibanClean.length > 1 && wantLen
                      ? `${ibanClean.length} of ${wantLen}`
                      : "from your bank app or chequebook"
                  }
                  error={showIbanError ? ibanMessage : ""}
                >
                  <input
                    className={`${inputCls} font-mono tracking-wide ${
                      showIbanError ? "border-rose-400/50" : ""
                    }`}
                    value={form.iban}
                    onChange={(e) => setForm({ ...form, iban: e.target.value })}
                    onBlur={() => setIbanTouched(true)}
                    placeholder="PK36 SCBL 0000 0011 2345 6702"
                  />
                </Field>

                <Field label="Account number" hint="optional">
                  <input
                    className={`${inputCls} font-mono`}
                    value={form.account_number}
                    onChange={(e) =>
                      setForm({ ...form, account_number: e.target.value })
                    }
                    placeholder="Only if your bank uses one"
                  />
                </Field>
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-5">
                <p className="text-white/70 text-[14px]">
                  There is nothing for you to fill in.
                </p>
                <p className="text-white/40 text-[13px] mt-1.5">
                  Your company pays you by {METHOD_LABEL[method]}, so no bank
                  account is needed. If that changes, this page will ask you
                  for one.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3.5 py-2.5 text-rose-300 text-[13px]">
                <AlertTriangle size={14} className="mt-0.5 flex-none" />
                {error}
              </div>
            )}

            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-[14px] text-black bg-[#05DC7F] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Check size={16} />
              )}
              Save and continue
            </button>
          </div>

          {/* ──── Kaun dekh sakta hai ──── */}
          <div className="space-y-3">
            <div className="rounded-2xl border border-[#05DC7F]/20 bg-[#05DC7F]/[0.05] p-5">
              <div className="flex items-center gap-2 mb-2.5">
                <ShieldCheck size={15} style={{ color: ACCENT }} />
                <span className="text-[#05DC7F] text-[11.5px] tracking-[0.14em] uppercase">
                  Who can see this
                </span>
              </div>
              <p className="text-white/55 text-[13px] leading-relaxed">
                Only <b className="text-white/85">you</b> and{" "}
                <b className="text-white/85">your CEO</b>. It is stored
                encrypted, and every time your CEO opens it, that is written
                down with their name and the time.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-white/45 text-[11.5px] tracking-[0.14em] uppercase mb-2.5">
                Why now
              </div>
              <p className="text-white/45 text-[13px] leading-relaxed">
                Payroll runs once a month. Anyone without payment details is
                skipped &mdash; quietly, and nobody notices until the money
                does not arrive.
              </p>
              {changing && (
                <p className="mt-3 pt-3 border-t border-white/8 text-white/40 text-[12.5px] leading-relaxed">
                  Your previous account stays on record. Your CEO sees that it
                  changed &mdash; that is how a changed account just before
                  payday gets noticed.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
