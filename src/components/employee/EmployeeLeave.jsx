"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CalendarDays,
  FileText,
  Upload,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  Loader2,
  Info,
  Paperclip,
  RefreshCw,
  Inbox,
  Search,
} from "lucide-react";
import {
  Panel,
  IconButton,
  Pill,
  FilterChips,
  Pagination,
  EmptyState,
  TableSkeleton,
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

// Backend limit — both sides must agree (leave.py: MIN_REASON_LENGTH)
const MIN_REASON = 5;

// ──────────────────────────────────────────
// Leave types now come from the SERVER
// ──────────────────────────────────────────
// This list used to be hardcoded here. But every company's policy differs —
// some have no "casual" at all, others also have "maternity". Each type now
// carries its own rules (certificate required? how many days' notice?), so
// the UI follows the company policy on its own.

const typeHint = (b) => {
  const bits = [];
  if (b.advance_notice_days > 0)
    bits.push(`apply at least ${b.advance_notice_days} day(s) in advance`);
  else bits.push("can be applied for the same day");
  if (b.requires_certificate) bits.push("a medical certificate is REQUIRED");
  if (b.unlimited) bits.push("does not count against your balance");
  // Pay must be clear BEFORE applying — finding out from the payslip that
  // salary was deducted feels like a trick
  if (b.is_paid === false) bits.push("these days are UNPAID");
  return `${b.label} — ${bits.join(", ")}`;
};

// ──── Build a date string with no timezone shift ────
const localDateStr = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

// ──── Date in PKT (UTC+5) ────
// The backend does all its arithmetic in PKT. Using the browser's local date
// would make the UI's "today" differ from the server's on any machine in
// another timezone — breaking both the advance-notice minimum date and the
// Cancel button.
const pktDateStr = () =>
  new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const prettyDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const prettyDateTime = (s) => {
  if (!s) return "—";
  const d = new Date(String(s).replace(" ", "T"));
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Colors from the kit — the HR Leave screen uses exactly the same ones
const STATUS_TONE = {
  approved: "ok",
  pending: "warn",
  evaluating: "info",
  rejected: "bad",
  cancelled: "muted",
};

const STATUS_ICON = {
  approved: <CheckCircle2 size={13} />,
  pending: <Clock size={13} />,
  evaluating: <Loader2 size={13} className="animate-spin" />,
  rejected: <XCircle size={13} />,
  cancelled: <Ban size={13} />,
};

// ──────────────────────────────────────────
// Balance card
// ──────────────────────────────────────────
function BalanceCard({ balance }) {
  const {
    leave_type,
    label,
    total_entitlement,
    used_days,
    remaining_days,
    unlimited,
    requires_certificate,
    advance_notice_days,
    is_paid,
    source,
  } = balance;

  // ──── Type exists in the policy but the quota is 0 — cannot be applied for ────
  const notAllowed = !unlimited && total_entitlement === 0;
  const low = !unlimited && !notAllowed && remaining_days <= 2;
  const pct =
    unlimited || total_entitlement <= 0
      ? 0
      : Math.min(100, ((used_days || 0) / total_entitlement) * 100);

  const accent = unlimited
    ? "text-[#05DC7F]"
    : notAllowed
      ? "text-gray-600"
      : low
        ? "text-red-400"
        : "text-white";

  return (
    <div
      className={`relative flex flex-col p-4 rounded-xl border transition-all duration-200 ${
        notAllowed
          ? "border-gray-800 bg-black/20"
          : "border-[#05DC7F]/25 bg-black/30 hover:border-[#05DC7F]/50 hover:bg-black/40"
      }`}
    >
      {/* ── Name ── */}
      <p
        className="text-gray-300 text-sm font-medium leading-tight truncate"
        title={label || leave_type}
      >
        {label || leave_type}
      </p>

      {/* ── The big number ── */}
      <div className="flex items-baseline gap-1.5 mt-3">
        <span className={`text-4xl font-bold leading-none ${accent}`}>
          {unlimited ? "∞" : remaining_days}
        </span>
        {!unlimited && !notAllowed && (
          <span className="text-gray-600 text-sm">/ {total_entitlement}</span>
        )}
      </div>

      <p className="text-gray-500 text-xs mt-1">
        {unlimited
          ? "no limit"
          : notAllowed
            ? "not allowed this year"
            : `${remaining_days === 1 ? "day" : "days"} left`}
      </p>

      {/* ── Progress ── */}
      {!unlimited && !notAllowed && (
        <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              low ? "bg-red-400" : "bg-[#05DC7F]"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* ── Rules ── */}
      <div className="flex flex-wrap gap-1 mt-3 min-h-[18px]">
        {is_paid === false && (
          <span
            title="One day's salary is deducted for every working day of this leave"
            className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/15 text-orange-400/90"
          >
            unpaid
          </span>
        )}
        {requires_certificate && (
          <span
            title="A medical certificate must be attached with this leave type"
            className="px-1.5 py-0.5 text-[10px] rounded bg-red-500/15 text-red-400/90"
          >
            certificate
          </span>
        )}
        {advance_notice_days > 0 ? (
          <span
            title={`Must be applied for at least ${advance_notice_days} day(s) in advance`}
            className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-gray-500"
          >
            {advance_notice_days}d notice
          </span>
        ) : (
          <span
            title="Can be applied for on the same day"
            className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-gray-500"
          >
            same day
          </span>
        )}
        {source === "policy" && (
          <span
            title="This type comes from the company policy document"
            className="px-1.5 py-0.5 text-[10px] rounded bg-[#05DC7F]/10 text-[#05DC7F]/80"
          >
            policy
          </span>
        )}
      </div>

      {/* ── Used ── */}
      {!unlimited && used_days > 0 && (
        <p className="text-gray-600 text-[10px] mt-2">{used_days} days used</p>
      )}
    </div>
  );
}

export default function EmployeeLeave() {
  const token = localStorage.getItem("token");
  const employeeId = localStorage.getItem("user_id");
  const fileInputRef = useRef(null);

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const [balances, setBalances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null); // {type, text, detail}
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);

  // ──── No new Date() during render — once, on mount ────
  const [today, setToday] = useState(() => pktDateStr());
  // ──── N days after `today` (pure — no Date.now()) ────
  const dateAfter = (days) => {
    const [y, m, d] = today.split("-").map(Number);
    return localDateStr(new Date(y, m - 1, d + days));
  };

  const [form, setForm] = useState({
    leave_type: "annual",
    start_date: today,
    end_date: today,
    reason: "",
  });
  const [certificate, setCertificate] = useState(null);

  const [filter, setFilter] = useState("All");
  const [page, setPage] = useState(1);
  const rowsPerPage = 6;

  // ══════════════════════════════════════
  // Fetch
  // ══════════════════════════════════════
  const fetchAll = useCallback(async () => {
    try {
      const [balRes, histRes] = await Promise.all([
        fetch(`${API}/leave/balance/${employeeId}`, { headers: authHeaders }),
        fetch(`${API}/leave/history/${employeeId}`, { headers: authHeaders }),
      ]);
      const bal = await balRes.json();
      const hist = await histRes.json();

      if (balRes.ok) setBalances(bal.balances || []);
      if (histRes.ok) setHistory(hist.history || []);
    } catch {
      setError("Could not connect to the server");
    }
    setLoading(false);
  }, [employeeId, authHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ──── If the selected type is out of balance, switch to the first usable one ────
  // Otherwise the form opens with a blocked type selected and Submit never enables
  useEffect(() => {
    if (!balances.length) return;
    const current = balances.find((b) => b.leave_type === form.leave_type);
    if (!current || current.unlimited || current.remaining_days > 0) return;

    const usable = balances.find(
      (b) => b.unlimited || b.remaining_days > 0,
    );

    if (usable) setForm((f) => ({ ...f, leave_type: usable.leave_type }));
  }, [balances, form.leave_type]);

  // ──── Keep the PKT date fresh even if the page stays open ────
  // Otherwise, once midnight passes, the Cancel button keeps showing on a
  // leave that has already started (and the server rejects it)
  useEffect(() => {
    const id = setInterval(() => {
      const now = pktDateStr();
      setToday((prev) => (prev === now ? prev : now));
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // ══════════════════════════════════════
  // Derived — live preview for the form
  // ══════════════════════════════════════
  const selectedBalance = balances.find(
    (b) => b.leave_type === form.leave_type,
  );

  const calendarDays = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const s = new Date(form.start_date);
    const e = new Date(form.end_date);
    const diff = Math.round((e - s) / 86400000) + 1;
    return diff > 0 ? diff : 0;
  }, [form.start_date, form.end_date]);

  // ──── This type's own rules (sent by the server) ────
  const noticeDays = selectedBalance?.advance_notice_days ?? 0;
  // A past date is still allowed when notice is 0 (sick/emergency)
  const minStartDate = noticeDays > 0 ? dateAfter(noticeDays) : undefined;

  const dateError =
    form.end_date && form.start_date && form.end_date < form.start_date
      ? "End date cannot be before the start date"
      : minStartDate && form.start_date < minStartDate
        ? `${selectedBalance?.label || form.leave_type} needs at least ${noticeDays} ` +
          `day(s) notice — the earliest possible date is ${minStartDate}`
        : null;

  // ──── Balance fully used up — this type cannot be applied for ────
  const balanceEmpty = (b) => b && !b.unlimited && b.remaining_days <= 0;
  const typeBlocked = balanceEmpty(selectedBalance);

  // ──── Some types cannot be applied for without a certificate ────
  const certRequired = !!selectedBalance?.requires_certificate;
  const certMissing = certRequired && !certificate;

  // ──── A reason is required for every type ────
  // HR decides on it and reads it alongside the company policy — an empty
  // reason leaves everyone in the dark
  const reasonText = form.reason.trim();
  const reasonMissing = reasonText.length < MIN_REASON;

  const canSubmit =
    !submitting && !dateError && !typeBlocked && !certMissing && !reasonMissing;

  // ══════════════════════════════════════
  // Submit
  // ══════════════════════════════════════
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage(null);

    if (dateError) {
      setError(dateError);
      return;
    }
    if (typeBlocked) {
      setError(
        `Your ${form.leave_type} leave balance is finished — you cannot apply for this type`,
      );
      return;
    }
    if (certMissing) {
      setError(
        `A medical certificate must be attached with ${selectedBalance?.label || form.leave_type}`,
      );
      return;
    }
    if (reasonMissing) {
      setError(
        reasonText.length === 0
          ? "Please give a reason for your leave"
          : `Please give a little more detail (at least ${MIN_REASON} characters)`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const body = new FormData();
      body.append("employee_id", employeeId);
      body.append("leave_type", form.leave_type);
      body.append("start_date", form.start_date);
      body.append("end_date", form.end_date);
      body.append("reason", form.reason);
      if (certificate) body.append("medical_certificate", certificate);

      const res = await fetch(`${API}/leave/request`, {
        method: "POST",
        headers: authHeaders, // FormData sets Content-Type itself
        body,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Your leave request could not be submitted");
        setSubmitting(false);
        return;
      }

      setMessage({
        type: "pending",
        text: "Request sent — waiting for HR approval",
        detail: data.reason,
        days: data.deductible_days,
        total: data.total_days,
        policy: data.policy_reference,
        recommendation: data.agent_recommendation,
        autoAt: data.auto_approve_at,
        autoHours: data.auto_approve_hours,
      });

      // ──── Form reset ────
      setForm({
        leave_type: "annual",
        start_date: today,
        end_date: today,
        reason: "",
      });
      setCertificate(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      await fetchAll();
    } catch {
      setError("Server error");
    }
    setSubmitting(false);
  };

  // ══════════════════════════════════════
  // Cancel
  // ══════════════════════════════════════
  const handleCancel = async (leaveId) => {
    setCancelling(leaveId);
    setError("");
    try {
      const res = await fetch(`${API}/leave/cancel/${leaveId}`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by employee" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Could not cancel this request");
      } else {
        setMessage({
          type: "pending",
          text: "Leave cancelled",
          detail: data.days_restored
            ? `${data.days_restored} day(s) returned to your balance`
            : null,
        });
        await fetchAll();
      }
    } catch {
      setError("Server error");
    }
    setCancelling(null);
  };

  const viewCertificate = async (leaveId) => {
    try {
      const res = await fetch(`${API}/leave/certificate/${leaveId}`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        setError("Certificate is not available");
        return;
      }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      setError("Could not load the certificate");
    }
  };

  // ══════════════════════════════════════
  // History filter
  // ══════════════════════════════════════
  const FILTERS = ["All", "pending", "approved", "rejected", "cancelled"];
  const filtered =
    filter === "All" ? history : history.filter((h) => h.status === filter);

  // Counts on the chips — how many requests each filter holds, before clicking
  const filterCounts = history.reduce(
    (acc, h) => ({ ...acc, [h.status]: (acc[h.status] || 0) + 1 }),
    { All: history.length },
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const rows = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const canCancel = (item) =>
    item.status === "pending" ||
    (item.status === "approved" && item.start_date > today);

  if (loading) {
    return (
      <div className="w-full flex flex-col gap-6 p-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-white/[0.07] bg-white/[0.02] animate-pulse"
            />
          ))}
        </div>
        <Panel>
          <TableSkeleton rows={5} cols={4} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-6 p-4">
      {/* ── Alerts ── */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm flex justify-between items-start gap-3">
          <span>{error}</span>
          <button onClick={() => setError("")} className="shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {message && (
        <div
          className={`p-4 rounded-lg border text-sm flex justify-between items-start gap-3 ${
            message.type === "approved"
              ? "bg-[#05DC7F]/15 border-[#05DC7F]/50 text-[#05DC7F]"
              : "bg-yellow-500/15 border-yellow-500/50 text-yellow-300"
          }`}
        >
          <div className="flex flex-col gap-1">
            <span className="font-semibold">{message.text}</span>

            {message.days != null && (
              <span className="text-gray-400 text-xs">
                {message.total} calendar days — {" "}
                <b className="text-white">{message.days} working days</b> will be
                deducted from your balance
              </span>
            )}

            {message.detail && (
              <span className="text-gray-400 text-xs flex items-start gap-1.5 mt-1">
                <Info size={12} className="mt-0.5 shrink-0" />
                {message.detail}
              </span>
            )}

            {message.recommendation === "approve" && (
              <span className="text-[#05DC7F] text-xs">
                Checked against the leave policy — awaiting HR approval
              </span>
            )}

            {message.autoAt && (
              <span className="text-gray-400 text-xs">
                You can expect a response by{" "}
                <b className="text-white">{prettyDateTime(message.autoAt)}</b>
              </span>
            )}

            {message.policy && (
              <span className="text-gray-500 text-xs italic">
                Policy: {message.policy}
              </span>
            )}
          </div>
          <button onClick={() => setMessage(null)} className="shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Balances ── */}
      <div>
        <h2 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="text-[#05DC7F]" size={20} /> Leave Balance{" "}
          <span className="text-gray-500 text-sm font-normal">
            {new Date().getFullYear()}
          </span>
        </h2>
        {balances.length === 0 ? (
          <div className="p-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400/90 text-sm">
            No leave types have been set up yet — please contact HR.
          </div>
        ) : (
          // auto-FIT (not auto-fill) — empty tracks collapse, so when a type
          // is removed the remaining cards stretch to fill the row.
          // auto-fill used to leave a gap behind.
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
            }}
          >
            {balances.map((b) => (
              <BalanceCard key={b.leave_type} balance={b} />
            ))}
          </div>
        )}
      </div>

      {/* ── Apply form ── */}
      <div className="rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-5">
        <h2 className="text-white text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="text-[#05DC7F]" size={20} /> Apply for Leave
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Leave type */}
          <div>
            <p className="text-gray-400 text-sm mb-2">Leave Type</p>
            <div className="flex flex-wrap gap-2">
              {balances.map((bal) => {
                const active = form.leave_type === bal.leave_type;
                const empty = balanceEmpty(bal);
                return (
                  <button
                    key={bal.leave_type}
                    type="button"
                    disabled={empty}
                    title={
                      empty
                        ? `Your ${bal.label} balance is finished — you cannot apply for it`
                        : typeHint(bal)
                    }
                    onClick={() => {
                      // ──── Push the dates forward by this type's notice ────
                      const notice = bal.advance_notice_days || 0;
                      const minDate =
                        notice > 0 ? dateAfter(notice) : form.start_date;
                      const bump = notice > 0 && form.start_date < minDate;
                      setForm({
                        ...form,
                        leave_type: bal.leave_type,
                        start_date: bump ? minDate : form.start_date,
                        end_date:
                          bump && form.end_date < minDate
                            ? minDate
                            : form.end_date,
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${
                      empty
                        ? "text-gray-600 border-gray-800 line-through cursor-not-allowed"
                        : active
                          ? "bg-[#05DC7F] text-black border-[#05DC7F]"
                          : "text-gray-400 border-gray-700 hover:border-[#05DC7F]/50"
                    }`}
                  >
                    {bal.label?.replace(/\s*leave\s*/i, "") || bal.leave_type}
                    <span
                      className={
                        empty
                          ? "text-red-500/70"
                          : active
                            ? "opacity-70"
                            : "text-gray-600"
                      }
                    >
                      {" "}
                      ({bal.unlimited ? "∞" : bal.remaining_days})
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedBalance && (
              <p className="text-gray-500 text-xs mt-2">
                {typeHint(selectedBalance)}
                {selectedBalance.source === "policy" && (
                  <span className="text-[#05DC7F]"> · from the policy document</span>
                )}
              </p>
            )}
            {/* Anything about money gets lost in a faint grey hint — it
                deserves its own line, in its own colour */}
            {selectedBalance?.is_paid === false && (
              <p className="text-orange-400/90 text-xs mt-1">
                This leave is unpaid — one day's salary will be deducted for
                every working day of it
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Start Date</p>
              <input
                type="date"
                required
                min={minStartDate}
                value={form.start_date}
                onChange={(e) =>
                  setForm({
                    ...form,
                    start_date: e.target.value,
                    end_date:
                      form.end_date < e.target.value
                        ? e.target.value
                        : form.end_date,
                  })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">End Date</p>
              <input
                type="date"
                required
                min={form.start_date}
                value={form.end_date}
                onChange={(e) =>
                  setForm({ ...form, end_date: e.target.value })
                }
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Live preview */}
          {calendarDays > 0 && !dateError && (
            <div className="text-xs text-gray-400 bg-black/30 border border-[#05DC7F]/15 rounded-lg px-3 py-2">
              <b className="text-white">{calendarDays}</b> calendar days
              <span className="text-gray-600"> · </span>
              weekends and off-days are not deducted from your balance — the
              exact figure is worked out from the company policy
            </div>
          )}
          {dateError && <p className="text-red-400 text-xs">{dateError}</p>}

          {typeBlocked && (
            <p className="text-red-400 text-xs">
              Your {form.leave_type} leave balance is finished — you cannot
              apply for this type. Please use unpaid leave or ask HR to review
              your balance.
            </p>
          )}

          {/* Reason — required for every type */}
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <p className="text-gray-400 text-sm">
                Reason <span className="text-red-400">*</span>
              </p>
              {reasonText.length > 0 && reasonMissing && (
                <span className="text-red-400 text-xs">
                  {MIN_REASON - reasonText.length} more characters
                </span>
              )}
            </div>
            <textarea
              rows={2}
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Tell us why you need this leave — HR reviews this alongside the company leave policy"
              className={`w-full bg-black/40 border text-white rounded-lg px-3 py-2 outline-none resize-none placeholder:text-gray-600 transition ${
                reasonText.length > 0 && reasonMissing
                  ? "border-red-500/50"
                  : "border-[#05DC7F]/30"
              }`}
            />
            {reasonText.length === 0 && (
              <p className="text-gray-500 text-xs mt-1">
                A reason is required — the request cannot be sent without one
              </p>
            )}
          </div>

          {/* Certificate */}
          <div>
            <p className="text-gray-400 text-sm mb-1">
              Medical Certificate{" "}
              {certRequired ? (
                <span className="text-red-400">
                  (REQUIRED for this leave type)
                </span>
              ) : (
                <span className="text-gray-600">(optional — PDF or image)</span>
              )}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <label
                className={`cursor-pointer px-3 py-2 rounded-lg border text-sm transition flex items-center gap-2 ${
                  certMissing
                    ? "border-red-500/50 text-red-400 hover:bg-red-500/10"
                    : "border-[#05DC7F]/30 text-[#05DC7F] hover:bg-[#05DC7F]/10"
                }`}
              >
                <Upload size={15} />
                {certificate ? "Change file" : "Choose file"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setCertificate(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {certificate && (
                <span className="text-gray-400 text-xs flex items-center gap-2">
                  <Paperclip size={12} />
                  {certificate.name} (
                  {Math.round(certificate.size / 1024)} KB)
                  <button
                    type="button"
                    onClick={() => {
                      setCertificate(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X size={13} />
                  </button>
                </span>
              )}
            </div>

            {certMissing && (
              <p className="text-red-400 text-xs mt-2">
                A medical certificate must be attached with this leave type.
                If you do not have one, please use casual or emergency leave.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full md:w-auto md:self-start px-6 py-2.5 rounded-lg font-medium bg-[#05DC7F] text-black hover:bg-[#04c56f] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Sending your request...
              </>
            ) : (
              "Submit Request"
            )}
          </button>
        </form>
      </div>

      {/* ── History ── */}
      <Panel
        title="My Requests"
        icon={CalendarDays}
        actions={
          <IconButton
            icon={RefreshCw}
            label="Reload"
            onClick={fetchAll}
          />
        }
      >
        <div className="mb-4">
          <FilterChips
            options={FILTERS}
            value={filter}
            onChange={(f) => {
              setFilter(f);
              setPage(1);
            }}
            counts={filterCounts}
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={history.length === 0 ? Inbox : Search}
            title={
              history.length === 0
                ? "No leave requests yet"
                : `No requests under "${filter}"`
            }
            hint={
              history.length === 0
                ? "Pick a leave type above and send your first request."
                : "Try another filter, or go back to All."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700 text-sm">
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-left">Dates</th>
                    <th className="py-3 px-4 text-left">Days</th>
                    <th className="py-3 px-4 text-left">Decision</th>
                    <th className="py-3 px-4 text-left">Status</th>
                    <th className="py-3 px-4 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((item) => (
                    <tr
                      key={item.leave_id}
                      className="border-b border-gray-700 hover:bg-[#05DC7F]/5 transition align-top"
                    >
                      <td className="py-3 px-4">
                        <span className="text-white text-sm capitalize">
                          {item.leave_type}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-300 text-sm whitespace-nowrap">
                        {prettyDate(item.start_date)}
                        {item.start_date !== item.end_date && (
                          <> — {prettyDate(item.end_date)}</>
                        )}
                      </td>

                      <td className="py-3 px-4 text-sm">
                        <span className="text-white">
                          {item.deductible_days}
                        </span>
                        {item.total_days !== item.deductible_days && (
                          <span
                            className="text-gray-500 text-xs"
                            title={`${item.total_days} calendar days, of which ${item.deductible_days} working days are deducted`}
                          >
                            {" "}
                            / {item.total_days}
                          </span>
                        )}
                      </td>

                      {/* ── Decision ──
                          HR's note comes FIRST — that is the real decision.
                          The policy note used to be checked first, which is
                          why HR's reason for rejecting never showed at all. */}
                      <td className="py-3 px-4 max-w-xs">
                        {item.ceo_note && (
                          <div
                            className={`mb-1 pl-2 border-l-2 ${
                              item.status === "rejected"
                                ? "border-red-500/50"
                                : item.status === "approved"
                                  ? "border-[#05DC7F]/50"
                                  : "border-gray-600"
                            }`}
                          >
                            <p className="text-gray-500 text-[10px] uppercase tracking-wide">
                              HR
                            </p>
                            <p
                              className={`text-xs ${
                                item.status === "rejected"
                                  ? "text-red-400/90"
                                  : "text-gray-300"
                              }`}
                            >
                              {item.ceo_note}
                            </p>
                          </div>
                        )}

                        {item.agent_reason && (
                          <p
                            className="text-gray-500 text-[11px] flex items-start gap-1"
                            title="Note from the leave policy"
                          >
                            <Info size={10} className="mt-0.5 shrink-0" />
                            {item.agent_reason}
                          </p>
                        )}

                        {!item.ceo_note && !item.agent_reason && (
                          <span className="text-gray-600 text-xs">—</span>
                        )}

                        {item.policy_reference && (
                          <p className="text-gray-600 text-[10px] italic mt-0.5">
                            {item.policy_reference}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <Pill tone={STATUS_TONE[item.status] || "muted"}>
                          {STATUS_ICON[item.status]}
                          {item.status}
                        </Pill>

                        {/* ── When the employee can expect an answer ── */}
                        {item.status === "pending" && item.auto_approve_at && (
                          <p className="text-gray-500 text-[10px] mt-1">
                            reply by {prettyDateTime(item.auto_approve_at)}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          {item.has_medical_cert && (
                            <button
                              onClick={() => viewCertificate(item.leave_id)}
                              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <Paperclip size={11} /> Certificate
                            </button>
                          )}
                          {canCancel(item) && (
                            <button
                              onClick={() => handleCancel(item.leave_id)}
                              disabled={cancelling === item.leave_id}
                              className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                            >
                              {cancelling === item.leave_id
                                ? "Cancelling..."
                                : "Cancel"}
                            </button>
                          )}
                          {!item.has_medical_cert && !canCancel(item) && (
                            <span className="text-gray-600 text-xs">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </div>
  );
}
