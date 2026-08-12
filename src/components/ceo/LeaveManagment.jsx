"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
// Ek hi icon set poore system mein — pehle yeh file Font Awesome par
// thi aur baqi sab Lucide par
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
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

const LEAVE_TYPES = ["annual", "casual", "sick", "unpaid", "emergency"];

// Status ka rang ab kit ke tones se — CEO aur Employee dono taraf
// "approved" ka hara bilkul ek jaisa hara hai
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

// ──── Deadline tak kitna waqt bacha ────
const hoursLeft = (s) => {
  if (!s) return null;
  const diff = new Date(String(s).replace(" ", "T")) - new Date();
  if (diff <= 0) return "deadline guzar chuki";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m baqi` : `${m}m baqi`;
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
  const [newType, setNewType] = useState(null); // null = form band

  // ──── Policy Extraction Agent ────
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState(null); // agent ki tajweez
  const [picked, setPicked] = useState({}); // {code: bool}
  const [zeroMissing, setZeroMissing] = useState(true);
  const [applying, setApplying] = useState(false);

  // Tab badle to page hamesha 1 par — warna page 3 par khade ho kar
  // doosri tab kholein to khali list dikhti hai
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
      setError("Server se connect nahi ho paya");
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
        setError(data.detail || `${action} nahi ho paya`);
      } else {
        setSelected(null);
        setCeoNote("");
        // ──── Balance se zyada approve hui to CEO ko batao ────
        if (data.over_entitlement) {
          setNotice(
            `Approve ho gayi — magar balance se zyada thi. ${data.note || ""}`,
          );
        } else if (action === "approve") {
          setNotice(
            `Approved — ${data.days_deducted} working days kate, ${data.remaining_balance} bache`,
          );
        } else {
          setNotice("Request reject ho gayi");
        }
        await fetchData();
      }
    } catch {
      setError("Server error");
    }
    setDeciding(false);
  };

  // ──── Approved leave cancel — CEO shuru ho chuki bhi cancel kar sakta hai ────
  const cancelApproved = async (item) => {
    const label = `${item.employee_name} ki ${item.leave_type} leave (${prettyDate(item.start_date)})`;
    if (!window.confirm(`${label} cancel karein?\n\nBalance wapis mil jayega.`))
      return;

    setDeciding(true);
    setError("");
    try {
      const res = await fetch(`${API}/leave/cancel/${item.leave_id}`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ reason: "CEO ne cancel ki" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Cancel nahi ho payi");
      } else {
        setNotice(
          `Leave cancel ho gayi${
            data.days_restored ? ` — ${data.days_restored} din balance mein wapis` : ""
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
        setError("Certificate available nahi hai");
        return;
      }
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), "_blank");
    } catch {
      setError("Certificate load nahi hua");
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
        setError("Balance load nahi hua");
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
      if (!res.ok) setError(data.detail || "Adjust nahi hua");
      else await loadBalances(balanceEmp);
    } catch {
      setError("Server error");
    }
    setAdjusting(null);
  };

  // ══════════════════════════════════════
  // Leave types
  // ══════════════════════════════════════
  // Draft = jo CEO ne abhi type kiya hai magar Save nahi dabaya.
  // Isse pata chalta hai kaunsi row badli hai (Save button tabhi jagta hai).
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
          policy_reference: draft.policy_reference || null,
        }),
      });
      const data = await res.json();

      if (!res.ok) setError(data.detail || "Save nahi ho paya");
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
        `"${type.label}" hatana chahte hain?\n\n` +
          `Agar is par purani requests hain to sirf BAND hogi (delete nahi) ` +
          `taake history mehfooz rahe.`,
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
      if (!res.ok) setError(data.detail || "Delete nahi ho paya");
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
      setError("Type ka code likhein");
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
          policy_reference: newType.policy_reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.detail || "Type nahi bani");
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
  // Agent sirf TAJWEEZ deta hai — kuch save nahi karta. CEO checkbox se
  // chunta hai aur Apply dabata hai. LLM ki ghalti seedha balance mein nahi jaati.
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
        setError(data.detail || "Policy parh nahi paye");
      } else {
        setExtraction(data);
        // ──── High confidence wali khud tick, low confidence CEO khud dekhe ────
        const pre = {};
        (data.suggested || []).forEach((t) => {
          pre[t.code] = t.confidence === "high";
        });
        setPicked(pre);
        if (!data.suggested?.length) {
          setNotice(
            "Policy document mein koi leave type nahi mili — types manually banayein",
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
      setError("Kam se kam ek type chunein");
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
            policy_reference: t.source_quote || null,
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) setError(data.detail || "Apply nahi ho paya");
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
          Pending card sab se pehle aur clickable — CEO ka asal kaam
          yehi hai, aur click karte hi wahi list khul jati hai */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Hourglass}
          label="Jawab chahiye"
          value={summary.pending ?? 0}
          sub={(summary.pending ?? 0) > 0 ? "Aap ka intezar hai" : "Sab clear"}
          tone={(summary.pending ?? 0) > 0 ? "warn" : "muted"}
          onClick={() => pickTab("pending")}
          active={activeTab === "pending"}
        />
        <StatCard
          icon={Bot}
          label="Khud approve"
          value={autoApproved}
          sub="Deadline guzarne par"
          tone={autoApproved > 0 ? "ai" : "muted"}
        />
        <StatCard
          icon={CalendarCheck}
          label="Approved"
          value={summary.approved ?? 0}
          sub="Ab tak kul"
          tone={(summary.approved ?? 0) > 0 ? "ok" : "muted"}
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={summary.rejected ?? 0}
          sub={`${summary.cancelled ?? 0} cancelled`}
          tone={(summary.rejected ?? 0) > 0 ? "bad" : "muted"}
        />
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap items-center">
        <FilterChips
          options={TABS.map((t) => ({ value: t.id, label: t.label }))}
          value={activeTab}
          onChange={pickTab}
          counts={{ pending: summary.pending ?? 0 }}
        />

        {activeTab === "all" && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white/[0.03] text-gray-300 border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs outline-none hover:border-white/20 transition [color-scheme:dark]"
          >
            {["All", "pending", "approved", "rejected", "cancelled"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}

        <div className="ml-auto">
          <IconButton
            icon={RefreshCw}
            label="Dobara load karein"
            busy={loading}
            onClick={fetchData}
          />
        </div>
      </div>

      {/* ══ Calendar tab ══ */}
      {activeTab === "calendar" &&
        (calendar.length === 0 ? (
          <Panel>
            <EmptyState
              icon={CalendarDays}
              title="Agle 30 din mein koi approved leave nahi"
              hint="Jo chhuttiyan approve hongi wo yahan tareekh ke hisab se dikhengi."
            />
          </Panel>
        ) : (
          <div className="rounded-2xl bg-black/40 border border-[#05DC7F]/25 p-4 md:p-6">
            <p className="text-gray-400 text-sm mb-4">
              Agle 30 din — kaun kab chhutti pe hai
            </p>
            <div className="flex flex-col gap-3">
              {calendar.map((l) => (
                <div
                  key={l.leave_id}
                  className="flex justify-between items-center gap-4 p-3 rounded-xl border border-[#05DC7F]/15 bg-black/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#05DC7F]/20 flex items-center justify-center text-[#05DC7F] font-semibold text-sm">
                      {l.employee_name?.charAt(0) || "?"}
                    </div>
                    <div>
                      <p className="text-white text-sm">{l.employee_name}</p>
                      <span
                        className={`px-2 py-0.5 text-[10px] rounded-full ${leaveTypeColor[l.leave_type] || ""}`}
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
            <p className="text-gray-400 text-sm">Employee chunein:</p>
            <select
              value={balanceEmp}
              onChange={(e) => setBalanceEmp(e.target.value)}
              className="bg-black/40 text-gray-300 border border-[#05DC7F]/25 rounded-lg px-3 py-2 text-sm outline-none min-w-56"
            >
              <option value="">— select —</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.full_name}
                  {e.department ? ` (${e.department})` : ""}
                </option>
              ))}
            </select>
          </div>

          {!balanceEmp ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              Balance dekhne ke liye employee chunein
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {balanceRows.map((b) => (
                <div
                  key={b.leave_type}
                  className="p-4 rounded-xl border border-[#05DC7F]/20 bg-black/30"
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
                      <button
                        onClick={() => adjustBalance(b.leave_type, 1)}
                        disabled={adjusting === b.leave_type}
                        className="flex-1 py-1 rounded-lg bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30 text-xs hover:bg-[#05DC7F]/25 transition disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <Plus size={14}  size={9} /> 1 day
                      </button>
                      <button
                        onClick={() => adjustBalance(b.leave_type, -1)}
                        disabled={adjusting === b.leave_type}
                        className="flex-1 py-1 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs hover:bg-red-500/25 transition disabled:opacity-40 flex items-center justify-center gap-1"
                      >
                        <Minus size={14}  size={9} /> 1 day
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
            Aap ki company ki leave types
          </p>
          <p className="text-gray-500 text-xs mb-4">
            Entitlement <b className="text-gray-400">0</b> kar dein to type
            dikhti to rahegi magar employee us par apply nahi kar sakega.
            Poori tarah chhupana ho to <b className="text-gray-400">Off</b> kar
            dein.
          </p>

          {/* ── Policy Extraction Agent ── */}
          <div className="mb-5 p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <p className="text-purple-300 text-sm font-medium flex items-center gap-2">
                  <Bot size={14} /> Types policy document se khud lagti hain
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Jab bhi Settings mein policy document upload hoti hai, agent
                  usay parh kar types khud laga deta hai — jo policy mein na
                  ho wo band ho jati hai. Neeche kuch ghalat lage to yahin
                  theek kar lein.
                </p>
              </div>
              {/* Sirf tab zaroori jab upload ke waqt agent fail ho gaya ho */}
              <button
                onClick={runExtraction}
                disabled={extracting}
                title="Upload ke waqt agent fail ho gaya ho to dobara chalayein"
                className="shrink-0 px-3 py-1.5 rounded-lg text-purple-300/80 border border-purple-500/25 text-xs hover:bg-purple-500/15 transition disabled:opacity-50 flex items-center gap-2"
              >
                {extracting ? (
                  <>
                    <Loader2 size={14}  className="animate-spin" /> Parh raha hai...
                  </>
                ) : (
                  "Dobara chalayein"
                )}
              </button>
            </div>

            {/* ── Agent ki tajweez — review panel ── */}
            {extraction && (
              <div className="mt-4 pt-4 border-t border-purple-500/20">
                <p className="text-gray-400 text-xs mb-3">
                  <b className="text-white">{extraction.policy_document}</b> se{" "}
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
                    <label
                      key={t.code}
                      className={`flex gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        picked[t.code]
                          ? "border-[#05DC7F]/40 bg-[#05DC7F]/5"
                          : "border-gray-700 bg-black/20"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!!picked[t.code]}
                        onChange={(e) =>
                          setPicked({ ...picked, [t.code]: e.target.checked })
                        }
                        className="mt-1 accent-[#05DC7F] w-4 h-4 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-white text-sm">
                          {t.label}
                          <span className="text-gray-500"> · {t.code}</span>
                          {t.is_new ? (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400">
                              nayi
                            </span>
                          ) : t.changes_entitlement ? (
                            <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-yellow-500/20 text-yellow-400">
                              {t.current_entitlement} → {t.days_per_year}
                            </span>
                          ) : null}
                          <span
                            className={`ml-2 px-1.5 py-0.5 text-[10px] rounded ${
                              t.confidence === "high"
                                ? "bg-[#05DC7F]/15 text-[#05DC7F]"
                                : "bg-orange-500/20 text-orange-400"
                            }`}
                          >
                            {t.confidence === "high"
                              ? "confident"
                              : "check karein"}
                          </span>
                        </p>

                        <p className="text-gray-400 text-xs mt-0.5">
                          {t.is_unlimited ? "∞" : `${t.days_per_year} din/saal`}
                          {t.advance_notice_days > 0
                            ? ` · ${t.advance_notice_days} din pehle`
                            : " · usi din bhi"}
                          {t.requires_certificate && " · certificate lazmi"}
                        </p>

                        {t.source_quote ? (
                          <p className="text-gray-500 text-[11px] mt-1 italic border-l-2 border-gray-700 pl-2">
                            "{t.source_quote}"
                          </p>
                        ) : (
                          <p className="text-orange-400/80 text-[11px] mt-1">
                            Document se koi line quote nahi hui — khud tasdeeq karein
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                {extraction.missing_from_policy?.length > 0 && (
                  <label className="flex items-start gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={zeroMissing}
                      onChange={(e) => setZeroMissing(e.target.checked)}
                      className="mt-0.5 accent-[#05DC7F] w-4 h-4"
                    />
                    <span className="text-gray-400 text-xs">
                      Jo types policy mein nahi mili unki entitlement{" "}
                      <b className="text-white">0</b> kar dein —{" "}
                      <span className="text-gray-500">
                        {extraction.missing_from_policy
                          .map((m) => m.label)
                          .join(", ")}
                      </span>
                    </span>
                  </label>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={applyExtraction}
                    disabled={applying}
                    className="px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:bg-[#04c56f] transition disabled:opacity-50"
                  >
                    {applying ? "Save ho raha hai..." : "Chuni hui types apply karein"}
                  </button>
                  <button
                    onClick={() => setExtraction(null)}
                    className="px-4 py-2 rounded-xl text-gray-400 border border-gray-700 text-sm hover:bg-gray-800 transition"
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
                <div
                  key={t.code}
                  className={`p-4 rounded-xl border ${
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
                            policy se
                          </span>
                        )}
                        {t.source === "manual" && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-blue-500/15 text-blue-400">
                            manual
                          </span>
                        )}
                      </p>
                      <input
                        type="text"
                        value={d.label || ""}
                        onChange={(e) =>
                          editType(t.code, { label: e.target.value })
                        }
                        className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                      />
                      {t.policy_reference && (
                        <p className="text-gray-600 text-[10px] mt-1 italic truncate">
                          {t.policy_reference}
                        </p>
                      )}
                    </div>

                    {/* Days */}
                    <div className="w-full lg:w-28">
                      <p className="text-gray-500 text-xs mb-1">Days / year</p>
                      <input
                        type="number"
                        min="0"
                        disabled={d.is_unlimited}
                        value={d.is_unlimited ? "" : d.default_entitlement ?? 0}
                        placeholder={d.is_unlimited ? "∞" : ""}
                        onChange={(e) =>
                          editType(t.code, {
                            default_entitlement: e.target.value,
                          })
                        }
                        className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none disabled:opacity-40"
                      />
                    </div>

                    {/* Notice */}
                    <div className="w-full lg:w-32">
                      <p
                        className="text-gray-500 text-xs mb-1"
                        title="Kitne din pehle apply karni hai. 0 = usi din bhi"
                      >
                        Notice (din)
                      </p>
                      <input
                        type="number"
                        min="0"
                        value={d.advance_notice_days ?? 0}
                        onChange={(e) =>
                          editType(t.code, {
                            advance_notice_days: e.target.value,
                          })
                        }
                        className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="flex gap-4 lg:gap-3 flex-wrap items-center pb-1">
                      {[
                        ["is_unlimited", "Unlimited"],
                        ["requires_certificate", "Certificate"],
                      ].map(([key, label]) => (
                        <label
                          key={key}
                          className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400"
                        >
                          <input
                            type="checkbox"
                            checked={!!d[key]}
                            onChange={(e) =>
                              editType(t.code, { [key]: e.target.checked })
                            }
                            className="accent-[#05DC7F] w-3.5 h-3.5"
                          />
                          {label}
                        </label>
                      ))}

                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={d.is_enabled !== false}
                          onChange={(e) =>
                            editType(t.code, { is_enabled: e.target.checked })
                          }
                          className="accent-[#05DC7F] w-3.5 h-3.5"
                        />
                        On
                      </label>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pb-0.5">
                      <button
                        onClick={() => saveType(t)}
                        disabled={!dirty || busy}
                        className="px-3 py-1.5 rounded-lg bg-[#05DC7F] text-black text-xs font-semibold hover:bg-[#04c56f] transition disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {busy ? "..." : "Save"}
                      </button>
                      <button
                        onClick={() => removeType(t)}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30 text-xs hover:bg-red-500/25 transition disabled:opacity-40"
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
                        Entitlement 0 hai — employee ko card dikhega magar apply
                        nahi kar sakega
                      </p>
                    )}
                  {d.is_enabled === false && (
                    <p className="text-gray-500 text-xs mt-2">
                      Band hai — employee ko yeh type dikhti hi nahi
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Nayi type ── */}
          <div className="mt-5">
            {!newType ? (
              <button
                onClick={() =>
                  setNewType({
                    code: "",
                    label: "",
                    default_entitlement: 0,
                    advance_notice_days: 1,
                    requires_certificate: false,
                    is_unlimited: false,
                  })
                }
                className="px-4 py-2 rounded-xl bg-[#05DC7F]/15 text-[#05DC7F] border border-[#05DC7F]/30 text-sm hover:bg-[#05DC7F]/25 transition"
              >
                + Nayi leave type
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-[#05DC7F]/30 bg-black/40">
                <p className="text-white text-sm font-medium mb-3">
                  Nayi leave type
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <p className="text-gray-500 text-xs mb-1">
                      Code (angrezi, bina space)
                    </p>
                    <input
                      type="text"
                      value={newType.code}
                      placeholder="maternity"
                      onChange={(e) =>
                        setNewType({ ...newType, code: e.target.value })
                      }
                      className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Name</p>
                    <input
                      type="text"
                      value={newType.label}
                      placeholder="Maternity Leave"
                      onChange={(e) =>
                        setNewType({ ...newType, label: e.target.value })
                      }
                      className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Days / year</p>
                    <input
                      type="number"
                      min="0"
                      value={newType.default_entitlement}
                      onChange={(e) =>
                        setNewType({
                          ...newType,
                          default_entitlement: e.target.value,
                        })
                      }
                      className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <p className="text-gray-500 text-xs mb-1">Notice (din)</p>
                    <input
                      type="number"
                      min="0"
                      value={newType.advance_notice_days}
                      onChange={(e) =>
                        setNewType({
                          ...newType,
                          advance_notice_days: e.target.value,
                        })
                      }
                      className="w-full bg-black/40 border border-[#05DC7F]/25 text-white rounded-lg px-3 py-1.5 text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-4 mb-4 flex-wrap">
                  {[
                    ["is_unlimited", "Unlimited (balance se nahi katti)"],
                    ["requires_certificate", "Certificate lazmi"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 cursor-pointer text-xs text-gray-400"
                    >
                      <input
                        type="checkbox"
                        checked={!!newType[key]}
                        onChange={(e) =>
                          setNewType({ ...newType, [key]: e.target.checked })
                        }
                        className="accent-[#05DC7F] w-3.5 h-3.5"
                      />
                      {label}
                    </label>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createType}
                    disabled={savingType === "__new__"}
                    className="px-4 py-2 rounded-xl bg-[#05DC7F] text-black text-sm font-semibold hover:bg-[#04c56f] transition disabled:opacity-50"
                  >
                    {savingType === "__new__" ? "Ban rahi hai..." : "Banayein"}
                  </button>
                  <button
                    onClick={() => setNewType(null)}
                    className="px-4 py-2 rounded-xl text-gray-400 border border-gray-700 text-sm hover:bg-gray-800 transition"
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
            <EmptyState
              icon={activeTab === "pending" ? Inbox : Search}
              title={
                activeTab === "pending"
                  ? "Koi request aap ka intezar nahi kar rahi"
                  : "Koi leave request nahi mili"
              }
              hint={
                activeTab === "pending"
                  ? "Nayi request aate hi yahan dikhegi — aur aap ko email bhi jayegi."
                  : "Filter badal kar dekhein, ya All chunein."
              }
            />
          </Panel>
        ) : (
          <div className="flex flex-col gap-4">
            {current.map((item) => (
              <div
                key={item.leave_id}
                className="flex flex-col lg:flex-row justify-between gap-4 p-5 rounded-2xl bg-black/40 border border-[#05DC7F]/25 hover:border-[#05DC7F]/45 transition-all"
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
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${leaveTypeColor[item.leave_type] || "bg-gray-500/20 text-gray-400"}`}
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
                      <button
                        onClick={() => viewCertificate(item.leave_id)}
                        className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition flex items-center gap-1"
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
                      <Bot size={14}  className="mt-0.5 shrink-0" />
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
                          — kam par rahe hain
                        </span>
                      )}
                    </p>
                  )}

                  {/* ── Aap jawab na dein to kab khud approve hogi ── */}
                  {item.status === "pending" && item.auto_approve_at && (
                    <p className="text-orange-400/90 text-xs flex items-center gap-1.5">
                      <Hourglass size={11} />
                      Jawab na diya to {prettyDateTime(item.auto_approve_at)} ko
                      khud approve ho jayegi
                      <span className="text-gray-500">
                        ({hoursLeft(item.auto_approve_at)})
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex items-center">
                  {item.status === "pending" && (
                    <button
                      onClick={() => {
                        setSelected(item);
                        setCeoNote("");
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition whitespace-nowrap"
                    >
                      <Eye size={14} /> Review
                    </button>
                  )}

                  {/* ── Approved leave CEO kabhi bhi cancel kar sakta hai,
                        chahe shuru ho chuki ho (employee nahi kar sakta) ── */}
                  {item.status === "approved" && (
                    <button
                      onClick={() => cancelApproved(item)}
                      disabled={deciding}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition whitespace-nowrap text-sm disabled:opacity-40"
                    >
                      <X size={14} /> Cancel Leave
                    </button>
                  )}
                </div>
              </div>
            ))}

            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setCurrentPage}
            />
          </div>
        ))}

      {/* ══ Review Modal ══ */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-black border border-[#05DC7F]/40 rounded-2xl p-6 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={14}  size={20} />
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
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${leaveTypeColor[selected.leave_type] || ""}`}
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
                <p
                  className={
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
                  Employee ki wajah
                </p>
                <p className="text-gray-300 text-sm">{selected.reason}</p>
              </div>
            )}

            {selected.has_medical_cert && (
              <button
                onClick={() => viewCertificate(selected.leave_id)}
                className="mb-4 w-full py-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition text-sm flex items-center justify-center gap-2"
              >
                <Paperclip size={14} /> Medical Certificate kholein
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
                  Jawab na dene ki surat mein yeh request{" "}
                  <b>{prettyDateTime(selected.auto_approve_at)}</b> ko khud
                  approve ho jayegi ({hoursLeft(selected.auto_approve_at)})
                </p>
              </div>
            )}

            {selected.agent_reason && (
              <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <p className="text-purple-400 text-xs font-semibold mb-1 flex items-center gap-1">
                  <Bot size={14} /> Leave Agent ka mashwara
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
                  — employee ko yahi wajah dikhegi
                </span>
              </p>
              <textarea
                value={ceoNote}
                onChange={(e) => setCeoNote(e.target.value)}
                rows={3}
                placeholder="Reject kar rahe hain to wajah zaroor likhein"
                className="w-full bg-black/40 border border-[#05DC7F]/30 text-white rounded-lg px-3 py-2 outline-none text-sm resize-none"
              />
              {/* Reject par wajah lazmi — employee ko pata to chale kyun hui */}
              {!ceoNote.trim() && (
                <p className="text-gray-500 text-xs mt-1">
                  Approve ke liye optional hai, <b>reject ke liye zaroori</b>.
                </p>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => decide(selected.leave_id, "approve")}
                disabled={deciding}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#05DC7F] hover:bg-[#04c56f] text-black font-semibold transition disabled:opacity-50"
              >
                {deciding ? <Loader2 size={14}  className="animate-spin" /> : <Check size={14} />}
                Approve
              </button>
              <button
                onClick={() => decide(selected.leave_id, "reject")}
                disabled={deciding || !ceoNote.trim()}
                title={
                  !ceoNote.trim()
                    ? "Reject karne ke liye wajah likhna zaroori hai"
                    : ""
                }
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deciding ? <Loader2 size={14}  className="animate-spin" /> : <Ban size={14} />}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
