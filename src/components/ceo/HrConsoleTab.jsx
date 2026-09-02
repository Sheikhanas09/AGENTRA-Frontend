"use client";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Users,
  Clock,
  Wallet,
  Inbox,
  Send,
  RefreshCw,
  SlidersHorizontal,
  UserCheck,
  MessageSquare,
  ShieldCheck,
  History,
  Plus,
  Trash2,
  FileText,
  Download,
} from "lucide-react";
import {
  Panel,
  IconButton,
  Pill,
  StatCard,
  EmptyState,
  TableSkeleton,
} from "../ui/kit";

const API = "http://127.0.0.1:8000";

// Things a CEO actually asks, so the first use is not a blank box.
const STARTERS = [
  "Who is coming late this month?",
  "What needs my decision?",
  "Kaun probation par hai?",
  "Salary cost this month",
];

// Every threshold this company decides by. The labels are the CEO's
// words for them — nobody outside this file calls it "case_stale_days".
const SETTING_GROUPS = [
  {
    title: "Probation",
    fields: [
      ["probation_days", "Probation lasts", "days"],
      ["probation_notice_days", "Warn before it ends", "days"],
    ],
  },
  {
    title: "Leave",
    fields: [
      ["leave_expiry_notice_days", "Warn before days lapse", "days"],
      ["leave_low_balance_days", "Flag a balance below", "days"],
    ],
  },
  {
    title: "Attendance",
    fields: [
      ["late_pattern_count", "Late arrivals worth a word", "times"],
      ["late_pattern_window_days", "…counted over", "days"],
      ["absence_pattern_count", "Unexplained days worth a word", "days"],
      ["absence_pattern_window_days", "…counted over", "days"],
    ],
  },
  {
    title: "Requests and cases",
    fields: [
      ["request_sla_days", "Chase a request after", "days"],
      ["case_stale_days", "A case has gone quiet after", "days"],
      ["grievance_cluster_count", "Concerns that make a pattern", "cases"],
      ["grievance_cluster_window_days", "…counted over", "days"],
    ],
  },
];

// Pre-built elements rather than component references: a component held
// in a destructured map parameter reads as unused to the linter, and the
// rest of this project passes icons the same way.
const TABS = [
  { key: "ask", label: "Ask", icon: <MessageSquare size={13} /> },
  { key: "overview", label: "Overview", icon: <Users size={13} /> },
  { key: "settings", label: "Thresholds", icon: <SlidersHorizontal size={13} /> },
];

const num = (n) =>
  n == null ? "—" : Number(n).toLocaleString("en-PK", { maximumFractionDigits: 0 });

