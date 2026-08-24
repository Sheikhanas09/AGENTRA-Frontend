"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
// One icon set across the whole system — this file used to be on Font
// Awesome while everything else was on Lucide
import {
  Hourglass,
  CalendarCheck,
  XCircle,
  Eye,
  X,
  Check,
  Ban,
  Bot,
  Loader2,
  Paperclip,
  Plus,
  Minus,
  RefreshCw,
  CalendarDays,
  Inbox,
  Search,
} from "lucide-react";
import {
  Panel,
  IconButton,
  StatCard,
  Pill,
  FilterChips,
  Pagination,
  EmptyState,
  TableSkeleton,
  Select,
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

const LEAVE_TYPES = ["annual", "casual", "sick", "unpaid", "emergency"];

// Status colours now come from the kit's tones — "approved" green is
// exactly the same green on both the CEO and employee side
const statusTone = {
  pending: "warn",
  approved: "ok",
  rejected: "bad",
  evaluating: "info",
  cancelled: "muted",
};

const leaveTypeColor = {
  annual: "bg-blue-500/20 text-blue-400",
  casual: "bg-purple-500/20 text-purple-400",
  sick: "bg-red-500/20 text-red-400",
  unpaid: "bg-gray-500/20 text-gray-400",
  emergency: "bg-orange-500/20 text-orange-400",
};

const prettyDateTime = (s) => {
  if (!s) return "—";
  return new Date(String(s).replace(" ", "T")).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ──── How much time is left until the deadline ────
const hoursLeft = (s) => {
  if (!s) return null;
  const diff = new Date(String(s).replace(" ", "T")) - new Date();
  if (diff <= 0) return "deadline passed";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
};

const prettyDate = (s) => {
  if (!s) return "—";
  const [y, m, d] = String(s).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export default function LeaveManagment() {
  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );
  const jsonHeaders = useMemo(
    () => ({ ...authHeaders, "Content-Type": "application/json" }),
    [authHeaders],
  );

  const [allLeaves, setAllLeaves] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [calendar, setCalendar] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [statusFilter, setStatusFilter] = useState("All");
  const [ceoNote, setCeoNote] = useState("");
  const [deciding, setDeciding] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // ──── Balance management ────
  const [balanceEmp, setBalanceEmp] = useState("");
  const [balanceRows, setBalanceRows] = useState([]);
  const [adjusting, setAdjusting] = useState(null);

  // ──── Leave types ────
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [drafts, setDrafts] = useState({}); // {code: {...edits}}
  const [savingType, setSavingType] = useState(null);
  const [newType, setNewType] = useState(null); // null = form closed

  // ──── Policy Extraction Agent ────
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState(null); // the agent's suggestions
  const [picked, setPicked] = useState({}); // {code: bool}
  const [zeroMissing, setZeroMissing] = useState(true);
  const [applying, setApplying] = useState(false);

  // Switching tabs always resets to page 1 — otherwise opening another tab
  // while on page 3 shows an empty list
  const pickTab = (id) => {
    setActiveTab(id);
    setCurrentPage(1);
  };

  // ══════════════════════════════════════
  // Fetch
  // ══════════════════════════════════════
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [allRes, pendRes, calRes, empRes, typeRes] = await Promise.all([
        fetch(`${API}/leave/all`, { headers: authHeaders }),
        fetch(`${API}/leave/pending`, { headers: authHeaders }),
        fetch(`${API}/leave/calendar`, { headers: authHeaders }),
        fetch(`${API}/recruitment/employees`, { headers: authHeaders }),
        fetch(`${API}/leave/types`, { headers: authHeaders }),
      ]);

      const allData = await allRes.json();
      const pendData = await pendRes.json();
      const calData = await calRes.json();
      const empData = await empRes.json();
      const typeData = await typeRes.json();

      if (typeRes.ok) {
        setLeaveTypes(typeData.types || []);
        setDrafts({});
      }

      if (allRes.ok) {
        setAllLeaves(allData.requests || []);
        setSummary(allData.summary || {});
      }
      if (pendRes.ok) setPendingLeaves(pendData.pending_requests || []);
      if (calRes.ok) setCalendar(calData.leaves || []);
      if (empRes.ok) setEmployees(empData.employees || []);
    } catch {
      setError("Could not connect to the server");
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ══════════════════════════════════════
  // Approve / Reject
  // ══════════════════════════════════════
  const decide = async (leaveId, action) => {
    setDeciding(true);
    setError("");
    try {
      const res = await fetch(`${API}/leave/${action}/${leaveId}`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ ceo_note: ceoNote }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || `Could not ${action}`);
      } else {
        setSelected(null);
        setCeoNote("");
        // ──── If it went beyond the balance, tell the CEO ────
        if (data.over_entitlement) {
          setNotice(
            `Approved — but it exceeded the balance. ${data.note || ""}`,
          );
        } else if (action === "approve") {
          setNotice(
            `Approved — ${data.days_deducted} working days deducted, ${data.remaining_balance} left`,
          );
        } else {
          setNotice("Request rejected");
        }
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setDeciding(false);
  };

  // ──── Cancel approved leave — the CEO can cancel even one that has started ────
  const cancelApproved = async (item) => {
    const label = `${item.employee_name}'s ${item.leave_type} leave (${prettyDate(item.start_date)})`;
    if (!window.confirm(`Cancel ${label}?\n\nThe balance will be returned.`))
      return;

    setDeciding(true);
    setError("");
    try {
      const res = await fetch(`${API}/leave/cancel/${item.leave_id}`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ reason: "Cancelled by HR" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Could not cancel this request");
      } else {
        setNotice(
          `Leave cancelled${
            data.days_restored ? ` — ${data.days_restored} day(s) returned to the balance` : ""
          }`,
        );
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setDeciding(false);
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
  // Balance management
  // ══════════════════════════════════════
  const loadBalances = useCallback(
    async (empId) => {
      if (!empId) {
        setBalanceRows([]);
        return;
      }
      try {
        const res = await fetch(`${API}/leave/balance/${empId}`, {
          headers: authHeaders,
        });
        const data = await res.json();
        if (res.ok) setBalanceRows(data.balances || []);
      } catch {
        setError("Could not load the balance");
      }
    },
    [authHeaders],
  );

  useEffect(() => {
    loadBalances(balanceEmp);
  }, [balanceEmp, loadBalances]);

  const adjustBalance = async (leaveType, adjustment) => {
    setAdjusting(leaveType);
    setError("");
    try {
      const res = await fetch(`${API}/leave/balance/adjust`, {
        method: "PATCH",
        headers: jsonHeaders,
        body: JSON.stringify({
          employee_id: parseInt(balanceEmp),
          leave_type: leaveType,
          adjustment,
          reason: "CEO manual adjustment",
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not adjust the balance");
      else await loadBalances(balanceEmp);
    } catch {
      setError("Server error");
    }
    setAdjusting(null);
  };

  // ══════════════════════════════════════
  // Leave types
  // ══════════════════════════════════════
  // Draft = what the CEO has typed but not yet saved.
  // It tells us which row changed (Save only wakes up then).
  const draftOf = (t) => ({ ...t, ...(drafts[t.code] || {}) });
  const isDirty = (t) => !!drafts[t.code];

  const editType = (code, patch) =>
    setDrafts((d) => ({ ...d, [code]: { ...(d[code] || {}), ...patch } }));

  const saveType = async (type) => {
    const draft = draftOf(type);
    setSavingType(draft.code);
    setError("");
    try {
      const res = await fetch(`${API}/leave/types`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({
          code: draft.code,
          label: draft.label,
          default_entitlement: Number(draft.default_entitlement) || 0,
          is_unlimited: !!draft.is_unlimited,
          requires_certificate: !!draft.requires_certificate,
          advance_notice_days: Number(draft.advance_notice_days) || 0,
          is_enabled: draft.is_enabled !== false,
          // Payroll's unpaid-leave deduction runs solely off this.
          // `!== false` because undefined means "paid" — when in doubt,
          // in the employee's favour.
          is_paid: draft.is_paid !== false,
          policy_reference: draft.policy_reference || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) setError(data.detail || "Could not save");
      else {
        setNotice(data.message + (data.note ? ` — ${data.note}` : ""));
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setSavingType(null);
  };

  const removeType = async (type) => {
    if (
      !window.confirm(
        `Remove "${type.label}"?\n\n` +
          `If there are existing requests on it, it will only be DISABLED (not deleted) ` +
          `so the history stays intact.`,
      )
    )
      return;

    setSavingType(type.code);
    setError("");
    try {
      const res = await fetch(`${API}/leave/types/${type.code}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not delete");
      else {
        setNotice(data.message + (data.note ? ` — ${data.note}` : ""));
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setSavingType(null);
  };

  const createType = async () => {
    if (!newType?.code?.trim()) {
      setError("Please enter a code for the type");
      return;
    }
    setSavingType("__new__");
    setError("");
    try {
      const res = await fetch(`${API}/leave/types`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({
          code: newType.code.trim().toLowerCase().replace(/\s+/g, "_"),
          label: newType.label?.trim() || newType.code.trim(),
          default_entitlement: Number(newType.default_entitlement) || 0,
          is_unlimited: !!newType.is_unlimited,
          requires_certificate: !!newType.requires_certificate,
          advance_notice_days: Number(newType.advance_notice_days) || 0,
          is_enabled: true,
          is_paid: newType.is_paid !== false,
          policy_reference: newType.policy_reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Could not create the type");
      else {
        setNotice(data.message);
        setNewType(null);
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setSavingType(null);
  };

  // ══════════════════════════════════════
  // Policy Extraction Agent
  // ══════════════════════════════════════
  // The agent only SUGGESTS — it saves nothing. The CEO ticks the boxes
  // and presses Apply. An LLM mistake never lands straight in a balance.
  const runExtraction = async () => {
    setExtracting(true);
    setError("");
    setExtraction(null);
    try {
      const res = await fetch(`${API}/leave/types/extract`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Could not read the policy");
      } else {
        setExtraction(data);
        // ──── High confidence is pre-ticked; low confidence the CEO reviews ────
        const pre = {};
        (data.suggested || []).forEach((t) => {
          pre[t.code] = t.confidence === "high";
        });
        setPicked(pre);
        if (!data.suggested?.length) {
          setNotice(
            "No leave type was found in the policy document — create the types manually",
          );
        }
      }
    } catch {
      setError("Server error");
    }
    setExtracting(false);
  };

  const applyExtraction = async () => {
    const chosen = (extraction?.suggested || []).filter((t) => picked[t.code]);
    if (!chosen.length) {
      setError("Please select at least one type");
      return;
    }

    setApplying(true);
    setError("");
    try {
      const res = await fetch(`${API}/leave/types/apply`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          disable_missing: zeroMissing,
          types: chosen.map((t) => ({
            code: t.code,
            label: t.label,
            default_entitlement: t.days_per_year || 0,
            is_unlimited: !!t.is_unlimited,
            requires_certificate: !!t.requires_certificate,
            advance_notice_days: t.advance_notice_days || 0,
            is_enabled: true,
            // The server has already collapsed the three states (yes/no/
            // document silent) into one value — we just send it
            is_paid: t.is_paid !== false,
            policy_reference: t.source_quote || null,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) setError(data.detail || "Could not apply");
      else {
        setNotice(data.message + (data.note ? ` — ${data.note}` : ""));
        setExtraction(null);
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setApplying(false);
  };

  // ══════════════════════════════════════
  // Display list
  // ══════════════════════════════════════
  const baseList = activeTab === "pending" ? pendingLeaves : allLeaves;
  const displayList =
    activeTab === "all" && statusFilter !== "All"
      ? baseList.filter((r) => r.status === statusFilter)
      : baseList;

  const totalPages = Math.max(1, Math.ceil(displayList.length / itemsPerPage));
  const current = displayList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const autoApproved = allLeaves.filter((r) => r.auto_approved).length;

  const TABS = [
    { id: "pending", label: `Pending (${summary.pending ?? 0})` },
    { id: "all", label: "All Requests" },
    { id: "calendar", label: `Calendar (${calendar.length})` },
    { id: "balances", label: "Balances" },
    { id: "types", label: `Leave Types (${leaveTypes.length})` },
  ];

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500 text-red-400 text-sm flex justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      {notice && (
        <div className="p-3 rounded-lg bg-[#05DC7F]/15 border border-[#05DC7F]/50 text-[#05DC7F] text-sm flex justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Stats ──
          The pending card comes first and is clickable — this is the CEO's
          actual job, and clicking opens exactly that list */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Hourglass}
          label="Needs a response"
          value={summary.pending ?? 0}
          sub={(summary.pending ?? 0) > 0 ? "Waiting on you" : "All clear"}
          tone={(summary.pending ?? 0) > 0 ? "warn" : "muted"} onClick={() => pickTab("pending")}
          active={activeTab === "pending"} />
        <StatCard icon={Bot}
          label="Auto-approved"
          value={autoApproved}
          sub="After the deadline passed"
          tone={autoApproved > 0 ? "ai" : "muted"} />
        <StatCard icon={CalendarCheck}
          label="Approved"
          value={summary.approved ?? 0}
          sub="Ab tak kul"
          tone={(summary.approved ?? 0) > 0 ? "ok" : "muted"} />
        <StatCard icon={XCircle}
          label="Rejected"
          value={summary.rejected ?? 0}
          sub={`${summary.cancelled ?? 0} cancelled`}
          tone={(summary.rejected ?? 0) > 0 ? "bad" : "muted"} />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap items-center">
        <FilterChips options={TABS.map((t) => ({ value: t.id, label: t.label }))}
          value={activeTab}
          onChange={pickTab}
          counts={{ pending: summary.pending ?? 0 }} />

        {activeTab === "all" && (
          <Select
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setCurrentPage(1);
            }}
            options={["All", "pending", "approved", "rejected", "cancelled"]}
            className="min-w-36"
          />
        )}

        <div className="ml-auto">
          <IconButton icon={RefreshCw}
            label="Reload"
            busy={loading} onClick={fetchData} />
        </div>
      </div>

      {/* ══ Calendar tab ══ */}
      {activeTab === "calendar" &&
        (calendar.length === 0 ? (
          <Panel>
            <EmptyState icon={CalendarDays} title="No approved leave in the next 30 days"
              hint="Approved leave will appear here, ordered by date." />
          </Panel>
        ) : (
          <div className="rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-4 md:p-6">
            <p className="text-gray-400 text-sm mb-4">
              Next 30 days — who is off, and when
            </p>
            <div className="flex flex-col gap-3">
              {calendar.map((l) => (
                <div key={l.leave_id} className="flex justify-between items-center gap-4 p-3 rounded-xl border border-[#05DC7F]/15 bg-black/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#05DC7F]/20 flex items-center justify-center text-[#05DC7F] font-semibold text-sm">
                      {l.employee_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-white text-sm">{l.employee_name}</p>
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${leaveTypeColor[l.leave_type] || ""}`}
                      >
                        {l.leave_type?.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-300 text-sm">
                      {prettyDate(l.start_date)}
                      {l.start_date !== l.end_date && (
                        <> — {prettyDate(l.end_date)}</>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {l.deductible_days} working days
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* ══ Balances tab ══ */}
      {activeTab === "balances" && (
        <div className="rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
            <p className="text-gray-400 text-sm">Select an employee:</p>
            <Select
              value={balanceEmp}
              onChange={setBalanceEmp}
              placeholder="Select an employee…"
              className="min-w-56"
              options={employees.map((e) => ({
                value: String(e.id),
                label: e.full_name,
                hint: e.department || undefined,
              }))}
            />
          </div>

          {!balanceEmp ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              Select an employee to see their balance
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {balanceRows.map((b) => (
                <div key={b.leave_type} className="p-4 rounded-xl border border-[#05DC7F]/20 bg-black/30"
                >
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-gray-400 text-xs uppercase tracking-wide">
                      {b.leave_type}
                    </p>
                    <span className="text-gray-500 text-xs">
                      {b.used_days} used
                    </span>
                  </div>

                  <p className="text-2xl font-bold text-white mb-1">
                    {b.unlimited ? "∞" : b.remaining_days}
                    <span className="text-gray-600 text-sm font-normal">
                      {" "}
                      / {b.total_entitlement}
                    </span>
                  </p>

                  {!b.unlimited && (
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => adjustBalance(b.leave_type, 1)}
                        disabled={adjusting === b.leave_type} className="flex-1 py-1 rounded-lg bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30 text-xs hover:bg-[#05DC7F]/25 transition disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <Plus size={9} /> 1 day
                      </button>
                      <button onClick={() => adjustBalance(b.leave_type, -1)}
                        disabled={adjusting === b.leave_type} className="flex-1 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs hover:bg-red-500/25 transition disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <Minus size={9} /> 1 day
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ Leave Types tab ══ */}
      {activeTab === "types" && (
        <div className="rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-4 md:p-6">
          <p className="text-gray-400 text-sm mb-1">
            Your company's leave types
          </p>
          <p className="text-gray-500 text-xs mb-4">
            Set the entitlement to <b className="text-gray-400">0</b> and the
            type stays visible but cannot be applied for. To hide it
            entirely, switch it <b className="text-gray-400">Off</b>
            dein.
          </p>

          {/* ── Policy Extraction Agent ── */}
          <div className="mb-5 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p className="text-purple-300 text-sm font-medium flex items-center gap-2">
                  <Bot size={14} /> Types are applied automatically from the policy document
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Whenever a policy document is uploaded in Settings, the
                  agent reads it and applies the types itself — anything not
                  in the policy is disabled. If something below looks wrong,
                  correct it here.
                </p>
              </div>
              {/* Only needed when the agent failed during the upload */}
              <button onClick={runExtraction}
                disabled={extracting} title="Run it again if the agent failed during the upload" className="shrink-0 px-3 py-1.5 rounded-lg text-purple-300/80 border border-purple-500/25 text-xs hover:bg-purple-500/15 transition disabled:opacity-50 flex items-center gap-2"
              >
                {extracting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Reading...
                  </>
                ) : (
                  "Run it again"
                )}
              </button>
            </div>

            {/* ── The agent's suggestions — review panel ── */}
            {extraction && (
              <div className="mt-4 pt-4 border-t border-purple-500/20">
                <p className="text-gray-400 text-xs mb-3">
                  from <b className="text-white">{extraction.policy_document}</b>{" "}
                  {extraction.suggested?.length || 0} type mili
                  {extraction.chunks_used > 0 && (
                    <span className="text-gray-600">
                      {" "}
                      ({extraction.chunks_used} policy clauses parhe)
                    </span>
                  )}
                </p>

                {extraction.warnings?.length > 0 && (
                  <div className="mb-3 p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                    {extraction.warnings.map((w, i) => (
                      <p key={i} className="text-yellow-400/90 text-xs">
                        ⚠ {w}
                      </p>
                    ))}
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-3">
                  {(extraction.suggested || []).map((t) => (
                    <label key={t.code} className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        picked[t.code]
                          ? "border-[#05DC7F]/40 bg-[#05DC7F]/5"
                          : "border-gray-700 bg-black/20"
                      }`}
                    >
                      <input type="checkbox"
                        checked={!!picked[t.code]}
                        onChange={(e) =>
                          setPicked({ ...picked, [t.code]: e.target.checked })
                        } className="mt-1 accent-[#05DC7F] w-4 h-4 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-white text-sm">
                          {t.label}
                          <span className="text-gray-500"> · {t.code}</span>
                          {t.is_new ? (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400">
                              new
                            </span>
                          ) : t.changes_entitlement ? (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400">
                              {t.current_entitlement} → {t.days_per_year}
                            </span>
                          ) : null}

                          {/* ── Unpaid ── */}
                          {/* This is the most consequential change being
                              applied: payroll will deduct salary for it. So
                              its own colour and its own place — it must not
                              get buried next to the day count */}
                          {t.is_paid === false && (
                            <span
                              title={
                                t.paid_from_policy
                                  ? "The document states that this leave is unpaid"
                                  : "The type's name suggests it is unpaid — please confirm"
                              }
                              className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-orange-500/20 text-orange-400"
                            >
                              unpaid
                              {t.changes_paid ? " (changing)" : ""}
                            </span>
                          )}
                          <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded ${
                              t.confidence === "high"
                                ? "bg-[#05DC7F]/15 text-[#05DC7F]"
                                : "bg-orange-500/20 text-orange-400"
                            }`}
                          >
                            {t.confidence === "high"
                              ? "confident"
                              : "check this"}
                          </span>
                        </p>

                        <p className="text-gray-400 text-xs mt-0.5">
                          {t.is_unlimited ? "∞" : `${t.days_per_year} days/year`}
                          {t.advance_notice_days > 0
                            ? ` · ${t.advance_notice_days} days notice`
                            : " · same day allowed"}
                          {t.requires_certificate && " · certificate required"}
                        </p>

                        {t.source_quote ? (
                          <p className="text-gray-500 text-[11px] mt-1 italic border-l-2 border-gray-700 pl-2">
                            "{t.source_quote}"
                          </p>
                        ) : (
                          <p className="text-orange-400/80 text-[11px] mt-1">
                            No line was quoted from the document — please verify
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {extraction.missing_from_policy?.length > 0 && (
                  <label className="flex items-start gap-2 mb-3 cursor-pointer">
                    <input type="checkbox"
                      checked={zeroMissing}
                      onChange={(e) => setZeroMissing(e.target.checked)} className="mt-0.5 accent-[#05DC7F] w-4 h-4" />
                    <span className="text-gray-400 text-xs">
                      Set the entitlement of types not found in the policy to{" "}
                      <b className="text-white">0</b> —{" "}
                      <span className="text-gray-500">
                        {extraction.missing_from_policy
                          .map((m) => m.label)
                          .join(", ")}
                      </span>
                    </span>
                  </label>
                )}

                <div className="flex gap-2">
                  <button onClick={applyExtraction}
                    disabled={applying} className="px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:bg-[#04c56f] transition disabled:opacity-50"
                  >
                    {applying ? "Saving..." : "Apply the selected types"}
                  </button>
                  <button onClick={() => setExtraction(null)} className="px-4 py-2 rounded-xl text-gray-400 border border-gray-700 text-sm hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {leaveTypes.map((t) => {
              const d = draftOf(t);
              const dirty = isDirty(t);
              const busy = savingType === t.code;

              return (
                <div key={t.code} className={`p-4 rounded-xl border ${
                    d.is_enabled === false
                      ? "border-gray-800 bg-black/20 opacity-70"
                      : "border-[#05DC7F]/20 bg-black/30"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    {/* Label + code */}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-500 text-xs mb-1">
                        Name
                        <span className="text-gray-600"> · {t.code}</span>
                        {t.source === "policy" && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-[#05DC7F]/15 text-[#05DC7F]">
                            from policy
                          </span>
                        )}
                        {t.source === "manual" && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/15 text-blue-400">
                            manual
                          </span>
                        )}
                      </p>
                      <input type="text"
                        value={d.label || ""}
                        onChange={(e) =>
                          editType(t.code, { label: e.target.value })
                        } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
                      {t.policy_reference && (
                        <p className="text-gray-600 text-[10px] mt-1 italic truncate">
                          {t.policy_reference}
                        </p>
                      )}
                    </div>

                    {/* Days */}
                    <div className="w-full lg:w-28">
                      <p className="text-gray-500 text-xs mb-1">Days / year</p>
                      <input type="number"
                        min="0"
                        disabled={d.is_unlimited}
                        value={d.is_unlimited ? "" : d.default_entitlement ?? 0}
                        placeholder={d.is_unlimited ? "∞" : ""}
                        onChange={(e) =>
                          editType(t.code, {
                            default_entitlement: e.target.value,
                          })
                        } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-40" />
                    </div>

                    {/* Notice */}
                    <div className="w-full lg:w-32">
                      <p className="text-gray-500 text-xs mb-1" title="How many days in advance it must be applied for. 0 = same day allowed"
                      >
                        Notice (days)
                      </p>
                      <input type="number"
                        min="0"
                        value={d.advance_notice_days ?? 0}
                        onChange={(e) =>
                          editType(t.code, {
                            advance_notice_days: e.target.value,
                          })
                        } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
                    </div>

                    {/* Toggles */}
                    <div className="flex gap-4 lg:gap-3 flex-wrap items-center pb-1">
                      {[
                        ["is_unlimited", "Unlimited"],
                        ["requires_certificate", "Certificate"],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400"
                        >
                          <input type="checkbox"
                            checked={!!d[key]}
                            onChange={(e) =>
                              editType(t.code, { [key]: e.target.checked })
                            } className="accent-[#05DC7F] w-3.5 h-3.5" />
                          {label}
                        </label>
                      ))}

                      {/* ── Paid ── */}
                      {/* This is the one toggle that affects MONEY directly:
                          payroll's unpaid-leave deduction runs solely off it.
                          So it is not in the map with the other toggles —
                          it stands on its own, with its own explanation */}
                      <label
                        title="Switch this off and the leave becomes unpaid — payroll will deduct for each day"
                        className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400"
                      >
                        <input type="checkbox"
                          checked={d.is_paid !== false}
                          onChange={(e) =>
                            editType(t.code, { is_paid: e.target.checked })
                          } className="accent-[#05DC7F] w-3.5 h-3.5" />
                        Paid
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400">
                        <input type="checkbox"
                          checked={d.is_enabled !== false}
                          onChange={(e) =>
                            editType(t.code, { is_enabled: e.target.checked })
                          } className="accent-[#05DC7F] w-3.5 h-3.5" />
                        On
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pb-0.5">
                      <button onClick={() => saveType(t)}
                        disabled={!dirty || busy} className="px-3 py-1.5 rounded-lg bg-[#05DC7F] text-black text-xs font-semibold hover:bg-[#04c56f] transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {busy ? "..." : "Save"}
                      </button>
                      <button onClick={() => removeType(t)}
                        disabled={busy} className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs hover:bg-red-500/25 transition disabled:opacity-40"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Warnings */}
                  {!d.is_unlimited &&
                    Number(d.default_entitlement) === 0 &&
                    d.is_enabled !== false && (
                      <p className="text-yellow-400/80 text-xs mt-2">
                        Entitlement is 0 — the employee will see the card but
                        cannot apply
                      </p>
                    )}
                  {d.is_paid === false && (
                    <p className="text-orange-400/90 text-xs mt-2">
                      Unpaid — payroll will deduct one day's salary for every
                      working day of it
                    </p>
                  )}
                  {d.is_enabled === false && (
                    <p className="text-gray-500 text-xs mt-2">
                      Disabled — the employee will not see this type at all
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── New type ── */}
          <div className="mt-5">
            {!newType ? (
              <button onClick={() =>
                  setNewType({
                    code: "",
                    label: "",
                    default_entitlement: 0,
                    advance_notice_days: 1,
                    requires_certificate: false,
                    is_unlimited: false,
                    is_paid: true,
                  })
                } className="px-4 py-2 rounded-xl bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30 text-sm hover:bg-[#05DC7F]/25 transition"
              >
                + New leave type
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-[#05DC7F]/30 bg-black/40">
                <p className="text-white text-sm font-medium mb-3">
                  New leave type
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">
                      Code (lowercase, no spaces)
                    </p>
                    <input type="text"
                      value={newType.code}
                      placeholder="maternity"
                      onChange={(e) =>
                        setNewType({ ...newType, code: e.target.value })
                      } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Name</p>
                    <input type="text"
                      value={newType.label}
                      placeholder="Maternity Leave"
                      onChange={(e) =>
                        setNewType({ ...newType, label: e.target.value })
                      } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Days / year</p>
                    <input type="number"
                      min="0"
                      value={newType.default_entitlement}
                      onChange={(e) =>
                        setNewType({
                          ...newType,
                          default_entitlement: e.target.value,
                        })
                      } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Notice (days)</p>
                    <input type="number"
                      min="0"
                      value={newType.advance_notice_days}
                      onChange={(e) =>
                        setNewType({
                          ...newType,
                          advance_notice_days: e.target.value,
                        })
                      } className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none" />
                  </div>
                </div>

                <div className="flex gap-4 mb-4 flex-wrap">
                  {[
                    ["is_unlimited", "Unlimited (does not use balance)"],
                    ["requires_certificate", "Certificate required"],
                    ["is_paid", "Paid (salary continues)"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer text-xs text-gray-400"
                    >
                      <input type="checkbox"
                        checked={!!newType[key]}
                        onChange={(e) =>
                          setNewType({ ...newType, [key]: e.target.checked })
                        } className="accent-[#05DC7F] w-3.5 h-3.5" />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button onClick={createType}
                    disabled={savingType === "__new__"} className="px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:bg-[#04c56f] transition disabled:opacity-50"
                  >
                    {savingType === "__new__" ? "Creating..." : "Create"}
                  </button>
                  <button onClick={() => setNewType(null)} className="px-4 py-2 rounded-xl text-gray-400 border border-gray-700 text-sm hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ Pending / All list ══ */}
      {(activeTab === "pending" || activeTab === "all") &&
        (loading ? (
          <Panel>
            <TableSkeleton rows={4} cols={3} />
          </Panel>
        ) : displayList.length === 0 ? (
          <Panel>
            <EmptyState icon={activeTab === "pending" ? Inbox : Search} title={
                activeTab === "pending"
                  ? "No request is waiting on you"
                  : "No leave requests found"
              }
              hint={
                activeTab === "pending"
                  ? "A new request will appear here — and you will get an email too."
                  : "Try another filter, or choose All."
              } />
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {current.map((item) => (
              <div key={item.leave_id} className="flex flex-col lg:flex-row justify-between gap-4 p-5 rounded-2xl bg-black/40 border border-[#05DC7F]/25 hover:border-[#05DC7F]/45 transition-all"
              >
                <div className="flex flex-col gap-2 min-w-0">
                  <h3 className="text-white font-semibold">
                    {item.employee_name}
                    {item.department && (
                      <span className="text-gray-500 text-xs font-normal">
                        {" "}
                        · {item.department}
                      </span>
                    )}
                  </h3>

                  <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${leaveTypeColor[item.leave_type] || "bg-gray-500/20 text-gray-400"}`}
                    >
                      {item.leave_type?.toUpperCase()}
                    </span>
                    <Pill tone={statusTone[item.status] || "muted"}>
                      {item.status}
                    </Pill>
                    {item.auto_approved && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/20 text-purple-400 flex items-center gap-1">
                        <Bot size={12} /> AI Approved
                      </span>
                    )}
                    {item.has_medical_cert && (
                      <button onClick={() => viewCertificate(item.leave_id)} className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center gap-1"
                      >
                        <Paperclip size={11} /> Certificate
                      </button>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm">
                    {prettyDate(item.start_date)} → {prettyDate(item.end_date)}
                    <span className="ml-2 text-white">
                      {item.deductible_days} working days
                    </span>
                    {item.total_days !== item.deductible_days && (
                      <span className="text-gray-500 text-xs">
                        {" "}
                        ({item.total_days} calendar)
                      </span>
                    )}
                  </p>

                  {item.reason && (
                    <p className="text-gray-400 text-sm">
                      <span className="text-gray-500">Reason:</span>{" "}
                      {item.reason}
                    </p>
                  )}

                  {item.agent_reason && (
                    <p className="text-yellow-400/90 text-xs mt-1 flex items-start gap-1.5">
                      <Bot size={14} className="mt-0.5 shrink-0" />
                      {item.agent_reason}
                    </p>
                  )}

                  {item.remaining_balance != null && (
                    <p className="text-gray-500 text-xs">
                      Balance: {item.remaining_balance}/
                      {item.total_entitlement} days
                      {item.remaining_balance < item.deductible_days && (
                        <span className="text-red-400">
                          {" "}
                          — short of balance
                        </span>
                      )}
                    </p>
                  )}

                  {/* ── When it auto-approves if you do not respond ── */}
                  {item.status === "pending" && item.auto_approve_at && (
                    <p className="text-orange-400/90 text-xs flex items-center gap-1.5">
                      <Hourglass size={11} />
                      Auto-approves on {prettyDateTime(item.auto_approve_at)}
                      if there is no response
                      <span className="text-gray-500">
                        ({hoursLeft(item.auto_approve_at)})
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  {item.status === "pending" && (
                    <button onClick={() => {
                        setSelected(item);
                        setCeoNote("");
                      }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition whitespace-nowrap"
                    >
                      <Eye size={14} /> Review
                    </button>
                  )}

                  {/* ── The CEO can cancel approved leave at any time, even
                        one already started (the employee cannot) ── */}
                  {item.status === "approved" && (
                    <button onClick={() => cancelApproved(item)}
                      disabled={deciding} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition whitespace-nowrap text-sm disabled:opacity-40"
                    >
                      <X size={14} /> Cancel Leave
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Pagination page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage} />
          </div>
        ))}

      {/* ══ Review Modal ══ */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-black border border-[#05DC7F]/40 rounded-2xl p-6 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <h2 className="text-white text-xl font-bold mb-1">
              {selected.employee_name}
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              {selected.department || "—"} · applied{" "}
              {prettyDate(selected.created_at)}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div className="p-3 rounded-lg bg-black/40 border border-[#05DC7F]/15">
                <p className="text-gray-500 text-xs mb-1">Leave Type</p>
                <span className={`px-2 py-0.5 rounded-full text-xs ${leaveTypeColor[selected.leave_type] || ""}`}
                >
                  {selected.leave_type?.toUpperCase()}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-[#05DC7F]/15">
                <p className="text-gray-500 text-xs mb-1">Duration</p>
                <p className="text-white">
                  {selected.deductible_days} working days
                  {selected.total_days !== selected.deductible_days && (
                    <span className="text-gray-500 text-xs">
                      {" "}
                      ({selected.total_days} calendar)
                    </span>
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-[#05DC7F]/15">
                <p className="text-gray-500 text-xs mb-1">Dates</p>
                <p className="text-white text-xs">
                  {prettyDate(selected.start_date)} →{" "}
                  {prettyDate(selected.end_date)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-black/40 border border-[#05DC7F]/15">
                <p className="text-gray-500 text-xs mb-1">Balance</p>
                <p className={
                    selected.remaining_balance != null &&
                    selected.remaining_balance < selected.deductible_days
                      ? "text-red-400"
                      : "text-white"
                  }
                >
                  {selected.remaining_balance ?? "—"} /{" "}
                  {selected.total_entitlement ?? "—"} days
                </p>
              </div>
            </div>

            {selected.reason && (
              <div className="mb-4 p-3 rounded-xl bg-black/40 border border-[#05DC7F]/15">
                <p className="text-gray-500 text-xs mb-1">
                  The employee's reason
                </p>
                <p className="text-gray-300 text-sm">{selected.reason}</p>
              </div>
            )}

            {selected.has_medical_cert && (
              <button onClick={() => viewCertificate(selected.leave_id)} className="mb-4 w-full py-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition text-sm flex items-center justify-center gap-2"
              >
                <Paperclip size={14} /> Open medical certificate
                {selected.certificate_name && (
                  <span className="text-gray-500 text-xs">
                    ({selected.certificate_name})
                  </span>
                )}
              </button>
            )}

            {selected.auto_approve_at && (
              <div className="mb-4 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-orange-400 text-xs flex items-center gap-2">
                  <Hourglass size={14} />
                  If there is no response, this request will auto-approve on{" "}
                  <b>{prettyDateTime(selected.auto_approve_at)}</b>
                  ({hoursLeft(selected.auto_approve_at)})
                </p>
              </div>
            )}

            {selected.agent_reason && (
              <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <p className="text-purple-400 text-xs font-semibold mb-1 flex items-center gap-1">
                  <Bot size={14} /> Leave Agent recommendation
                </p>
                <p className="text-gray-300 text-sm">{selected.agent_reason}</p>
                {selected.policy_reference && (
                  <p className="text-gray-500 text-xs mt-1 italic">
                    Policy: {selected.policy_reference}
                  </p>
                )}
              </div>
            )}

            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">
                Note{" "}
                <span className="text-gray-600">
                  — this is the reason the employee will see
                </span>
              </p>
              <textarea value={ceoNote}
                onChange={(e) => setCeoNote(e.target.value)}
                rows={3}
                placeholder="If you are rejecting, please give a reason" className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none text-sm resize-none" />
              {/* A reason is required to reject — the employee must know why */}
              {!ceoNote.trim() && (
                <p className="text-gray-500 text-xs mt-1">
                  Optional when approving, <b>required when rejecting</b>.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={() => decide(selected.leave_id, "approve")}
                disabled={deciding} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition disabled:opacity-50"
              >
                {deciding ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Approve
              </button>
              <button onClick={() => decide(selected.leave_id, "reject")}
                disabled={deciding || !ceoNote.trim()} title={
                  !ceoNote.trim()
                    ? "A reason is required in order to reject"
                    : ""
                } className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deciding ? <Loader2 size={14} className="animate-spin" /> : <Ban size={14} />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
