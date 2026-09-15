/**
 * Payment details — CEO ka safha
 * ──────────────────────────────
 * CEO ko 192 account numbers parhne nahi hain. Usay mahine mein ek dafa
 * ek sawal ka jawab chahiye: **tankhwah bhej sakta hoon ya nahi.**
 *
 * ═══════════════════════════════════════════════════════════
 * ISI LIYE PEHLA KHANA "SAB" NAHI, "JIN PAR KAAM HAI" HAI
 * ═══════════════════════════════════════════════════════════
 * CEO teen sawal poochta hai, aur teenon ka waqt alag hai:
 *
 *     "salary bhej sakta hoon?"   har mahine      <- sab se upar
 *     "bank ki file do"           har mahine      <- upar daayen
 *     "Ali ka account kya hai?"   kabhi kabhi     <- search
 *
 * 192 qataron ki fehrist sirf TEESRE sawal ka jawab deti hai — jo sab
 * se kam poocha jata hai. Pehla sawal us fehrist mein nazar hi nahi
 * aata: CEO ko khud scroll kar ke dhoondna parta ke kis ka khana khali
 * hai.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠ POORA IBAN FEHRIST MEIN AATA HI NAHI
 * ═══════════════════════════════════════════════════════════
 * Fehrist wali API sirf `iban_last4` bhejti hai — aur wo khana database
 * mein encrypted NAHI hai, jaan bujh kar. Us ka natija yeh hai ke 192
 * qatarein banane mein server par **ek bhi decrypt nahi hota**.
 *
 * Poora IBAN ek alag request par aata hai (`GET /hr/bank/{id}`), ek
 * qatar ke liye — aur us ka nishan `bank_access_log` mein likh diya
 * jata hai. Agar kisi din paisa ghalat account mein gaya to sawal yeh
 * hoga ke "wo number kis ne dekha tha aur kab", aur us ka jawab sirf
 * tab hota hai jab wo us waqt likha gaya ho.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

const METHOD_LABEL = {
  bank_transfer: "Transfer",
  cash: "Cash",
  cheque: "Cheque",
};

function Chip({ tone = "ok", children }) {
  const t = {
    ok: "bg-[#05DC7F]/12 text-[#05DC7F]",
    warn: "bg-amber-400/12 text-amber-400",
    bad: "bg-rose-400/12 text-rose-400",
    mute: "bg-white/8 text-white/50",
  }[tone];
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${t}`}>
      {children}
    </span>
  );
}

function maskIban(last4) {
  return last4 ? `PK•• •••• •••• ${last4}` : "—";
}

export default function PaymentDetailsTab() {
  const [ready, setReady] = useState(null);
  const [tab, setTab] = useState("attention");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // employee_id -> poore details (reveal ke baad)
  const [opened, setOpened] = useState({});
  const [revealing, setRevealing] = useState(null);
  const [changingMethod, setChangingMethod] = useState(null);

  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };
  const SIZE = 25;

  const loadReadiness = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/bank/readiness`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) setReady(data);
      else setError(data.detail || "Could not load payment status");
    } catch {
      setError("Could not reach the server");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`${API}/hr/bank?${params}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows || []);
        setTotal(data.total || 0);
      } else setError(data.detail || "Could not load the list");
    } catch {
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, page, q]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

  useEffect(() => {
    if (tab === "all") loadList();
    else setLoading(false);
  }, [tab, loadList]);

  async function reveal(id) {
    if (opened[id]) {
      setOpened((o) => {
        const n = { ...o };
        delete n[id];
        return n;
      });
      return;
    }
    setRevealing(id);
    try {
      const res = await fetch(`${API}/hr/bank/${id}`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setOpened((o) => ({ ...o, [id]: data }));
      else setError(data.detail || "Could not open that account");
    } catch {
      setError("Could not reach the server");
    } finally {
      setRevealing(null);
    }
  }

  // ⚠ Yeh CEO ka faisla hai, employee ka nahi.
  //
  // Pehle employee onboarding ke safhe par khud chunta tha. Us ka natija
  // sirf UI ka nahi tha: jis ko bank transfer milna tha wo "cash" chun
  // kar aage barh jata, aur phir bank ki file se KHAMOSHI se ghayab reh
  // jata — CEO ko payday par pata chalta.
  async function setMethod(id, method) {
    setChangingMethod(id);
    try {
      const res = await fetch(`${API}/hr/bank/${id}/method`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ payment_method: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Could not change the payment method");
        return;
      }
      // Dono taraf badal sakti hain — ginti bhi, aur qatar bhi.
      await loadReadiness();
      if (tab === "all") await loadList();
    } catch {
      setError("Could not reach the server");
    } finally {
      setChangingMethod(null);
    }
  }

  async function exportCsv() {
    try {
      const res = await fetch(`${API}/hr/bank/export/csv`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        setError("Could not build the export");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not reach the server");
    }
  }

  const pct = ready?.total ? (ready.ready / ready.total) * 100 : 0;

  return (
    <div>
      {/* ══════════ Sab se pehla sawal ══════════ */}
      <div className="rounded-2xl border border-[#05DC7F]/25 bg-[#05DC7F]/[0.05] p-5 mb-5">
        {!ready ? (
          <div className="flex items-center gap-2 text-white/50 text-[13px]">
            <Loader2 size={14} className="animate-spin" /> Checking who can be
            paid…
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex items-end gap-3">
                <span className="text-white text-[30px] sm:text-[36px] font-bold leading-none tabular-nums">
                  {ready.ready}
                </span>
                <span className="text-white/55 text-[14px] pb-1">
                  of {ready.total} ready to be paid
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    loadReadiness();
                    if (tab === "all") loadList();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/12 text-white/60 text-[12.5px] hover:text-white transition"
                >
                  <RefreshCw size={13} /> Refresh
                </button>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-[12.5px] font-semibold hover:brightness-110 transition"
                >
                  <Download size={13} /> Export for bank
                </button>
              </div>
            </div>

            <div className="flex h-[7px] rounded-full overflow-hidden bg-white/8 mt-4 mb-3">
              <div
                className="bg-[#05DC7F]"
                style={{ width: `${pct}%` }}
              />
              <div
                className="bg-amber-400"
                style={{ width: `${100 - pct}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12.5px] text-white/50">
              <span>
                <b className="text-[#05DC7F]">{ready.ready}</b> ready
              </span>
              <span>
                <b className="text-amber-400">{ready.missing}</b> missing details
              </span>
              <span>
                <b className="text-white/80">{ready.changed_recently}</b> changed
                in {ready.recent_days} days
              </span>
              {ready.cash_or_cheque > 0 && (
                <span>
                  <b className="text-white/80">{ready.cash_or_cheque}</b> cash or
                  cheque
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ══════════ Khane ══════════ */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          ["attention", `Needs attention · ${ready ? ready.missing + ready.changed_recently : "…"}`],
          ["all", `All · ${ready?.total ?? "…"}`],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-full text-[12.5px] border transition ${
              tab === id
                ? "border-white/25 bg-white/8 text-white"
                : "border-white/10 text-white/50 hover:text-white/80"
            }`}
          >
            {label}
          </button>
        ))}

        {tab === "all" && (
          <div className="relative ml-auto">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />
            <input
              value={q}
              onChange={(e) => {
                setPage(1);
                setQ(e.target.value);
              }}
              placeholder="Search by name…"
              className="w-[190px] rounded-xl border border-white/10 bg-white/[0.03] pl-8 pr-3 py-2 text-white text-[12.5px] placeholder-white/25 outline-none focus:border-[#05DC7F]/40"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 mb-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-3.5 py-2.5 text-rose-300 text-[13px]">
          <AlertTriangle size={14} className="mt-0.5 flex-none" />
          {error}
        </div>
      )}

      {/* ══════════ Jin par kaam hai ══════════ */}
      {tab === "attention" && ready && (
        <>
          {ready.missing_list?.length === 0 && ready.changed_list?.length === 0 && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#05DC7F]/20 bg-[#05DC7F]/[0.04] p-5 text-[#05DC7F] text-[14px]">
              <CheckCircle2 size={16} /> Everyone can be paid. Nothing needs
              your attention.
            </div>
          )}

          {ready.missing_list?.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2 text-[11px] tracking-[0.13em] uppercase text-white/40">
                <span className="text-amber-400">
                  Missing details · {ready.missing}
                </span>
                <span className="text-white/25">— these will not be paid</span>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                {ready.missing_list.map((r, i) => (
                  <div
                    key={r.employee_id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[13px] ${
                      i ? "border-t border-white/[0.06]" : ""
                    }`}
                  >
                    <span className="text-white min-w-[130px]">{r.full_name}</span>
                    <span className="text-white/45 min-w-[110px]">
                      {r.department || "—"}
                    </span>
                    <span className="text-white/30 text-[12px]">
                      {r.joining_date
                        ? `Joined ${new Date(r.joining_date).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short" }
                          )}`
                        : ""}
                    </span>
                    <span className="ml-auto">
                      <Chip tone="warn">Not provided</Chip>
                    </span>
                  </div>
                ))}
              </div>
              <p className="flex items-center gap-1.5 mt-2 text-white/30 text-[12px]">
                <BellRing size={12} />
                They are asked for this every time they sign in — they cannot
                use their portal until it is filled. If someone should be paid
                in cash instead, change their method under &ldquo;All&rdquo;.
              </p>
            </div>
          )}

          {ready.changed_list?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-[11px] tracking-[0.13em] uppercase text-white/40">
                <span className="text-white/70">
                  Changed in the last {ready.recent_days} days ·{" "}
                  {ready.changed_recently}
                </span>
                <span className="text-white/25">— worth a look before paying</span>
              </div>
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                {ready.changed_list.map((r, i) => (
                  <div
                    key={r.employee_id}
                    className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-[13px] ${
                      i ? "border-t border-white/[0.06]" : ""
                    }`}
                  >
                    <span className="text-white min-w-[130px]">{r.full_name}</span>
                    <span className="text-white/45 font-mono text-[12px]">
                      {r.bank_name} {maskIban(r.iban_last4)}
                    </span>
                    <span className="ml-auto text-white/30 text-[12px]">
                      {r.updated_at
                        ? new Date(r.updated_at).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })
                        : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ══════════ Sab ══════════ */}
      {tab === "all" && (
        <>
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            {/* Sar — sirf bari screen par */}
            <div className="hidden md:grid grid-cols-[1.3fr_1fr_1.4fr_.7fr_auto] gap-4 px-4 py-2.5 bg-white/[0.04] text-[10.5px] tracking-[0.11em] uppercase text-white/40">
              <span>Employee</span>
              <span>Department</span>
              <span>Account</span>
              <span>Method</span>
              <span />
            </div>

            {loading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-white/45 text-[13px]">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="px-4 py-6 text-white/40 text-[13px]">
                Nobody matches that.
              </div>
            ) : (
              rows.map((r) => {
                const full = opened[r.employee_id];
                return (
                  <div key={r.employee_id} className="border-t border-white/[0.06]">
                    <div className="grid md:grid-cols-[1.3fr_1fr_1.4fr_.7fr_auto] gap-2 md:gap-4 px-4 py-3 text-[13px] items-center">
                      <span className="text-white">{r.full_name}</span>
                      <span className="text-white/45">{r.department || "—"}</span>
                      <span className="text-white/70 font-mono text-[12px]">
                        {r.payment_method !== "bank_transfer"
                          ? "— not paid by transfer —"
                          : r.iban_last4
                            ? `${r.bank_name || ""} ${maskIban(r.iban_last4)}`
                            : "— not provided —"}
                      </span>
                      <span className="flex items-center gap-2">
                        <select
                          value={r.payment_method}
                          disabled={changingMethod === r.employee_id}
                          onChange={(e) =>
                            setMethod(r.employee_id, e.target.value)
                          }
                          className="rounded-lg border border-white/12 bg-[#1F1F1F] px-2 py-1 text-white/80 text-[11.5px] outline-none focus:border-[#05DC7F]/40 disabled:opacity-50"
                        >
                          <option value="bank_transfer">Transfer</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                        </select>
                        {r.needs_account && <Chip tone="warn">No account</Chip>}
                      </span>
                      <span className="md:text-right">
                        {r.iban_last4 && r.payment_method === "bank_transfer" && (
                          <button
                            onClick={() => reveal(r.employee_id)}
                            className="inline-flex items-center gap-1.5 text-white/45 hover:text-[#05DC7F] text-[12px] transition"
                          >
                            {revealing === r.employee_id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Eye size={12} />
                            )}
                            {full ? "Hide" : "Show"}
                          </button>
                        )}
                      </span>
                    </div>

                    {r.title_mismatch && (
                      <div className="px-4 pb-2.5 -mt-1 flex items-center gap-1.5 text-amber-400/80 text-[11.5px]">
                        <AlertTriangle size={11} />
                        Account title &ldquo;{r.account_title}&rdquo; does not
                        match their name — transfers often bounce on this.
                      </div>
                    )}

                    {full && (
                      <div className="px-4 py-3 bg-black/25 border-t border-white/[0.05]">
                        <div className="flex flex-wrap gap-x-8 gap-y-3">
                          <div>
                            <div className="text-white/30 text-[9.5px] tracking-[0.12em] uppercase mb-1">
                              Account title
                            </div>
                            <div className="text-white/85 text-[13px]">
                              {full.account_title || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-white/30 text-[9.5px] tracking-[0.12em] uppercase mb-1">
                              Bank
                            </div>
                            <div className="text-white/85 text-[13px]">
                              {[full.bank_name, full.branch]
                                .filter(Boolean)
                                .join(" · ") || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-white/30 text-[9.5px] tracking-[0.12em] uppercase mb-1">
                              IBAN
                            </div>
                            <div className="text-white font-mono text-[13px] tracking-wide">
                              {(full.iban || "").replace(/(.{4})/g, "$1 ").trim() ||
                                "—"}
                            </div>
                          </div>
                          {full.account_number && (
                            <div>
                              <div className="text-white/30 text-[9.5px] tracking-[0.12em] uppercase mb-1">
                                Account number
                              </div>
                              <div className="text-white/85 font-mono text-[13px]">
                                {full.account_number}
                              </div>
                            </div>
                          )}
                        </div>
                        {/* ⚠ Yeh jumla sajawat nahi hai. Poora account
                            number kholna audit mein likha jata hai, aur
                            shakhs ko yeh maloom hona chahiye. */}
                        <p className="mt-3 pt-2.5 border-t border-white/[0.05] text-white/25 text-[11px]">
                          You opened this. It is recorded with your name and the
                          time.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {total > SIZE && (
            <div className="flex items-center justify-between mt-3 text-[12.5px] text-white/45">
              <span>
                {(page - 1) * SIZE + 1}–{Math.min(page * SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/12 disabled:opacity-30 hover:text-white transition"
                >
                  Previous
                </button>
                <button
                  disabled={page * SIZE >= total}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg border border-white/12 disabled:opacity-30 hover:text-white transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <p className="flex items-center gap-1.5 mt-3 text-white/25 text-[11.5px]">
            <Wallet size={11} />
            The list shows only the last four digits — the full account is
            fetched one row at a time, and each time is recorded.
          </p>
        </>
      )}
    </div>
  );
}
