"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Inbox,
  RefreshCw,
  Check,
  X,
  FileText,
  Wallet,
  AlertTriangle,
  MessageSquareWarning,
  HelpCircle,
  Clock,
  User,
} from "lucide-react";
import {
  Panel,
  IconButton,
  Pill,
  StatCard,
  FilterChips,
  EmptyState,
  TableSkeleton,
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

// What kind of thing was asked for. The icon carries most of the meaning
// in a long list, so each kind gets its own.
const KINDS = {
  document: { label: "Document", icon: FileText },
  advance: { label: "Advance", icon: Wallet },
  correction: { label: "Correction", icon: AlertTriangle },
  complaint: { label: "Complaint", icon: MessageSquareWarning },
  question: { label: "Question", icon: HelpCircle },
  other: { label: "Other", icon: Inbox },
};

const STATUS_TONE = {
  open: "warn",
  resolved: "good",
  rejected: "bad",
};

// A rejection has to say why — the employee reads this note, and
// "rejected" on its own tells them nothing.
const MIN_REASON = 5;

export default function RequestsTab() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("open");

  // Stamped when the list loads, not read during render — "how old is the
  // oldest pending one" must not change value on an unrelated re-render.
  const [loadedAt, setLoadedAt] = useState(0);

  // The one being answered right now
  const [openId, setOpenId] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/chat/requests`, { headers: authHeaders });
      const data = await res.json();
      setLoadedAt(Date.now());
      if (res.ok) setRequests(data.requests || []);
      else setError(data.detail || "Requests could not be loaded");
    } catch {
      setError("Server error");
    }
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  // ──── Decide ────
  const decide = async (requestId, status) => {
    const reason = note.trim();
    if (status === "rejected" && reason.length < MIN_REASON) {
      setError("Please give a reason — the employee will see it");
      return;
    }

    setBusy(`${requestId}-${status}`);
    setError("");
    const stamp = new Date().toISOString().slice(0, 19);
    try {
      const res = await fetch(`${API}/chat/requests/${requestId}/resolve`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: reason || null }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Could not be saved");
        setBusy("");
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.request_id === requestId
            ? {
                ...r,
                status,
                ceo_note: reason || null,
                resolved_at: stamp,
              }
            : r,
        ),
      );
      setOpenId(null);
      setNote("");
    } catch {
      setError("Server error");
    }
    setBusy("");
  };

  const counts = useMemo(
    () => ({
      all: requests.length,
      open: requests.filter((r) => r.status === "open").length,
      resolved: requests.filter((r) => r.status === "resolved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests],
  );

  const shown =
    filter === "all" ? requests : requests.filter((r) => r.status === filter);

  const oldestOpen = useMemo(() => {
    if (!loadedAt) return null;
    const open = requests.filter((r) => r.status === "open" && r.created_at);
    if (open.length === 0) return null;
    const first = open.reduce((a, b) => (a.created_at < b.created_at ? a : b));
    const ms = loadedAt - new Date(first.created_at.replace(" ", "T") + "Z");
    return Math.max(0, Math.floor(ms / 86400000));
  }, [requests, loadedAt]);

  // ══════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-5">
      {/* ──── TILES ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Inbox}
          label="Waiting on you"
          value={counts.open}
          tone={counts.open > 0 ? "warn" : "good"}
          sub={counts.open === 0 ? "Nothing pending" : "Needs a decision"}
        />
        <StatCard
          icon={Check}
          label="Approved"
          value={counts.resolved}
          tone="good"
        />
        <StatCard icon={X} label="Declined" value={counts.rejected} tone="bad" />
        <StatCard
          icon={Clock}
          label="Oldest pending"
          value={oldestOpen === null ? "—" : `${oldestOpen}d`}
          tone={oldestOpen !== null && oldestOpen > 3 ? "bad" : "muted"}
          sub={oldestOpen === null ? "Queue is clear" : "Since it was raised"}
        />
      </div>

      {/* ──── LIST ──── */}
      <Panel
        title="Employee requests"
        subtitle="Raised through the HR help desk"
        icon={Inbox}
        actions={
          <IconButton
            icon={RefreshCw}
            onClick={load}
            label="Refresh"
            busy={loading}
          />
        }
      >
        <div className="mb-4">
          <FilterChips
            value={filter}
            onChange={setFilter}
            counts={counts}
            options={[
              { value: "open", label: "Pending" },
              { value: "resolved", label: "Approved" },
              { value: "rejected", label: "Declined" },
              { value: "all", label: "All" },
            ]}
          />
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[12.5px]">
            {error}
          </div>
        )}

        {loading ? (
          <TableSkeleton rows={4} cols={3} />
        ) : shown.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={
              filter === "open"
                ? "No requests waiting"
                : "Nothing in this list"
            }
            hint="Requests employees raise through the help desk appear here."
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            {shown.map((r) => {
              const kind = KINDS[r.kind] || KINDS.other;
              const KindIcon = kind.icon;
              const isOpen = openId === r.request_id;

              return (
                <div
                  key={r.request_id}
                  className={`rounded-xl border transition-colors ${
                    r.status === "open"
                      ? "border-amber-400/25 bg-amber-400/4"
                      : "border-white/10 bg-white/3"
                  }`}
                >
                  <div className="p-3.5 flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#05DC7F]/10 border border-[#05DC7F]/25 flex items-center justify-center shrink-0">
                      <KindIcon size={16} className="text-[#05DC7F]" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-white/90 text-[13.5px] font-medium">
                          {r.subject}
                        </p>
                        <Pill tone="muted">{kind.label}</Pill>
                        <Pill tone={STATUS_TONE[r.status] || "muted"}>
                          {r.status === "open"
                            ? "Pending"
                            : r.status === "resolved"
                              ? "Approved"
                              : "Declined"}
                        </Pill>
                      </div>

                      <p className="text-white/40 text-[11.5px] mt-1 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User size={11} />
                          {r.employee_name || `Employee #${r.employee_id}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          {r.created_at?.replace("T", " ").slice(0, 16)}
                        </span>
                      </p>

                      {r.body && (
                        <p className="text-white/55 text-[12.5px] mt-2 whitespace-pre-line">
                          {r.body}
                        </p>
                      )}

                      {r.ceo_note && (
                        <p className="text-white/45 text-[12px] mt-2 pl-2.5 border-l-2 border-[#05DC7F]/30">
                          Your reply: {r.ceo_note}
                        </p>
                      )}
                    </div>

                    {r.status === "open" && !isOpen && (
                      <button
                        onClick={() => {
                          setOpenId(r.request_id);
                          setNote("");
                          setError("");
                        }}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-[#05DC7F] text-black text-[12px] font-semibold hover:brightness-110 active:scale-95 transition"
                      >
                        Respond
                      </button>
                    )}
                  </div>

                  {/* ──── RESPOND ──── */}
                  {isOpen && (
                    <div className="px-3.5 pb-3.5 pt-0 flex flex-col gap-2">
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Your reply to the employee — required if you decline"
                        className="w-full bg-white/5 border border-white/12 rounded-lg px-3 py-2 text-[12.5px] text-white outline-none resize-none focus:border-[#05DC7F]/50 placeholder:text-white/25"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => decide(r.request_id, "resolved")}
                          disabled={busy.startsWith(`${r.request_id}-`)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#05DC7F] text-black text-[12px] font-semibold hover:brightness-110 active:scale-95 transition disabled:opacity-50"
                        >
                          <Check size={13} />
                          Approve
                        </button>
                        <button
                          onClick={() => decide(r.request_id, "rejected")}
                          disabled={busy.startsWith(`${r.request_id}-`)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-red-500/35 text-red-300 text-[12px] font-semibold hover:bg-red-500/10 active:scale-95 transition disabled:opacity-50"
                        >
                          <X size={13} />
                          Decline
                        </button>
                        <button
                          onClick={() => {
                            setOpenId(null);
                            setNote("");
                          }}
                          className="ml-auto text-white/45 hover:text-white text-[12px] transition"
                        >
                          Cancel
                        </button>
                      </div>
                      <p className="text-white/30 text-[11px]">
                        The employee is told either way — in their help desk
                        conversation and by email.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
