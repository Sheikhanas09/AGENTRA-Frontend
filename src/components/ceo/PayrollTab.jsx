"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wallet,
  Play,
  CheckCircle2,
  Users,
  RefreshCw,
  Download,
  Mail,
  FileText,
  AlertTriangle,
  Settings2,
  Building2,
  Upload,
  X,
  Save,
  Receipt,
  TrendingUp,
  Ban,
  Sparkles,
  Landmark,
  Plus,
  Trash2,
  CalendarDays,
  FileCheck2,
} from "lucide-react";
import {
  Panel,
  IconButton,
  Button,
  Pill,
  StatCard,
  FilterChips,
  EmptyState,
  TableSkeleton,
  Select,
  Th,
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

// ──────────────────────────────────────────
// One way to display money
// ──────────────────────────────────────────
// The backend sends a Decimal (fixed at two places). All we do here is
// add separators — no arithmetic. The arithmetic happens only on the
// server, or the UI and the slip could disagree.
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

const periodLabel = (p) => {
  if (!p) return "—";
  const [y, m] = String(p).split("-").map(Number);
  if (!y || !m) return p;
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const RUN_TONE = {
  completed: "ok",
  pending_approval: "warn",
  processing: "info",
  failed: "bad",
  cancelled: "muted",
};

const RUN_LABEL = {
  completed: "Approved",
  pending_approval: "Needs your response",
  processing: "Running",
  failed: "Nakaam",
  cancelled: "Cancelled",
};

export default function PayrollTab() {
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );
  const jsonHeaders = useMemo(
    () => ({ ...authHeaders, "Content-Type": "application/json" }),
    [authHeaders],
  );

  const [tab, setTab] = useState("runs");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [runs, setRuns] = useState([]);
  const [structures, setStructures] = useState([]);
  const [missing, setMissing] = useState(0);
  const [policy, setPolicy] = useState(null);
  const [branding, setBranding] = useState(null);

  const [detail, setDetail] = useState(null); // the run currently open

  // Last month — payroll is normally run for a month that has ended
  const [period, setPeriod] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // ══════════════════════════════════════
  // Fetch
  // ══════════════════════════════════════
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rRes, sRes, pRes, bRes] = await Promise.all([
        fetch(`${API}/payroll/runs`, { headers: authHeaders }),
        fetch(`${API}/payroll/salary-structures`, { headers: authHeaders }),
        fetch(`${API}/payroll/policy`, { headers: authHeaders }),
        fetch(`${API}/payroll/branding`, { headers: authHeaders }),
      ]);
      const [r, s, p, b] = await Promise.all([
        rRes.json(), sRes.json(), pRes.json(), bRes.json(),
      ]);
      if (rRes.ok) setRuns(r.runs || []);
      if (sRes.ok) {
        setStructures(s.structures || []);
        setMissing(s.missing || 0);
      }
      if (pRes.ok) setPolicy(p.policy);
      if (bRes.ok) setBranding(b.branding);
    } catch {
      setError("Could not connect to the server");
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ══════════════════════════════════════
  // Run the payroll
  // ══════════════════════════════════════
  const runPayroll = async (force = false) => {
    setBusy("run");
    setError("");
    setNotice("");
    try {
      const res = await fetch(`${API}/payroll/run`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ period, force }),
      });
      const data = await res.json();

      if (res.status === 409) {
        // A month's payroll cannot run twice — the CEO decides whether to
        // cancel the previous run
        if (
          window.confirm(
            `${data.detail}\n\nCancel the previous run and try again?`,
          )
        ) {
          setBusy("");
          return runPayroll(true);
        }
      } else if (!res.ok) {
        setError(data.detail || "Payroll could not be run");
      } else {
        setNotice(
          `${periodLabel(period)} — ${data.employees_done} slip ban gayin` +
            (data.employees_failed
              ? `, ${data.employees_failed} reh gayin`
              : ""),
        );
        await fetchAll();
        openRun(data.run_id);
      }
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  const openRun = async (runId) => {
    setBusy(`open-${runId}`);
    try {
      const res = await fetch(`${API}/payroll/run/${runId}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (res.ok) setDetail(data);
      else setError(data.detail || "Could not open the run");
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  const approveRun = async (runId) => {
    if (
      !window.confirm(
        "Approve this payroll?\n\n" +
          "Every employee will be emailed their salary slip. " +
          "An email goes out once — it cannot be recalled.",
      )
    )
      return;

    setBusy("approve");
    setError("");
    try {
      const res = await fetch(`${API}/payroll/run/${runId}/approve`, {
        method: "POST",
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Could not approve");
      } else {
        setNotice(
          `Approved — ${data.emails_sent} email(s) sent` +
            (data.email_note ? ` (${data.email_note})` : ""),
        );
        await fetchAll();
        await openRun(runId);
      }
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  const regeneratePdfs = async (runId) => {
    setBusy("pdf");
    try {
      const res = await fetch(`${API}/payroll/run/${runId}/regenerate-pdfs`, {
        method: "POST",
        headers: jsonHeaders,
      });
      const data = await res.json();
      setNotice(res.ok ? data.message : "");
      if (!res.ok) setError(data.detail || "The PDFs could not be built");
      else await openRun(runId);
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  const resendSlip = async (payslipId) => {
    setBusy(`mail-${payslipId}`);
    try {
      const res = await fetch(`${API}/payroll/slip/${payslipId}/resend`, {
        method: "POST",
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (data.sent) setNotice(data.message);
      else setError(data.reason || data.message || "The email was not sent");
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  // ──── PDF download ────
  // The header needs a token, so a plain <a href> will not work — we fetch
  // first, then download from the blob
  const downloadSlip = async (payslipId, label) => {
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
        a.download = `salary-slip-${label || payslipId}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError("Download failed");
    }
    setBusy("");
  };

  // ══════════════════════════════════════
  // Derived
  // ══════════════════════════════════════
  const activeRuns = runs.filter((r) => r.status !== "cancelled");
  const lastRun = activeRuns[0];
  const pendingRun = activeRuns.find((r) => r.status === "pending_approval");
  const setupReady = missing === 0 && structures.length > 0;

  return (
    <div className="w-full flex flex-col gap-5 p-1">
      {/* ── Alerts ── */}
      {error && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-rose-400/12 border border-rose-400/30 text-rose-300 text-sm">
          <span className="flex items-start gap-2">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {error}
          </span>
          <IconButton icon={X} label="Dismiss" onClick={() => setError("")} />
        </div>
      )}
      {notice && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#05DC7F]/12 border border-[#05DC7F]/30 text-[#05DC7F] text-sm">
          <span>{notice}</span>
          <IconButton icon={X} label="Dismiss" onClick={() => setNotice("")} />
        </div>
      )}

      {/* ── Setup adhoora ── */}
      {!loading && missing > 0 && (
        <div className="p-3 rounded-xl bg-amber-400/12 border border-amber-400/30 text-amber-300 text-sm flex items-start gap-2">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            <b>{missing}</b> employee(s) have no salary structure — their
            slips will not be produced.{" "}
            <button
              onClick={() => setTab("salaries")}
              className="underline hover:text-amber-200"
            >
              Set it now
            </button>
          </span>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Wallet}
          label="Latest payroll"
          value={lastRun ? compact(lastRun.total_payroll_cost) : "—"}
          sub={lastRun ? periodLabel(lastRun.period) : "none run yet"}
          tone={lastRun ? "ok" : "muted"}
        />
        <StatCard
          icon={Users}
          label="Salary set"
          value={`${structures.length - missing}/${structures.length}`}
          sub={missing ? `${missing} remaining` : "all set"}
          tone={missing ? "warn" : "ok"}
          onClick={() => setTab("salaries")}
        />
        <StatCard
          icon={CheckCircle2}
          label="Needs a response"
          value={pendingRun ? 1 : 0}
          sub={pendingRun ? periodLabel(pendingRun.period) : "nothing pending"}
          tone={pendingRun ? "warn" : "muted"}
          onClick={() => pendingRun && openRun(pendingRun.run_id)}
        />
        <StatCard
          icon={TrendingUp}
          label="Kul runs"
          value={activeRuns.length}
          sub={`${runs.length - activeRuns.length} cancelled`}
        />
      </div>

      {/* ── Sub tabs ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChips
          options={[
            { value: "runs", label: "Payroll Runs" },
            { value: "salaries", label: "Salaries" },
            { value: "extras", label: "Extras" },
            { value: "loans", label: "Loans" },
            { value: "rules", label: "Rules" },
            { value: "branding", label: "Branding" },
          ]}
          value={tab}
          onChange={setTab}
          counts={{ salaries: structures.length, runs: activeRuns.length }}
        />
        <div className="ml-auto">
          <IconButton
            icon={RefreshCw}
            label="Reload"
            busy={loading}
            onClick={fetchAll}
          />
        </div>
      </div>

      {/* ══════════ RUNS ══════════ */}
      {tab === "runs" && (
        <>
          <Panel
            title="Payroll chalayein"
            icon={Play}
            subtitle="Pick a month — the salary is built from attendance and leave"
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-gray-500 text-[11px] uppercase tracking-wider">
                  Month
                </span>
                <input
                  type="month"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none [color-scheme:dark] hover:border-white/20 transition"
                />
              </label>

              <Button
                icon={Play}
                variant="primary"
                busy={busy === "run"}
                disabled={!setupReady}
                onClick={() => runPayroll(false)}
              >
                Run payroll for {periodLabel(period)}
              </Button>

              {!setupReady && (
                <span className="text-gray-500 text-xs">
                  Set everyone's salary structure first
                </span>
              )}
            </div>
          </Panel>

          <Panel title="History" icon={Receipt}>
            {loading ? (
              <TableSkeleton rows={4} cols={5} />
            ) : runs.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No payroll has been run yet"
                hint="Pick a month above and run your first payroll."
              />
            ) : (
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="min-w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0b0f0d]/95 backdrop-blur">
                    <tr className="border-b border-white/[0.08]">
                      <Th>Month</Th>
                      <Th>Status</Th>
                      <Th>Employees</Th>
                      <Th>Gross</Th>
                      <Th>Net cost</Th>
                      <Th>Chali</Th>
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr
                        key={r.run_id}
                        className={`border-b border-white/[0.05] hover:bg-white/[0.03] transition ${
                          r.status === "cancelled" ? "opacity-45" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <p className="text-white text-sm">
                            {periodLabel(r.period)}
                          </p>
                          {r.attempt > 1 && (
                            <p className="text-gray-500 text-[10px]">
                              attempt {r.attempt}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <Pill tone={RUN_TONE[r.status] || "muted"}>
                            {RUN_LABEL[r.status] || r.status}
                          </Pill>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-300 tabular-nums">
                          {r.employees_done}/{r.employees_total}
                          {r.employees_failed > 0 && (
                            <span className="text-rose-400 text-xs">
                              {" "}
                              · {r.employees_failed} nakaam
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-400 tabular-nums">
                          {compact(r.total_gross)}
                        </td>
                        <td className="py-3 px-4 text-sm text-white font-semibold tabular-nums">
                          {compact(r.total_payroll_cost)}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {r.run_at ? r.run_at.slice(0, 16).replace("T", " ") : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-1.5">
                            {r.status === "pending_approval" && (
                              <Button
                                icon={CheckCircle2}
                                tone="ok"
                                busy={busy === "approve"}
                                onClick={() => approveRun(r.run_id)}
                                className="!py-1.5 !px-3 !text-xs"
                              >
                                Approve
                              </Button>
                            )}
                            <IconButton
                              icon={FileText}
                              label="View details"
                              busy={busy === `open-${r.run_id}`}
                              onClick={() => openRun(r.run_id)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ══════════ SALARIES ══════════ */}
      {tab === "salaries" && (
        <SalarySetup
          structures={structures}
          loading={loading}
          jsonHeaders={jsonHeaders}
          onSaved={fetchAll}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {/* ══════════ EXTRAS ══════════ */}
      {tab === "extras" && (
        <AdjustmentsPanel
          period={period}
          setPeriod={setPeriod}
          structures={structures}
          authHeaders={authHeaders}
          jsonHeaders={jsonHeaders}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {/* ══════════ LOANS ══════════ */}
      {tab === "loans" && (
        <LoansPanel
          structures={structures}
          authHeaders={authHeaders}
          jsonHeaders={jsonHeaders}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {/* ══════════ RULES ══════════ */}
      {tab === "rules" && (
        <PolicyForm
          key={policy ? "policy-loaded" : "policy-empty"}
          policy={policy}
          jsonHeaders={jsonHeaders}
          onSaved={fetchAll}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {/* ══════════ BRANDING ══════════ */}
      {tab === "branding" && (
        <BrandingForm
          key={branding ? "brand-loaded" : "brand-empty"}
          branding={branding}
          authHeaders={authHeaders}
          jsonHeaders={jsonHeaders}
          onSaved={fetchAll}
          setError={setError}
          setNotice={setNotice}
        />
      )}

      {/* ══════════ RUN DETAIL ══════════ */}
      {detail && (
        <RunDetail
          detail={detail}
          busy={busy}
          onClose={() => setDetail(null)}
          onApprove={approveRun}
          onDownload={downloadSlip}
          onResend={resendSlip}
          onRegenerate={regeneratePdfs}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   Run detail
   ══════════════════════════════════════════ */
function RunDetail({
  detail, busy, onClose, onApprove, onDownload, onResend, onRegenerate,
}) {
  const run = detail.run || {};
  const slips = detail.payslips || [];
  const noPdf = slips.filter((s) => !s.has_pdf).length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl my-8 rounded-2xl border border-white/10 bg-[#0b0f0d]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Head */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-white/[0.07]">
          <div>
            <h2 className="text-white text-lg font-semibold">
              {periodLabel(run.period)}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Pill tone={RUN_TONE[run.status] || "muted"}>
                {RUN_LABEL[run.status] || run.status}
              </Pill>
              <span className="text-gray-500 text-xs">
                {run.employees_done}/{run.employees_total} slips
              </span>
              {run.attempt > 1 && (
                <span className="text-gray-500 text-xs">
                  attempt {run.attempt}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {noPdf > 0 && (
              <IconButton
                icon={RefreshCw}
                label={`Rebuild the PDF for ${noPdf} slip(s)`}
                tone="warn"
                busy={busy === "pdf"}
                onClick={() => onRegenerate(run.run_id)}
              />
            )}
            {run.status === "pending_approval" && (
              <Button
                icon={CheckCircle2}
                variant="primary"
                busy={busy === "approve"}
                onClick={() => onApprove(run.run_id)}
              >
                Approve &amp; Email
              </Button>
            )}
            <IconButton icon={X} label="Close" onClick={onClose} />
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3 p-5">
          {[
            ["Gross", run.total_gross],
            ["Deductions", run.total_deductions],
            ["Net cost", run.total_payroll_cost],
          ].map(([label, val], i) => (
            <div
              key={label}
              className={`rounded-xl border p-3 ${
                i === 2
                  ? "border-[#05DC7F]/30 bg-[#05DC7F]/8"
                  : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <p className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                {label}
              </p>
              <p
                className={`text-lg font-bold tabular-nums mt-0.5 ${
                  i === 2 ? "text-[#05DC7F]" : "text-white"
                }`}
              >
                {money(val)}
              </p>
            </div>
          ))}
        </div>

        {/* Slips */}
        <div className="px-5 pb-5">
          {slips.length === 0 ? (
            <EmptyState icon={FileText} title="No slip was produced in this run" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <Th>Employee</Th>
                    <Th>Gross</Th>
                    <Th>Deductions</Th>
                    <Th>Net</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {slips.map((s) => (
                    <tr
                      key={s.payslip_id}
                      className="border-b border-white/[0.05] hover:bg-white/[0.03] transition"
                    >
                      <td className="py-3 px-4">
                        <p className="text-white text-sm">{s.employee_name}</p>
                        {s.department && (
                          <p className="text-gray-500 text-xs">{s.department}</p>
                        )}
                        {s.warnings?.length > 0 && (
                          <p
                            className="text-amber-400 text-[10.5px] mt-1 flex items-start gap-1"
                            title={s.warnings.join("\n")}
                          >
                            <AlertTriangle size={10} className="mt-0.5 shrink-0" />
                            {s.warnings.length} warning
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400 tabular-nums">
                        {compact(s.gross_pay)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400 tabular-nums">
                        {compact(s.total_deductions)}
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-semibold tabular-nums">
                        {compact(s.net_salary)}
                      </td>
                      <td className="py-3 px-4">
                        <Pill
                          tone={
                            s.status === "sent"
                              ? "ok"
                              : s.status === "cancelled"
                                ? "muted"
                                : "info"
                          }
                        >
                          {s.status === "sent" ? "Emailed" : s.status}
                        </Pill>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-1.5">
                          <IconButton
                            icon={Download}
                            label="PDF download"
                            disabled={!s.has_pdf}
                            busy={busy === `dl-${s.payslip_id}`}
                            onClick={() =>
                              onDownload(s.payslip_id, s.employee_name)
                            }
                          />
                          <IconButton
                            icon={Mail}
                            label="Resend the email"
                            disabled={!s.has_pdf}
                            busy={busy === `mail-${s.payslip_id}`}
                            onClick={() => onResend(s.payslip_id)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Salary structures
   ══════════════════════════════════════════ */
function SalarySetup({
  structures, loading, jsonHeaders, onSaved, setError, setNotice,
}) {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const open = (row) => {
    setEditing(row.employee_id);
    setForm({
      base_salary: row.base_salary ?? "",
      house_allowance: row.house_allowance ?? 0,
      transport_allowance: row.transport_allowance ?? 0,
      medical_allowance: row.medical_allowance ?? 0,
      other_allowances: row.other_allowances ?? 0,
    });
  };

  const save = async (employeeId) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/payroll/salary-structure`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          employee_id: employeeId,
          base_salary: Number(form.base_salary) || 0,
          house_allowance: Number(form.house_allowance) || 0,
          transport_allowance: Number(form.transport_allowance) || 0,
          medical_allowance: Number(form.medical_allowance) || 0,
          other_allowances: Number(form.other_allowances) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not save");
      else {
        setNotice(data.message);
        setEditing(null);
        await onSaved();
      }
    } catch {
      setError("Server error");
    }
    setSaving(false);
  };

  const preview =
    (Number(form.base_salary) || 0) +
    (Number(form.house_allowance) || 0) +
    (Number(form.transport_allowance) || 0) +
    (Number(form.medical_allowance) || 0) +
    (Number(form.other_allowances) || 0);

  return (
    <Panel
      title="Salary Structures"
      icon={Users}
      subtitle="Each employee's base + allowances. This is what payroll is built on."
    >
      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : structures.length === 0 ? (
        <EmptyState
          icon={Users}
          title="This company has no employees"
          hint="Add employees from the Create Employee tab."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {structures.map((row) => (
            <div
              key={row.employee_id}
              className={`rounded-xl border p-3.5 transition ${
                row.is_set
                  ? "border-white/[0.07] bg-white/[0.02]"
                  : "border-amber-400/25 bg-amber-400/[0.04]"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#05DC7F]/15 border border-[#05DC7F]/25 flex items-center justify-center text-[#05DC7F] font-semibold text-xs">
                    {row.employee_name?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm truncate">
                      {row.employee_name}
                    </p>
                    <p className="text-gray-500 text-xs truncate">
                      {row.department || "—"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {row.is_set ? (
                    <div className="text-right">
                      <p className="text-white text-sm font-semibold tabular-nums">
                        {money(row.gross_fixed, row.currency)}
                      </p>
                      <p className="text-gray-500 text-[10.5px]">
                        base {compact(row.base_salary)}
                      </p>
                    </div>
                  ) : (
                    <Pill tone="warn" icon={AlertTriangle}>
                      Not set
                    </Pill>
                  )}
                  <IconButton
                    icon={Settings2}
                    label="Set the salary"
                    tone={row.is_set ? "muted" : "warn"}
                    onClick={() =>
                      editing === row.employee_id ? setEditing(null) : open(row)
                    }
                  />
                </div>
              </div>

              {editing === row.employee_id && (
                <div className="mt-4 pt-4 border-t border-white/[0.07]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      ["base_salary", "Base Salary"],
                      ["house_allowance", "House"],
                      ["transport_allowance", "Transport"],
                      ["medical_allowance", "Medical"],
                      ["other_allowances", "Other"],
                    ].map(([key, label]) => (
                      <label key={key} className="flex flex-col gap-1">
                        <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                          {label}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form[key]}
                          onChange={(e) =>
                            setForm({ ...form, [key]: e.target.value })
                          }
                          className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition tabular-nums"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                    <p className="text-gray-400 text-sm">
                      Gross fixed:{" "}
                      <b className="text-white tabular-nums">{money(preview)}</b>
                      <span className="text-gray-600 text-xs">
                        {" "}
                        — overtime and deductions on top of this
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        tone="muted"
                        icon={X}
                        onClick={() => setEditing(null)}
                        className="!py-1.5 !px-3 !text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        icon={Save}
                        busy={saving}
                        onClick={() => save(row.employee_id)}
                        className="!py-1.5 !px-3 !text-xs"
                      >
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════
   Payroll rules
   ══════════════════════════════════════════ */
// A `key` remounts this when the policy loads, so the state starts
// straight from the prop. Calling setState in an effect caused a wasted
// render, and React warns about it too.
/**
 * A marker on any field whose value came from the policy document.
 * Hovering shows the document's own line, so the CEO can verify it.
 */
function PolicyBadge({ item }) {
  if (!item) return null;
  return (
    <span
      title={item.source_quote || "From the policy document"}
      className="px-1.5 py-0.5 rounded text-[10px] bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/25 cursor-help"
    >
      from policy
    </span>
  );
}

function PolicyForm({ policy, jsonHeaders, onSaved, setError, setNotice }) {
  const [form, setForm] = useState(() => ({
    overtime_multiplier: 1.5,
    late_deduction_policy: "per_occurrence",
    late_deduction_amount: 0,
    undertime_deduction: "none",
    unpaid_leave_deduction: "pro_rata",
    absent_deduction: "per_day",
    tax_percentage: 0,
    tax_threshold: 0,
    provident_fund_percent: 0,
    ...(policy || {}),
  }));
  const [saving, setSaving] = useState(false);

  // ──── Which rules came from the policy document ────
  // These are already applied at upload time. All this does is show which
  // value the CEO set and which came from the document — otherwise the
  // CEO would never know where a number came from.
  const [fromPolicy, setFromPolicy] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/settings/policy/active`, {
          headers: jsonHeaders,
        });
        const data = await res.json();
        if (!alive || !data.policy) return;
        setFromPolicy({
          ...(data.policy.payroll_rules || {}),
          policy_label: data.policy.policy_label || data.policy.file_name,
        });
      } catch {
        /* the form still works even if the panel does not appear */
      }
    })();
    return () => {
      alive = false;
    };
  }, [jsonHeaders]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/payroll/policy`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          overtime_multiplier: Number(form.overtime_multiplier) || 0,
          late_deduction_policy: form.late_deduction_policy,
          late_deduction_amount: Number(form.late_deduction_amount) || 0,
          undertime_deduction: form.undertime_deduction,
          unpaid_leave_deduction: form.unpaid_leave_deduction,
          absent_deduction: form.absent_deduction,
          tax_percentage: Number(form.tax_percentage) || 0,
          tax_threshold: Number(form.tax_threshold) || 0,
          provident_fund_percent: Number(form.provident_fund_percent) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not save");
      else {
        setNotice(data.message);
        await onSaved();
      }
    } catch {
      setError("Server error");
    }
    setSaving(false);
  };

  const num = (key, label, hint, step = "1") => (
    <label className="flex flex-col gap-1">
      <span className="text-gray-400 text-sm flex items-center gap-2">
        {label}
        <PolicyBadge item={fromPolicy?.fields?.[key]} />
      </span>
      <input
        type="number"
        step={step}
        min="0"
        value={form[key] ?? 0}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition tabular-nums"
      />
      {hint && <span className="text-gray-600 text-[11px]">{hint}</span>}
    </label>
  );

  return (
    <Panel
      title="Payroll Rules"
      icon={Settings2}
      subtitle="One set for the whole company. Employees can see these rules too."
      actions={
        <Button variant="primary" icon={Save} busy={saving} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        {/* ──── What the policy document applied ──── */}
        {fromPolicy?.ran && (
          <div className="rounded-xl border border-[#05DC7F]/25 bg-[#05DC7F]/[0.06] p-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <FileCheck2 size={15} className="text-[#05DC7F]" />
              <span className="text-white text-sm font-semibold">
                {fromPolicy.found_count} rule(s) applied from the policy document
              </span>
              {fromPolicy.policy_label && (
                <span className="text-gray-500 text-[11px]">
                  {fromPolicy.policy_label}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-xs">
              Any rule found in the document was applied automatically and is
              marked <span className="text-[#05DC7F]">from policy</span>
              (hover to see the document's line). The rest are unchanged. You
              can edit any value here and Save.
            </p>
          </div>
        )}

        {fromPolicy && !fromPolicy.ran && fromPolicy.reason && (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-gray-400 text-xs">{fromPolicy.reason}</p>
          </div>
        )}

        {/* Overtime */}
        <div>
          <h3 className="text-white text-sm font-semibold mb-3">Overtime</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {num(
              "overtime_multiplier",
              "Overtime multiplier",
              "1.5 = one and a half times. Attendance decides how many minutes count as OT; this decides what they are worth.",
              "0.1",
            )}
          </div>
        </div>

        {/* Late */}
        <div className="pt-5 border-t border-white/[0.07]">
          <h3 className="text-white text-sm font-semibold mb-3">Late arrival</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                How it is deducted
                <PolicyBadge item={fromPolicy?.fields?.late_deduction_policy} />
              </span>
              <Select
                value={form.late_deduction_policy}
                onChange={(v) =>
                  setForm({ ...form, late_deduction_policy: v })
                }
                options={[
                  {
                    value: "pro_rata",
                    label: "Pay lost in proportion to time lost",
                    hint: "From the employee's own salary — no amount to configure",
                  },
                  {
                    value: "per_occurrence",
                    label: "A fixed amount each time",
                    hint: "One minute late or two hours — the same amount either way",
                  },
                  {
                    value: "per_minute",
                    label: "A fixed amount per minute",
                    hint: "90 minutes late = 90 x the amount",
                  },
                  {
                    value: "none",
                    label: "No deduction",
                    hint: "Nothing is deducted for arriving late",
                  },
                ]}
              />
            </div>
            {form.late_deduction_policy !== "none" &&
              form.late_deduction_policy !== "pro_rata" &&
              num("late_deduction_amount", "Amount", "PKR")}
          </div>

          {form.late_deduction_policy === "pro_rata" && (
            <p className="text-gray-500 text-xs mt-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              Example: base <b className="text-gray-300">100,000</b>, month
              with 22 working days × 8 hours ={" "}
              <b className="text-gray-300">176</b> hours &rarr; hourly{" "}
              <b className="text-gray-300">568.18</b>.
              <br />
              Someone <b className="text-gray-300">30 minutes</b> late is charged
              deduction = (30/60) × 568.18 ={" "}
              <b className="text-white">284.09</b> — and{" "}
              <b className="text-gray-300">2 minutes</b> late only{" "}
              <b className="text-white">18.94</b>.
              <br />
              <br />
              Grace-period minutes are <b className="text-gray-300">
                not
              </b>{" "}
              charged. With a 15-minute grace in Settings, someone 20 minutes
              late is only charged for{" "}
              <b className="text-gray-300">5</b> minutes — a grace period
              means exactly that those minutes are forgiven.
              <br />
              <br />
              The same hourly rate applies to overtime and short hours — an
              hour is worth the same in all three places.
            </p>
          )}
        </div>

        {/* Absence */}
        <div className="pt-5 border-t border-white/[0.07]">
          <h3 className="text-white text-sm font-semibold mb-3">
            Absence without notice
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-gray-400 text-sm flex items-center gap-2">
                Neither present nor on leave
                <PolicyBadge item={fromPolicy?.fields?.absent_deduction} />
              </span>
              <Select
                value={form.absent_deduction}
                onChange={(v) => setForm({ ...form, absent_deduction: v })}
                options={[
                  {
                    value: "per_day",
                    label: "A full day's salary is deducted per day",
                    hint: "No grace days — deducted from the first day",
                  },
                  {
                    value: "none",
                    label: "Nothing is deducted",
                    hint: "Nothing is deducted for being absent",
                  },
                ]}
              />
            </div>
          </div>

          <p className="text-gray-500 text-xs mt-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
            This is <b className="text-gray-300">different from unpaid leave</b>.
            With unpaid leave the person files a request and gets approval —
            here they are simply absent without notice.
            <br />
            A day with neither attendance nor approved leave counts as an
            absence. If payroll runs mid-month, future days are not counted —
            the count stops at today.
          </p>
        </div>

        {/* Deductions */}
        <div className="pt-5 border-t border-white/[0.07]">
          <h3 className="text-white text-sm font-semibold mb-3">
            Short hours and unpaid leave
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              ["undertime_deduction", "Short hours (undertime)"],
              ["unpaid_leave_deduction", "Unpaid leave"],
            ].map(([key, label]) => (
              <div key={key} className="flex flex-col gap-1">
                <span className="text-gray-400 text-sm flex items-center gap-2">
                  {label}
                  <PolicyBadge item={fromPolicy?.fields?.[key]} />
                </span>
                <Select
                  value={form[key]}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                  options={[
                    {
                      value: "pro_rata",
                      label: "Deducted proportionally",
                      hint: "In proportion to the time or days missed",
                    },
                    { value: "none", label: "Not deducted" },
                  ]}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tax + PF */}
        <div className="pt-5 border-t border-white/[0.07]">
          <h3 className="text-white text-sm font-semibold mb-3">
            Tax and provident fund
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {num("tax_percentage", "Tax %", null, "0.1")}
            {num(
              "tax_threshold",
              "Tax threshold",
              "Tax applies ONLY to the amount above this",
            )}
            {num(
              "provident_fund_percent",
              "Provident Fund %",
              "Charged on the base salary, not on gross",
              "0.1",
            )}
          </div>

          {Number(form.tax_percentage) > 0 && (
            <p className="text-gray-500 text-xs mt-3 bg-white/[0.02] border border-white/[0.06] rounded-lg p-3">
              Example: on a gross of <b className="text-gray-300">200,000</b>, tax ={" "}
              (200,000 − {compact(form.tax_threshold)}) ×{" "}
              {form.tax_percentage}% ={" "}
              <b className="text-white">
                {compact(
                  Math.max(
                    0,
                    200000 - (Number(form.tax_threshold) || 0),
                  ) *
                    ((Number(form.tax_percentage) || 0) / 100),
                )}
              </b>
            </p>
          )}
        </div>
      </div>
    </Panel>
  );
}

/* ══════════════════════════════════════════
   Branding
   ══════════════════════════════════════════ */
function BrandingForm({
  branding, authHeaders, jsonHeaders, onSaved, setError, setNotice,
}) {
  const [form, setForm] = useState(() => ({
    primary_color: "#05DC7F",
    company_address: "",
    contact_email: "",
    contact_phone: "",
    footer_text: "",
    ...(branding || {}),
  }));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  // The logo has to be fetched with a token, hence a blob URL
  useEffect(() => {
    let url;
    if (branding?.has_logo) {
      fetch(`${API}/payroll/branding/logo`, { headers: authHeaders })
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => {
          if (b) {
            url = URL.createObjectURL(b);
            setLogoUrl(url);
          }
        })
        .catch(() => {});
    } else {
      setLogoUrl(null);
    }
    return () => url && URL.revokeObjectURL(url);
  }, [branding, authHeaders]);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/payroll/branding`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not save");
      else {
        setNotice(data.message);
        await onSaved();
      }
    } catch {
      setError("Server error");
    }
    setSaving(false);
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/payroll/branding/logo`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "The logo was not uploaded");
      else {
        setNotice(`${data.message} (${data.size_kb} KB)`);
        await onSaved();
      }
    } catch {
      setError("Server error");
    }
    setUploading(false);
  };

  return (
    <Panel
      title="Slip Branding"
      icon={Building2}
      subtitle="All of this is printed on the salary slip PDF"
      actions={
        <Button variant="primary" icon={Save} busy={saving} onClick={save}>
          Save
        </Button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logo */}
        <div>
          <p className="text-gray-400 text-sm mb-2">Logo</p>
          <div className="flex items-center gap-4">
            <div className="w-28 h-20 rounded-xl border border-white/[0.08] bg-white/[0.03] flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <Building2 size={22} className="text-gray-600" />
              )}
            </div>
            <label className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2 text-sm text-gray-300 cursor-pointer hover:border-white/20 transition">
              {uploading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <Upload size={15} />
              )}
              {logoUrl ? "Change" : "Upload"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => uploadLogo(e.target.files?.[0])}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-gray-600 text-[11px] mt-2">
            PNG or JPG. Stored in the DB, not on disk — so it travels with
            the backup.
          </p>
        </div>

        {/* Color */}
        <div>
          <p className="text-gray-400 text-sm mb-2">Slip colour</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={form.primary_color || "#05DC7F"}
              onChange={(e) =>
                setForm({ ...form, primary_color: e.target.value })
              }
              className="w-12 h-10 rounded-lg bg-transparent border border-white/[0.08] cursor-pointer"
            />
            <input
              type="text"
              value={form.primary_color || ""}
              onChange={(e) =>
                setForm({ ...form, primary_color: e.target.value })
              }
              className="w-32 bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none"
            />
          </div>
          <p className="text-gray-600 text-[11px] mt-2">
            The slip header and the NET SALARY band use this colour.
          </p>
        </div>

        {/* The remaining fields */}
        {[
          ["company_address", "Company address", "Blue Area, Islamabad"],
          ["contact_email", "Contact email", "hr@company.com"],
          ["contact_phone", "Contact phone", "+92 51 1234567"],
        ].map(([key, label, ph]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-gray-400 text-sm">{label}</span>
            <input
              type="text"
              value={form[key] || ""}
              placeholder={ph}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition placeholder:text-gray-700"
            />
          </label>
        ))}

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-gray-400 text-sm">Footer text</span>
          <input
            type="text"
            value={form.footer_text || ""}
            placeholder="Computer generated salary slip — no signature required"
            onChange={(e) => setForm({ ...form, footer_text: e.target.value })}
            className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition placeholder:text-gray-700"
          />
        </label>
      </div>
    </Panel>
  );
}


/* ══════════════════════════════════════════
   Extras — that month's one-off items
   ══════════════════════════════════════════ */
// Incentive/arrears/bonus change every month, so they do not belong in
// the salary structure — they are entered here, month by month.
const ADJ_KINDS = [
  { value: "incentive", label: "Incentive Pay", earning: true },
  { value: "arrears", label: "Arrears", earning: true },
  { value: "bonus", label: "Bonus", earning: true },
  { value: "commission", label: "Commission", earning: true },
  { value: "other_earning", label: "Other Earning", earning: true },
  { value: "advance", label: "Advance", earning: false },
  { value: "penalty", label: "Penalty", earning: false },
  { value: "other_deduction", label: "Other Deduction", earning: false },
];

function AdjustmentsPanel({
  period, setPeriod, structures, authHeaders, jsonHeaders, setError, setNotice,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", kind: "incentive", amount: "", note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/payroll/adjustments?period=${period}`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setRows(data.adjustments || []);
    } catch {
      setError("Could not load the adjustments");
    }
    setLoading(false);
  }, [period, authHeaders, setError]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!form.employee_id || !form.amount) {
      setError("Both an employee and an amount are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/payroll/adjustment`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          employee_id: Number(form.employee_id),
          period,
          kind: form.kind,
          amount: Number(form.amount),
          note: form.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not add it");
      else {
        setNotice(data.message);
        setForm({ ...form, amount: "", note: "" });
        await load();
      }
    } catch {
      setError("Server error");
    }
    setSaving(false);
  };

  const remove = async (id) => {
    try {
      const res = await fetch(`${API}/payroll/adjustment/${id}`, {
        method: "DELETE",
        headers: jsonHeaders,
      });
      if (res.ok) {
        setNotice("Removed");
        await load();
      }
    } catch {
      setError("Server error");
    }
  };

  const earnings = rows.filter((r) => r.is_earning);
  const deductions = rows.filter((r) => !r.is_earning);
  const sum = (list) => list.reduce((t, r) => t + (Number(r.amount) || 0), 0);

  return (
    <Panel
      title="This month's one-off items"
      icon={Sparkles}
      subtitle="Add these BEFORE running payroll — a completed run is unaffected"
      actions={
        <>
          <label
            title="For which month"
            className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 cursor-pointer hover:border-white/20 transition"
          >
            <CalendarDays size={14} className="text-gray-400 shrink-0" />
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-transparent text-white text-xs outline-none [color-scheme:dark] w-[105px] cursor-pointer"
            />
          </label>
          <IconButton
            icon={RefreshCw}
            label="Reload"
            busy={loading}
            onClick={load}
          />
        </>
      }
    >
      {/* ── New item ── */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
              Employee
            </span>
            <Select
              value={form.employee_id}
              onChange={(v) => setForm({ ...form, employee_id: v })}
              placeholder="Select an employee…"
              options={structures.map((s) => ({
                value: String(s.employee_id),
                label: s.employee_name,
              }))}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
              What it is
            </span>
            <Select
              value={form.kind}
              onChange={(v) => setForm({ ...form, kind: v })}
              options={ADJ_KINDS.map((k) => ({
                value: k.value,
                label: k.label,
                group: k.earning ? "Earnings" : "Deductions",
              }))}
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
              Amount
            </span>
            <input
              type="number"
              min="1"
              value={form.amount}
              placeholder="10000"
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition tabular-nums placeholder:text-gray-700"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
              Note (optional)
            </span>
            <input
              type="text"
              value={form.note}
              placeholder="Q1 target"
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition placeholder:text-gray-700"
            />
          </label>
        </div>

        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <p className="text-gray-600 text-[11px]">
            Always enter a positive amount — whether it is an earning or a
            deduction is decided by "What it is" above.
          </p>
          <Button
            variant="primary"
            icon={Plus}
            busy={saving}
            onClick={add}
            className="!py-1.5 !px-3 !text-xs"
          >
            Daalein
          </Button>
        </div>
      </div>

      {/* ── List ── */}
      {loading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={`Nothing has been added for ${periodLabel(period)}`}
          hint="Add an incentive, arrears, a bonus or a one-off deduction above."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {[
            ["Kamai", earnings, "ok"],
            ["Deductions", deductions, "bad"],
          ].map(([title, list, tone]) =>
            list.length === 0 ? null : (
              <div key={title}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                    {title}
                  </p>
                  <p
                    className={`text-xs font-semibold tabular-nums ${
                      tone === "ok" ? "text-[#05DC7F]" : "text-rose-400"
                    }`}
                  >
                    {compact(sum(list))}
                  </p>
                </div>
                <div className="flex flex-col gap-1.5">
                  {list.map((r) => (
                    <div
                      key={r.adjustment_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-white text-sm truncate">
                          {r.employee_name || `#${r.employee_id}`}
                          <span className="text-gray-500"> · {r.label}</span>
                        </p>
                        {r.note && (
                          <p className="text-gray-600 text-[10.5px] truncate">
                            {r.note}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-sm font-semibold tabular-nums ${
                            r.is_earning ? "text-[#05DC7F]" : "text-rose-400"
                          }`}
                        >
                          {r.is_earning ? "+" : "−"}
                          {compact(r.amount)}
                        </span>
                        <IconButton
                          icon={Trash2}
                          label="Hatayein"
                          tone="bad"
                          onClick={() => remove(r.adjustment_id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </Panel>
  );
}

/* ══════════════════════════════════════════
   Loans
   ══════════════════════════════════════════ */
function LoansPanel({
  structures, authHeaders, jsonHeaders, setError, setNotice,
}) {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    employee_id: "", title: "", principal: "", installment: "",
    start_period: "", note: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/payroll/loans`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setLoans(data.loans || []);
    } catch {
      setError("Could not load the loans");
    }
    setLoading(false);
  }, [authHeaders, setError]);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/payroll/loan`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          employee_id: Number(form.employee_id),
          title: form.title,
          principal: Number(form.principal),
          installment: Number(form.installment),
          start_period: form.start_period,
          note: form.note || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not create the loan");
      else {
        setNotice(data.message);
        setOpen(false);
        setForm({
          employee_id: "", title: "", principal: "", installment: "",
          start_period: "", note: "",
        });
        await load();
      }
    } catch {
      setError("Server error");
    }
    setSaving(false);
  };

  const cancel = async (loan) => {
    if (
      !window.confirm(
        `Close "${loan.title}"?\n\n` +
          `No further instalments will be deducted. The ${compact(loan.paid)} ` +
          `already repaid stays on record.`,
      )
    )
      return;
    try {
      const res = await fetch(`${API}/payroll/loan/${loan.loan_id}/cancel`, {
        method: "POST",
        headers: jsonHeaders,
      });
      const data = await res.json();
      if (res.ok) {
        setNotice(data.message);
        await load();
      } else setError(data.detail || "Could not cancel it");
    } catch {
      setError("Server error");
    }
  };

  // Estimated from the instalment — so the CEO knows up front how many months
  const months =
    Number(form.principal) > 0 && Number(form.installment) > 0
      ? Math.ceil(Number(form.principal) / Number(form.installment))
      : null;

  const LOAN_TONE = { active: "info", cleared: "ok", cancelled: "muted" };
  const LOAN_LABEL = {
    active: "Active", cleared: "Repaid", cancelled: "Closed",
  };

  return (
    <Panel
      title="Loans aur Advances"
      icon={Landmark}
      subtitle="Enter it once — the instalment is deducted on every payroll"
      actions={
        <>
          <Button
            variant={open ? "ghost" : "primary"}
            icon={open ? X : Plus}
            tone="muted"
            onClick={() => setOpen(!open)}
            className="!py-1.5 !px-3 !text-xs"
          >
            {open ? "Cancel" : "New loan"}
          </Button>
          <IconButton
            icon={RefreshCw}
            label="Reload"
            busy={loading}
            onClick={load}
          />
        </>
      }
    >
      {open && (
        <div className="rounded-xl border border-[#05DC7F]/25 bg-[#05DC7F]/[0.04] p-3.5 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                Employee
              </span>
              <Select
                value={form.employee_id}
                onChange={(v) => setForm({ ...form, employee_id: v })}
                placeholder="Select an employee…"
                options={structures.map((s) => ({
                  value: String(s.employee_id),
                  label: s.employee_name,
                }))}
              />
            </div>

            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                What it is for
              </span>
              <input
                type="text"
                value={form.title}
                placeholder="Bike advance"
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition placeholder:text-gray-700"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                Total amount
              </span>
              <input
                type="number"
                min="1"
                value={form.principal}
                placeholder="120000"
                onChange={(e) =>
                  setForm({ ...form, principal: e.target.value })
                }
                className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition tabular-nums placeholder:text-gray-700"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                Monthly instalment
              </span>
              <input
                type="number"
                min="1"
                value={form.installment}
                placeholder="10000"
                onChange={(e) =>
                  setForm({ ...form, installment: e.target.value })
                }
                className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#05DC7F]/50 transition tabular-nums placeholder:text-gray-700"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-gray-500 text-[10.5px] uppercase tracking-wider">
                Starting from
              </span>
              <input
                type="month"
                value={form.start_period}
                onChange={(e) =>
                  setForm({ ...form, start_period: e.target.value })
                }
                className="bg-white/[0.03] border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm outline-none [color-scheme:dark]"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <p className="text-gray-400 text-xs">
              {months
                ? `Repaid in ${months} month(s) — the balance reduces itself`
                : "Enter the total amount and the instalment"}
            </p>
            <Button
              variant="primary"
              icon={Save}
              busy={saving}
              disabled={!form.employee_id || !months || !form.start_period}
              onClick={create}
              className="!py-1.5 !px-3 !text-xs"
            >
              Loan banayein
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : loans.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="No loans or advances"
          hint="Add a loan — the instalment is deducted on every payroll and the balance reduces itself."
        />
      ) : (
        <div className="flex flex-col gap-2">
          {loans.map((l) => (
            <div
              key={l.loan_id}
              className={`rounded-xl border p-3.5 ${
                l.status === "active"
                  ? "border-white/[0.07] bg-white/[0.02]"
                  : "border-white/[0.05] bg-white/[0.01] opacity-70"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {l.title}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {l.employee_name || `#${l.employee_id}`} · instalment{" "}
                    {compact(l.installment)}/month · from {l.start_period}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={LOAN_TONE[l.status] || "muted"}>
                    {LOAN_LABEL[l.status] || l.status}
                  </Pill>
                  {l.status === "active" && (
                    <IconButton
                      icon={Ban}
                      label="Close the loan"
                      tone="bad"
                      onClick={() => cancel(l)}
                    />
                  )}
                </div>
              </div>

              {/* How much is repaid — at a glance */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-gray-500">
                    {compact(l.paid)} repaid
                  </span>
                  <span className="text-white font-semibold tabular-nums">
                    {compact(l.remaining)} remaining
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      l.remaining <= 0 ? "bg-[#05DC7F]" : "bg-sky-400"
                    }`}
                    style={{ width: `${Math.min(100, l.progress_pct || 0)}%` }}
                  />
                </div>
                <p className="text-gray-600 text-[10.5px] mt-1">
                  kul {compact(l.principal)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