export default function HrConsoleTab() {
  const [tab, setTab] = useState("ask");

  const token = localStorage.getItem("token");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );
  const jsonHeaders = useMemo(
    () => ({ ...authHeaders, "Content-Type": "application/json" }),
    [authHeaders],
  );

  // ──── Ask ────
  // The thread lives in the database, not in this component: switching
  // to another tab unmounts it, and the conversation used to go with it.
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef(null);

  // ──── Overview ────
  const [overview, setOverview] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // ──── Settings ────
  const [settings, setSettings] = useState(null);
  const [limits, setLimits] = useState({});
  const [savedNote, setSavedNote] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await fetch(`${API}/hr/overview`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setOverview(data);
      else setError(data.detail || "Could not load the overview");
    } catch {
      setError("Server error");
    }
    setLoadingOverview(false);
  }, [authHeaders]);

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/sessions`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch {
      /* the list simply stays empty */
    }
  }, [authHeaders]);

  // ──── Reopen the most recent thread on mount ────
  // Without this, coming back to the tab shows an empty box even though
  // the conversation is still there.
  const loadLatest = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/sessions`, { headers: authHeaders });
      const data = await res.json();
      const first = (data.sessions || [])[0];
      if (!res.ok || !first) return;

      const one = await fetch(`${API}/hr/session/${first.session_id}`, {
        headers: authHeaders,
      });
      const full = await one.json();
      if (!one.ok) return;
      setSessionId(full.session_id);
      setMessages(
        (full.messages || []).map((m) => ({
          role: m.role,
          text: m.text,
          sources: m.sources || [],
        })),
      );
    } catch {
      /* start empty */
    }
  }, [authHeaders]);

  const openSession = async (id) => {
    try {
      const res = await fetch(`${API}/hr/session/${id}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) return;
      setSessionId(data.session_id);
      setMessages(
        (data.messages || []).map((m) => ({
          role: m.role,
          text: m.text,
          sources: m.sources || [],
        })),
      );
      setShowHistory(false);
    } catch {
      /* leave the current thread alone */
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/hr/session/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      setSessions((prev) => prev.filter((s) => s.session_id !== id));
      if (id === sessionId) newChat();
    } catch {
      /* nothing to undo */
    }
  };

  const newChat = () => {
    setSessionId(null);
    setMessages([]);
    setShowHistory(false);
    setError("");
  };

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/hr/settings`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings);
        setLimits(data.limits || {});
      }
    } catch {
      /* the panel simply stays empty */
    }
  }, [authHeaders]);

  useEffect(() => {
    loadOverview();
    loadSettings();
    loadLatest();
  }, [loadOverview, loadSettings, loadLatest]);

  // ──── Ask a question ────
  const ask = async (override) => {
    const text = (override ?? input).trim();
    if (!text || thinking) return;

    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "ceo", text }]);
    setThinking(true);

    try {
      const res = await fetch(`${API}/hr/ask`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ text, session_id: sessionId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "That could not be answered");
      } else {
        if (data.session_id) setSessionId(data.session_id);
        setMessages((prev) => [
          ...prev,
          {
            role: "hr",
            text: data.reply,
            sources: data.sources || [],
            attachments: data.attachments || [],
          },
        ]);
        loadSessions();
      }
    } catch {
      setError("Could not reach the server");
    }
    setThinking(false);
  };

  // ──── A slip, as a PDF ────
  // Same route the Payroll tab and the employee's help desk use, with
  // the same `assert_can_view` check behind it.
  const downloadSlip = async (payslipId, label, who) => {
    setError("");
    try {
      const res = await fetch(`${API}/payroll/slip/${payslipId}/download`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "That slip is not available");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-slip-${(who || "employee").replace(/\s+/g, "-")}-${(
        label || payslipId
      )
        .toString()
        .replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed");
    }
  };

  // ──── Save one threshold ────
  const saveSetting = async (field, value) => {
    setSavedNote("");
    try {
      const res = await fetch(`${API}/hr/settings`, {
        method: "PUT",
        headers: jsonHeaders,
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "That value was not accepted");
        return;
      }
      setSavedNote("Saved");
      setTimeout(() => setSavedNote(""), 1800);
      loadOverview();
    } catch {
      setError("Server error");
    }
  };

  const head = overview?.headcount;
  const outliers = overview?.attendance_outliers;
  const items = overview?.open_items;
  const pay = overview?.payroll_overview;

  // ══════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-5">
      {/* ──── TILES ──── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Active people"
          value={head ? head.active : "—"}
          sub={head ? `${head.total_on_record} on record` : ""}
          tone="muted"
        />
        <StatCard
          icon={Clock}
          label="Past late threshold"
          value={outliers ? outliers.needs_attention.length : "—"}
          sub={outliers ? `${outliers.late_threshold}+ late days` : ""}
          tone={
            outliers && outliers.needs_attention.length > 0 ? "warn" : "good"
          }
        />
        <StatCard
          icon={Inbox}
          label="Waiting on you"
          value={items ? items.open_requests : "—"}
          sub={items && items.overdue_requests > 0
            ? `${items.overdue_requests} overdue`
            : "Nothing overdue"}
          tone={items && items.overdue_requests > 0 ? "bad" : "good"}
        />
        <StatCard
          icon={Wallet}
          label="This month's payroll"
          value={pay?.processed ? num(pay.total_net) : "—"}
          sub={pay?.processed ? `${pay.employees_paid} paid` : "Not run yet"}
          tone="muted"
        />
      </div>

      {/* ──── SWITCHER ──── */}
      <div className="flex gap-1.5">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              tab === key
                ? "bg-[#05DC7F] text-black border-transparent"
                : "bg-white/3 text-gray-400 border-white/10 hover:text-gray-200 hover:border-white/20"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[12.5px]">
          {error}
        </div>
      )}

      {/* ══════════ ASK ══════════ */}
      {tab === "ask" && (
        <Panel
          title="Ask HR"
          subtitle="Anything about your company, answered from its own records"
          icon={MessageSquare}
          actions={
            <div className="flex items-center gap-1.5">
              <IconButton
                icon={History}
                label="Past conversations"
                onClick={() => {
                  if (!showHistory) loadSessions();
                  setShowHistory((v) => !v);
                }}
                tone={showHistory ? "good" : "muted"}
              />
              <IconButton icon={Plus} label="New conversation" onClick={newChat} />
            </div>
          }
        >
          {showHistory ? (
            <div className="flex flex-col gap-1.5 min-h-[280px]">
              {sessions.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="No past conversations"
                  hint="Anything you ask here is kept so you can come back to it."
                />
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => openSession(s.session_id)}
                    className={`group w-full text-left px-3 py-2.5 rounded-xl border transition flex items-center gap-2 ${
                      s.session_id === sessionId
                        ? "border-[#05DC7F]/40 bg-[#05DC7F]/10"
                        : "border-white/10 bg-white/3 hover:border-[#05DC7F]/25"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-white/85 text-[12.5px] truncate">
                        {s.title}
                      </p>
                      <p className="text-white/30 text-[10.5px]">
                        {s.last_active_at?.slice(0, 16).replace("T", " ")}
                      </p>
                    </div>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => deleteSession(s.session_id, e)}
                      className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition p-1"
                    >
                      <Trash2 size={13} />
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : (
          <div className="flex flex-col gap-3 min-h-[280px]">
            {messages.length === 0 && (
              <div className="flex flex-col gap-3 py-2">
                <p className="text-white/45 text-[13px]">
                  Ask in English or Roman Urdu.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="text-[11.5px] px-3 py-1.5 rounded-full border border-[#05DC7F]/35 text-[#05DC7F] hover:bg-[#05DC7F]/12 transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex flex-col max-w-[85%] ${
                  m.role === "ceo" ? "self-end items-end" : "self-start"
                }`}
              >
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${
                    m.role === "ceo"
                      ? "bg-[#05DC7F] text-black font-medium rounded-br-sm"
                      : "border border-white/10 bg-white/3 text-white/85 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
                {m.attachments?.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-2 w-full">
                    {m.attachments.map((a) => (
                      <button
                        key={a.payslip_id}
                        onClick={() =>
                          downloadSlip(a.payslip_id, a.period_label, a.employee)
                        }
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#05DC7F]/30 bg-[#05DC7F]/7 hover:bg-[#05DC7F]/15 transition text-left"
                      >
                        <FileText size={14} className="text-[#05DC7F] shrink-0" />
                        <span className="flex-1 text-[12px] text-white/80">
                          {a.employee} · {a.period_label}
                        </span>
                        <Download size={13} className="text-[#05DC7F]" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Only the sources that name a tool get a badge. A reply
                    can also carry a record with no name — a pending
                    clarification, for one — and `s.name.replace()` on
                    that threw, which unmounted the whole tab and left a
                    blank screen. A missing badge is not worth a crash. */}
                {m.sources?.some((s) => s?.name) && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {m.sources
                      .filter((s) => s?.name)
                      .map((s, i) => (
                        <span
                          key={`${s.name}-${i}`}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40"
                        >
                          {String(s.name).replace(/_/g, " ")}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            ))}

            {thinking && (
              <div className="self-start flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm border border-white/10 bg-white/3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-[#05DC7F] inline-block animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          )}

          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/8">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder="Ask about your company..."
              className="flex-1 bg-white/5 border border-white/12 rounded-full text-white text-[13px] px-4 py-2.5 outline-none placeholder:text-white/25 focus:border-[#05DC7F]/50 transition"
            />
            <button
              onClick={() => ask()}
              disabled={thinking || !input.trim()}
              className="w-9 h-9 rounded-full bg-[#05DC7F] flex items-center justify-center shrink-0 hover:scale-110 active:scale-95 transition disabled:opacity-35 disabled:hover:scale-100"
            >
              <Send size={15} className="text-black" />
            </button>
          </div>

          <p className="text-white/25 text-[11px] mt-3 flex items-center gap-1.5">
            <ShieldCheck size={12} />
            Employees' private conversations are not visible here.
          </p>
        </Panel>
      )}

      {/* ══════════ OVERVIEW ══════════ */}
      {tab === "overview" && (
        <div className="flex flex-col gap-4">
          <Panel
            title="Your company right now"
            icon={Users}
            actions={
              <IconButton
                icon={RefreshCw}
                onClick={loadOverview}
                label="Refresh"
                busy={loadingOverview}
              />
            }
          >
            {loadingOverview ? (
              <TableSkeleton rows={4} cols={3} />
            ) : !overview ? (
              <EmptyState icon={Users} title="Nothing to show yet" />
            ) : (
              <div className="flex flex-col gap-5">
                <Section title="Headcount">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(head?.by_department || {}).map(([d, n]) => (
                      <Pill key={d} tone="muted">
                        {d} · {n}
                      </Pill>
                    ))}
                  </div>
                </Section>

                <Section title="On probation">
                  {overview.new_joiners?.on_probation?.length ? (
                    <div className="flex flex-col gap-1.5">
                      {overview.new_joiners.on_probation.map((p) => (
                        <Row
                          key={p.name}
                          left={p.name}
                          mid={p.department}
                          right={`${p.days_left} days left`}
                          tone={p.days_left <= 7 ? "warn" : "muted"}
                        />
                      ))}
                    </div>
                  ) : (
                    <Quiet>Nobody is on probation.</Quiet>
                  )}
                </Section>

                <Section
                  title={`Attendance — ${outliers?.month || "this month"}`}
                >
                  {outliers?.everyone?.length ? (
                    <div className="flex flex-col gap-1.5">
                      {outliers.everyone.slice(0, 8).map((r) => (
                        <Row
                          key={r.name}
                          left={r.name}
                          mid={`${r.present_days} present · ${r.late_days} late`}
                          right={
                            r.late_minutes
                              ? `${r.late_minutes} min late`
                              : "on time"
                          }
                          tone={r.over_late_threshold ? "bad" : "muted"}
                        />
                      ))}
                    </div>
                  ) : (
                    <Quiet>No attendance recorded this month.</Quiet>
                  )}
                </Section>

                <Section title="Leave">
                  <div className="flex flex-wrap gap-1.5">
                    <Pill tone={overview.leave_overview?.pending_count ? "warn" : "good"}>
                      {overview.leave_overview?.pending_count || 0} pending
                    </Pill>
                    <Pill tone="muted">
                      {overview.leave_overview?.upcoming_absences?.length || 0} upcoming absences
                    </Pill>
                    {overview.leave_overview?.expiring_soon?.length > 0 && (
                      <Pill tone="bad">
                        {overview.leave_overview.expiring_soon.length} balances lapsing
                      </Pill>
                    )}
                  </div>
                </Section>

                <Section title="Concerns raised">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(overview.case_patterns?.by_concern || {}).length ? (
                      Object.entries(overview.case_patterns.by_concern).map(
                        ([k, v]) => (
                          <Pill key={k} tone="muted">
                            {k.replace(/_/g, " ")} · {v}
                          </Pill>
                        ),
                      )
                    ) : (
                      <Quiet>Nothing raised in this window.</Quiet>
                    )}
                  </div>
                  <p className="text-white/25 text-[11px] mt-2">
                    Counts only — the details of a confidential case stay
                    between the employee and HR.
                  </p>
                </Section>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ══════════ SETTINGS ══════════ */}
      {tab === "settings" && (
        <Panel
          title="Your thresholds"
          subtitle="Every number the HR desk decides by. Nothing is fixed in the code."
          icon={SlidersHorizontal}
          actions={
            savedNote ? (
              <Pill tone="good" icon={UserCheck}>
                {savedNote}
              </Pill>
            ) : null
          }
        >
          {!settings ? (
            <TableSkeleton rows={4} cols={2} />
          ) : (
            <div className="flex flex-col gap-6">
              {SETTING_GROUPS.map((g) => (
                <Section key={g.title} title={g.title}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {g.fields.map(([field, label, unit]) => (
                      <label
                        key={field}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3"
                      >
                        <span className="flex-1 text-[12.5px] text-white/70">
                          {label}
                        </span>
                        <input
                          type="number"
                          value={settings[field] ?? ""}
                          min={limits[field]?.min}
                          max={limits[field]?.max}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              [field]: e.target.value === ""
                                ? ""
                                : Number(e.target.value),
                            })
                          }
                          onBlur={(e) =>
                            e.target.value !== "" &&
                            saveSetting(field, Number(e.target.value))
                          }
                          className="w-20 bg-white/5 border border-white/12 rounded-md px-2 py-1 text-[12.5px] text-white text-right tabular-nums outline-none focus:border-[#05DC7F]/50"
                        />
                        <span className="text-[11px] text-white/30 w-10">
                          {unit}
                        </span>
                      </label>
                    ))}
                  </div>
                </Section>
              ))}

              <Section title="Messages HR sends on its own">
                <div className="flex flex-col gap-2">
                  {[
                    ["proactive_to_employee", "Tell employees about their own probation, leave and attendance"],
                    ["proactive_to_ceo", "Tell me about probations, overdue requests and quiet cases"],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-white/10 bg-white/3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!!settings[field]}
                        onChange={(e) => {
                          setSettings({ ...settings, [field]: e.target.checked });
                          saveSetting(field, e.target.checked);
                        }}
                        className="accent-[#05DC7F] w-4 h-4"
                      />
                      <span className="text-[12.5px] text-white/70">{label}</span>
                    </label>
                  ))}
                </div>
              </Section>

              <p className="text-white/25 text-[11px]">
                Set any number to 0 to switch that check off entirely.
              </p>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
function Section({ title, children }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">
        {title}
      </p>
      {children}
    </div>
  );
}

function Quiet({ children }) {
  return <p className="text-white/35 text-[12.5px]">{children}</p>;
}

function Row({ left, mid, right, tone }) {
  const color =
    tone === "bad"
      ? "text-red-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-white/45";
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-white/8 bg-white/[0.02]">
      <span className="text-[12.5px] text-white/85 flex-1 truncate">{left}</span>
      <span className="text-[11.5px] text-white/40 hidden sm:block">{mid}</span>
      <span className={`text-[11.5px] tabular-nums ${color}`}>{right}</span>
    </div>
  );
}
