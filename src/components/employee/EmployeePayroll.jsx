"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Download,
  FileText,
  ChevronDown,
  RefreshCw,
  AlertTriangle,
  Clock,
  CalendarDays,
  Receipt,
  Info,
  X,
  Landmark,
} from "lucide-react";
import {
  Panel,
  IconButton,
  Pill,
  StatCard,
  EmptyState,
  TableSkeleton,
  Th,
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

const money = (n, currency = "PKR") =>
  n == null
    ? "—"
    : `${currency} ${Number(n).toLocaleString("en-PK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

const compact = (n) =>
  n == null
    ? "—"
    : Number(n).toLocaleString("en-PK", { maximumFractionDigits: 0 });

export default function EmployeePayroll() {
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const [slips, setSlips] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState(null); // the slip currently expanded

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [sRes, pRes, lRes] = await Promise.all([
        fetch(`${API}/payroll/slips`, { headers: authHeaders }),
        fetch(`${API}/payroll/policy`, { headers: authHeaders }),
        fetch(`${API}/payroll/loans`, { headers: authHeaders }),
      ]);
      const [s, p, l] = await Promise.all([
        sRes.json(), pRes.json(), lRes.json(),
      ]);
      if (sRes.ok) setSlips(s.slips || []);
      else setError(s.detail || "Could not load your slips");
      if (pRes.ok) setPolicy(p.policy);
      if (lRes.ok) setLoans(l.loans || []);
    } catch {
      setError("Could not connect to the server");
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ──── Full breakdown of one slip ────
  const openSlip = async (payslipId) => {
    if (open?.payslip_id === payslipId) {
      setOpen(null);
      return;
    }
    setBusy(`open-${payslipId}`);
    try {
      const res = await fetch(`${API}/payroll/slip/${payslipId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) setOpen(data.slip);
      else setError(data.detail || "Could not load the breakdown");
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  // ──── PDF download ────
  // Needs an auth header, so a plain link will not do — fetch, then blob
  const download = async (payslipId, period) => {
    setBusy(`dl-${payslipId}`);
    try {
      const res = await fetch(`${API}/payroll/slip/${payslipId}/download`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "PDF not found");
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `salary-slip-${period}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Download failed");
    }
    setBusy("");
  };

  const latest = slips[0];
  const thisYear = String(new Date().getFullYear());
  const ytd = slips
    .filter((s) => String(s.period).startsWith(thisYear))
    .reduce((sum, s) => sum + (Number(s.net_salary) || 0), 0);

  return (
    <div className="w-full flex flex-col gap-5 p-1">
      {error && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-rose-400/12 border border-rose-400/30 text-rose-300 text-sm">
          <span className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {error}
          </span>
          <IconButton icon={X} label="Dismiss" onClick={() => setError("")} />
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={Wallet}
          label="Latest salary"
          value={latest ? compact(latest.net_salary) : "—"}
          sub={latest ? latest.period_label : "no slips yet"}
          tone={latest ? "ok" : "muted"}
        />
        <StatCard
          icon={Receipt}
          label={`Total in ${thisYear}`}
          value={ytd ? compact(ytd) : "—"}
          sub={`${slips.filter((s) => String(s.period).startsWith(thisYear)).length} slips`}
        />
        <StatCard
          icon={FileText}
          label="All slips"
          value={slips.length}
          sub="ready to download"
        />
      </div>

      {/* ── Company rules ──
          Employees should know how deductions are worked out — exactly
          the way they should know their working hours */}
      {policy && (
        <Panel title="Company payroll rules" icon={Info}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
            <Fact
              label="Overtime"
              value={`${policy.overtime_multiplier}x`}
              note="multiple of the normal rate"
            />
            <Fact
              label="Late arrival"
              value={
                policy.late_deduction_policy === "none"
                  ? "No deduction"
                  : policy.late_deduction_policy === "pro_rata"
                    ? "Based on time"
                    : compact(policy.late_deduction_amount)
              }
              note={
                policy.late_deduction_policy === "pro_rata"
                  ? "minutes after grace, at your hourly rate"
                  : policy.late_deduction_policy === "per_occurrence"
                    ? "each occurrence"
                    : policy.late_deduction_policy === "per_minute"
                      ? "per minute"
                      : null
              }
            />
            <Fact
              label="Unpaid leave"
              value={
                policy.unpaid_leave_deduction === "pro_rata"
                  ? "Deducted"
                  : "Not deducted"
              }
              note="per day"
            />
            <Fact
              label="Absence"
              value={
                policy.absent_deduction === "per_day"
                  ? "Full day deducted"
                  : "Not deducted"
              }
              note={
                policy.absent_deduction === "per_day"
                  ? "when absent without approved leave"
                  : null
              }
            />
            <Fact
              label="Tax"
              value={policy.tax_percentage ? `${policy.tax_percentage}%` : "None"}
              note={
                policy.tax_threshold
                  ? `only above ${compact(policy.tax_threshold)}`
                  : null
              }
            />
          </div>
        </Panel>
      )}

      {/* ── My loans ──
          Employees have a right to know how much they still owe — they
          should not have to open a slip every month to find out */}
      {loans.filter((l) => l.status === "active").length > 0 && (
        <Panel title="My Loans" icon={Landmark}>
          <div className="flex flex-col gap-3">
            {loans
              .filter((l) => l.status === "active")
              .map((l) => (
                <div key={l.loan_id}>
                  <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                    <span className="text-white text-sm">
                      {l.title}
                      <span className="text-gray-500 text-xs">
                        {" "}
                        · {compact(l.installment)}/month
                      </span>
                    </span>
                    <span className="text-sky-300 text-sm font-semibold tabular-nums">
                      {money(l.remaining, "PKR")} remaining
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, l.progress_pct || 0)}%` }}
                    />
                  </div>
                  <p className="text-gray-600 text-[10.5px] mt-1">
                    {compact(l.paid)} repaid · {compact(l.principal)} total
                  </p>
                </div>
              ))}
          </div>
        </Panel>
      )}

      {/* ── Slips ── */}
      <Panel
        title="My Salary Slips"
        icon={CalendarDays}
        actions={
          <IconButton
            icon={RefreshCw}
            label="Reload"
            busy={loading}
            onClick={fetchAll}
          />
        }
      >
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : slips.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No salary slips yet"
            hint="Once HR processes payroll for the month, your slip will appear here and you will also receive it by email."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {slips.map((s) => (
              <div
                key={s.payslip_id}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] overflow-hidden"
              >
                {/* Row */}
                <div className="flex items-center justify-between gap-3 p-3.5 flex-wrap">
                  <button
                    onClick={() => openSlip(s.payslip_id)}
                    className="flex items-center gap-3 min-w-0 text-left flex-1 hover:opacity-80 transition"
                  >
                    <ChevronDown
                      size={15}
                      className={`text-gray-500 shrink-0 transition-transform ${
                        open?.payslip_id === s.payslip_id ? "rotate-180" : ""
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold">
                        {s.period_label}
                      </p>
                      <p className="text-gray-500 text-xs">
                        gross {compact(s.gross_pay)} · deductions{" "}
                        {compact(s.total_deductions)}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[#05DC7F] text-base font-bold tabular-nums">
                        {money(s.net_salary, s.currency)}
                      </p>
                      {s.email_sent_at && (
                        <p className="text-gray-600 text-[10.5px]">
                          email {s.email_sent_at.slice(0, 10)}
                        </p>
                      )}
                    </div>
                    <IconButton
                      icon={Download}
                      label="Download PDF"
                      tone="ok"
                      disabled={!s.has_pdf}
                      busy={busy === `dl-${s.payslip_id}`}
                      onClick={() => download(s.payslip_id, s.period)}
                    />
                  </div>
                </div>

                {/* Breakdown */}
                {open?.payslip_id === s.payslip_id && (
                  <SlipDetail slip={open} />
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Fact({ label, value, note }) {
  return (
    <div className="min-w-0">
      <p className="text-gray-500 text-[10.5px] uppercase tracking-wider">
        {label}
      </p>
      <p className="text-white text-sm font-semibold mt-0.5 truncate">{value}</p>
      {note && <p className="text-gray-600 text-[10.5px] truncate">{note}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════
   Full breakdown of one slip
   ══════════════════════════════════════════ */
function SlipDetail({ slip }) {
  const e = slip.earnings || {};
  const d = slip.deductions || {};
  const att = slip.attendance || {};
  const cur = slip.currency || "PKR";

  // Only lines that actually have a value — showing zero rows makes the
  // slip look crowded and buries what matters
  const earnRows = [
    ["Base Salary", e.base_salary],
    ["Allowances", e.allowances_total],
    ["Overtime", e.overtime_pay],
    ["Incentive Pay", e.incentive_pay],
    ["Arrears", e.arrears],
    ["Bonus", e.bonus],
    ["Commission", e.commission],
    ["Other Earnings", e.other_earnings],
  ].filter(([, v]) => v > 0);

  const loanInfo = (att.loans || [])[0];
  const dedRows = [
    ["Late arrival", d.late_deduction],
    ["Short hours", d.undertime_deduction],
    ["Unpaid leave", d.unpaid_leave_deduction],
    ["Absence", d.absent_deduction],
    ["Income Tax", d.tax_deduction],
    ["Provident Fund", d.provident_fund],
    [
      loanInfo ? `Loan — ${loanInfo.title}` : "Loan / Advance",
      d.loan_deduction,
    ],
    ["Other Deductions", d.other_deductions],
  ].filter(([, v]) => v > 0);

  return (
    <div className="px-4 pb-4 pt-1 border-t border-white/[0.07] flex flex-col gap-4">
      {/* Attendance — the "why" behind every deduction */}
      <div>
        <p className="text-gray-500 text-[10.5px] uppercase tracking-wider mb-2 mt-3">
          Attendance this month
        </p>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {[
            ["Working days", att.working_days_in_month],
            ["Present", att.present_days],
            ["Net hours", att.total_net_hours],
            ["Overtime", `${Math.round((att.overtime_minutes || 0) / 6) / 10} h`],
            ["Late", `${att.late_count || 0}x`],
            ["Paid leave", att.paid_leave_days],
            ["Unpaid leave", att.unpaid_leave_days],
          ].map(([k, v]) => (
            <span key={k} className="text-gray-500">
              {k}: <b className="text-gray-200 tabular-nums">{v ?? "—"}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Earnings | Deductions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Ledger
          title="Earnings"
          rows={earnRows}
          total={["Gross Pay", e.gross_pay]}
          currency={cur}
          tone="ok"
        />
        <Ledger
          title="Deductions"
          rows={dedRows.length ? dedRows : [["No deductions", 0]]}
          total={["Total deductions", d.total_deductions]}
          currency={cur}
          tone="bad"
        />
      </div>

      {/* Loan balance — employees should not only see how much was
          deducted, but also how much is STILL owed */}
      {loanInfo && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-sky-400/25 bg-sky-400/[0.06] px-3.5 py-2.5">
          <span className="text-sky-300 text-xs">
            {loanInfo.title} — {compact(loanInfo.installment)} deducted this month
          </span>
          <span className="text-sky-300 text-xs font-semibold tabular-nums">
            {compact(loanInfo.remaining_after)} remaining
          </span>
        </div>
      )}

      {/* Net */}
      <div className="flex items-center justify-between gap-3 rounded-xl bg-[#05DC7F]/10 border border-[#05DC7F]/25 px-4 py-3">
        <span className="text-[#05DC7F] text-sm font-semibold">Net Salary</span>
        <span className="text-[#05DC7F] text-lg font-bold tabular-nums">
          {money(slip.net_salary, cur)}
        </span>
      </div>

      {/* Warnings */}
      {slip.warnings?.length > 0 && (
        <div className="rounded-lg border border-amber-400/25 bg-amber-400/[0.06] p-3">
          <p className="text-amber-400 text-[11px] font-semibold mb-1">
            Please note
          </p>
          <ul className="text-amber-300/80 text-xs list-disc list-inside">
            {slip.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Every step of the calculation ──
          This is what settles the argument: the answer to "where did
          this number come from" lives inside the slip itself */}
      {slip.calculation_steps?.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-gray-500 text-xs hover:text-gray-300 transition list-none flex items-center gap-1.5">
            <ChevronDown
              size={13}
              className="transition-transform group-open:rotate-180"
            />
            How were these figures calculated?
          </summary>
          <div className="mt-2 rounded-lg bg-black/30 border border-white/[0.06] p-3">
            <ul className="flex flex-col gap-1.5">
              {slip.calculation_steps.map((step, i) => (
                <li
                  key={i}
                  className="text-gray-400 text-[11px] font-mono leading-relaxed"
                >
                  {step}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}

function Ledger({ title, rows, total, currency, tone }) {
  const accent = tone === "ok" ? "text-[#05DC7F]" : "text-rose-400";
  return (
    <div className="rounded-xl border border-white/[0.07] overflow-hidden">
      <div className="flex items-center justify-between px-3.5 py-2 bg-white/[0.03]">
        <span className="text-gray-400 text-[10.5px] uppercase tracking-wider font-semibold">
          {title}
        </span>
        <span className="text-gray-600 text-[10.5px]">{currency}</span>
      </div>
      <div className="flex flex-col">
        {rows.map(([label, val]) => (
          <div
            key={label}
            className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.05]"
          >
            <span className="text-gray-400 text-xs">{label}</span>
            <span className="text-gray-200 text-xs tabular-nums">
              {compact(val)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-t border-white/15">
          <span className="text-white text-xs font-semibold">{total[0]}</span>
          <span className={`text-sm font-bold tabular-nums ${accent}`}>
            {compact(total[1])}
          </span>
        </div>
      </div>
    </div>
  );
}
