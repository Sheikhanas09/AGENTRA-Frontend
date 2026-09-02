"use client";
import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  BotMessageSquare,
  X,
  Send,
  Download,
  History,
  Plus,
  Trash2,
  Check,
  FileText,
  CornerDownLeft,
} from "lucide-react";

const API = "http://127.0.0.1:8000";

// The first thing an employee sees. It says what this is for — nothing
// about how it works, because that is not their problem.
const GREETING = {
  role: "hr",
  text:
    "Hello! 👋 This is the HR help desk.\n\nAsk me anything about your " +
    "leave, attendance, salary, your own record or the company policy — " +
    "or just tell me what you need and I will take care of it.\n\n" +
    "Aap Roman Urdu mein bhi likh sakte hain.",
  quickReplies: [
    "My leave balance",
    "This month's attendance",
    "My last salary slip",
    "How do I apply for leave?",
  ],
};

const timeOf = (iso) => {
  const d = iso ? new Date(iso.replace(" ", "T") + "Z") : new Date();
  return d.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
};

const todayStr = () => new Date().toISOString().slice(0, 10);

// What the answer was built from, said in words an employee recognises.
// The raw names are ours; "leave_balance" means nothing to them.
const SOURCE_LABELS = {
  leave_balance: "Your leave balance",
  leave_history: "Your leave history",
  attendance_summary: "Your attendance",
  attendance_today: "Today's attendance",
  attendance_on_date: "That day's record",
  payslips: "Your salary slips",
  payslip_breakdown: "Salary breakdown",
  salary_structure: "Your salary",
  payroll_status: "Payroll status",
  loans: "Your advance",
  profile: "Your record",
  interviews: "Your interviews",
  work_policy: "Your shift",
  payroll_rules: "Salary rules",
  how_it_works: "How it works",
  hr_playbook: "HR process",
  job_openings: "Open roles",
  my_requests: "Your requests",
  system_limits: "What we run",
};

const sourceLabel = (s) =>
  s.kind === "policy"
    ? "Company policy"
    : SOURCE_LABELS[s.name] || s.label || "Your records";

// ══════════════════════════════════════════════
// Component
// ══════════════════════════════════════════════
export default function HRChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ id: 0, ...GREETING }]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState("");

  // A drafted action waiting on the employee. Nothing is created until
  // they press Confirm on it.
  const [draft, setDraft] = useState(null);
  const [sending, setSending] = useState(false);

  // Past conversations
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState([]);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem("token");
  const employeeId = localStorage.getItem("user_id");
  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );
  const jsonHeaders = useMemo(
    () => ({ ...authHeaders, "Content-Type": "application/json" }),
    [authHeaders],
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, draft]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  // ──── Ask ────
  const send = useCallback(
    async (override) => {
      const text = (override ?? input).trim();
      if (!text || isTyping) return;

      setError("");
      setDraft(null);
      setInput("");
      setMessages((prev) => [
        ...prev,
        { id: `u-${prev.length}-${text.length}`, role: "employee", text },
      ]);
      setIsTyping(true);

      try {
        const res = await fetch(`${API}/chat/message`, {
          method: "POST",
          headers: jsonHeaders,
          body: JSON.stringify({ text, session_id: sessionId }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.detail || "Message could not be sent");
          setIsTyping(false);
          return;
        }

        setSessionId(data.session_id);
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            role: "hr",
            text: data.message.text,
            sources: data.message.sources || [],
            attachments: data.attachments || [],
            at: data.message.at,
          },
        ]);

        // A draft, not a submission
        if (data.action?.type === "leave_request") {
          setDraft({
            type: "leave_request",
            leave_type: data.action.leave_type || "",
            start_date: data.action.start_date || todayStr(),
            end_date:
              data.action.end_date || data.action.start_date || todayStr(),
            reason: data.action.reason || "",
          });
        } else if (data.action?.type === "hr_request") {
          setDraft({
            type: "hr_request",
            kind: data.action.kind || "other",
            subject: data.action.subject || text.slice(0, 120),
            // Pre-filled with what the conversation already established,
            // so the CEO gets a request they can actually decide rather
            // than a one-line subject with no context behind it.
            body: data.action.body || "",
          });
        }
      } catch {
        setError("Could not reach the server");
      }
      setIsTyping(false);
    },
    [input, isTyping, jsonHeaders, sessionId],
  );

  // ──── Confirm a leave draft ────
  // Goes to the same route the Leave tab uses, so balance, overlap,
  // notice period and approval all behave identically.
  const submitLeave = async () => {
    if (!draft.leave_type || !draft.start_date || !draft.end_date) {
      setError("Please fill in the leave type and both dates");
      return;
    }
    if ((draft.reason || "").trim().length < 5) {
      setError("Please give a short reason");
      return;
    }

    setSending(true);
    setError("");
    try {
      const body = new FormData();
      body.append("employee_id", employeeId);
      body.append("leave_type", draft.leave_type);
      body.append("start_date", draft.start_date);
      body.append("end_date", draft.end_date);
      body.append("reason", draft.reason);

      const res = await fetch(`${API}/leave/request`, {
        method: "POST",
        headers: authHeaders,
        body,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "Your leave request could not be submitted");
        setSending(false);
        return;
      }

      setDraft(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${prev.length}`,
          role: "hr",
          text:
            `Your ${draft.leave_type} leave request for ` +
            `${draft.start_date} to ${draft.end_date} has been submitted.` +
            (data.total_days ? `\nTotal days: ${data.total_days}` : "") +
            "\n\nYou can follow it in the Leave tab.",
        },
      ]);
    } catch {
      setError("Could not reach the server");
    }
    setSending(false);
  };

  // ──── Confirm an HR request ────
  const submitRequest = async () => {
    if ((draft.subject || "").trim().length < 3) {
      setError("Please write what you need in one line");
      return;
    }

    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API}/chat/confirm`, {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          kind: draft.kind,
          subject: draft.subject,
          body: draft.body || null,
          session_id: sessionId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || "That could not be submitted");
        setSending(false);
        return;
      }

      setDraft(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${prev.length}`,
          role: "hr",
          text:
            `Noted — “${data.subject}”.\n\nI am looking into it and will ` +
            `come back to you here.`,
        },
      ]);
    } catch {
      setError("Could not reach the server");
    }
    setSending(false);
  };

  // ──── Salary slip as a PDF ────
  // Needs an auth header, so a plain link will not do — fetch, then blob
  const downloadSlip = async (payslipId, label) => {
    setError("");
    try {
      const res = await fetch(`${API}/payroll/slip/${payslipId}/download`, {
        headers: authHeaders,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.detail || "That slip is not available yet");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `salary-slip-${(label || payslipId)
        .toString()
        .replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Download failed");
    }
  };

  // ──── Past conversations ────
  const openHistory = async () => {
    setShowHistory(true);
    try {
      const res = await fetch(`${API}/chat/sessions`, { headers: authHeaders });
      const data = await res.json();
      if (res.ok) setSessions(data.sessions || []);
    } catch {
      /* the list simply stays empty */
    }
  };

  const loadSession = async (id) => {
    try {
      const res = await fetch(`${API}/chat/session/${id}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (!res.ok) return;

      setSessionId(data.session_id);
      setDraft(null);
      setMessages(
        (data.messages || []).map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          sources: m.sources || [],
          at: m.at,
        })),
      );
      setShowHistory(false);
    } catch {
      /* leave the current thread as it is */
    }
  };

  const deleteSession = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`${API}/chat/session/${id}`, {
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
    setDraft(null);
    setError("");
    setMessages([{ id: 0, ...GREETING }]);
    setShowHistory(false);
  };

  // ══════════════════════════════════════════════
  return (
    <>
      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-md h-[540px] max-h-[calc(100vh-8rem)] flex flex-col rounded-2xl border border-[#05DC7F]/30 bg-[#111] shadow-[0_0_30px_rgba(5,220,127,0.12)] overflow-hidden animate-slideUp">
          {/* ──── HEADER ──── */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#05DC7F]/20 bg-[#111] shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#05DC7F]/10 border border-[#05DC7F]/35 flex items-center justify-center">
              <BotMessageSquare size={18} className="text-[#05DC7F]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">HR Help Desk</p>
              <p className="text-white/40 text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#05DC7F] inline-block" />
                Online · Always here to help
              </p>
            </div>

            <button
              onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
              title="Past conversations"
              className={`w-7 h-7 rounded-lg flex items-center justify-center transition ${
                showHistory
                  ? "bg-[#05DC7F]/15 text-[#05DC7F]"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <History size={15} />
            </button>
            <button
              onClick={newChat}
              title="New conversation"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* ──── HISTORY DRAWER ──── */}
          {showHistory ? (
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1.5">
              {sessions.length === 0 ? (
                <p className="text-white/35 text-[12px] text-center mt-8">
                  No past conversations yet.
                </p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.session_id}
                    onClick={() => loadSession(s.session_id)}
                    className={`group w-full text-left px-3 py-2 rounded-xl border transition flex items-center gap-2 ${
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
            /* ──── MESSAGES ──── */
            <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col max-w-[88%] ${
                    msg.role === "employee"
                      ? "self-end items-end"
                      : "self-start items-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${
                      msg.role === "employee"
                        ? "bg-[#05DC7F] text-black font-medium rounded-br-sm"
                        : "border border-[#05DC7F]/20 text-white/85 rounded-bl-sm"
                    }`}
                    style={
                      msg.role === "hr"
                        ? { background: "rgba(5,220,127,0.08)" }
                        : {}
                    }
                  >
                    {msg.text}
                  </div>

                  {/* Where the answer came from */}
                  {msg.sources?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[...new Set(msg.sources.map(sourceLabel))]
                        .slice(0, 4)
                        .map((label) => (
                          <span
                            key={label}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40"
                          >
                            {label}
                          </span>
                        ))}
                    </div>
                  )}

                  {/* Salary slips offered as a PDF */}
                  {msg.attachments?.length > 0 && (
                    <div className="flex flex-col gap-1.5 mt-2 w-full">
                      {msg.attachments.map((a) => (
                        <button
                          key={a.payslip_id}
                          onClick={() =>
                            downloadSlip(a.payslip_id, a.period_label)
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#05DC7F]/30 bg-[#05DC7F]/7 hover:bg-[#05DC7F]/15 transition text-left"
                        >
                          <FileText size={14} className="text-[#05DC7F] shrink-0" />
                          <span className="flex-1 text-[12px] text-white/80">
                            Salary slip · {a.period_label}
                          </span>
                          <Download size={13} className="text-[#05DC7F]" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className="text-[10px] text-white/25 mt-1 px-1">
                    {timeOf(msg.at)}
                  </span>

                  {msg.quickReplies && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.quickReplies.map((qr) => (
                        <button
                          key={qr}
                          onClick={() => send(qr)}
                          className="text-[11px] px-3 py-1 rounded-full border border-[#05DC7F]/35 text-[#05DC7F] hover:bg-[#05DC7F]/12 transition-all"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* ──── CONFIRM CARD ──── */}
              {/* Nothing has been submitted at this point. The employee sees
                  exactly what will be sent and can change it first. */}
              {draft?.type === "leave_request" && (
                <div className="self-start w-full rounded-xl border border-[#05DC7F]/30 bg-[#05DC7F]/6 p-3 flex flex-col gap-2">
                  <p className="text-[#05DC7F] text-[12px] font-semibold">
                    Check this before I send it
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Leave type">
                      <input
                        value={draft.leave_type}
                        onChange={(e) =>
                          setDraft({ ...draft, leave_type: e.target.value })
                        }
                        placeholder="casual"
                        className="draft-in"
                      />
                    </Field>
                    <Field label="Reason">
                      <input
                        value={draft.reason}
                        onChange={(e) =>
                          setDraft({ ...draft, reason: e.target.value })
                        }
                        placeholder="Why you need it"
                        className="draft-in"
                      />
                    </Field>
                    <Field label="From">
                      <input
                        type="date"
                        value={draft.start_date}
                        onChange={(e) =>
                          setDraft({ ...draft, start_date: e.target.value })
                        }
                        className="draft-in"
                      />
                    </Field>
                    <Field label="To">
                      <input
                        type="date"
                        value={draft.end_date}
                        onChange={(e) =>
                          setDraft({ ...draft, end_date: e.target.value })
                        }
                        className="draft-in"
                      />
                    </Field>
                  </div>

                  <DraftButtons
                    busy={sending}
                    onConfirm={submitLeave}
                    onCancel={() => setDraft(null)}
                    confirmLabel="Submit leave request"
                  />
                </div>
              )}

              {draft?.type === "hr_request" && (
                <div className="self-start w-full rounded-xl border border-[#05DC7F]/30 bg-[#05DC7F]/6 p-3 flex flex-col gap-2">
                  <p className="text-[#05DC7F] text-[12px] font-semibold">
                    Check this before I send it
                  </p>

                  <Field label="What you need">
                    <input
                      value={draft.subject}
                      onChange={(e) =>
                        setDraft({ ...draft, subject: e.target.value })
                      }
                      className="draft-in"
                    />
                  </Field>
                  <Field label="Any detail (optional)">
                    <textarea
                      rows={2}
                      value={draft.body}
                      onChange={(e) =>
                        setDraft({ ...draft, body: e.target.value })
                      }
                      className="draft-in resize-none"
                    />
                  </Field>

                  <DraftButtons
                    busy={sending}
                    onConfirm={submitRequest}
                    onCancel={() => setDraft(null)}
                    confirmLabel="Yes, go ahead"
                  />
                </div>
              )}

              {isTyping && (
                <div
                  className="self-start flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-sm border border-[#05DC7F]/20"
                  style={{ background: "rgba(5,220,127,0.08)" }}
                >
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

          {/* ──── ERROR ──── */}
          {error && (
            <div className="px-3 py-1.5 text-[11px] text-red-300 bg-red-500/10 border-t border-red-500/20 shrink-0">
              {error}
            </div>
          )}

          {/* ──── INPUT ──── */}
          {!showHistory && (
            <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#05DC7F]/20 bg-[#111] shrink-0">
              <input
                ref={inputRef}
                type="text"
                value={input}
                maxLength={2000}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Message HR..."
                className="flex-1 bg-white/5 border border-[#05DC7F]/20 rounded-full text-white text-[13px] px-4 py-2 outline-none placeholder:text-white/25 focus:border-[#05DC7F]/50 transition-colors"
              />
              <button
                onClick={() => send()}
                disabled={isTyping || !input.trim()}
                className="w-8 h-8 rounded-full bg-[#05DC7F] flex items-center justify-center shrink-0 hover:scale-110 active:scale-95 transition-transform disabled:opacity-35 disabled:hover:scale-100"
              >
                <Send size={14} className="text-black" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ──── FLOATING BUTTON ──── */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-6 right-4 md:right-6 z-50 w-14 h-14 rounded-full bg-[#05DC7F] flex items-center justify-center shadow-[0_0_20px_rgba(5,220,127,0.4)] hover:scale-110 active:scale-95 transition-transform"
        style={{
          animation:
            "floatUpDown 2.5s ease-in-out infinite, pulseRing 2s ease-out infinite",
        }}
      >
        <BotMessageSquare size={26} className="text-black" />
      </button>

      <style>{`
        @keyframes floatUpDown {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes pulseRing {
          0% { box-shadow: 0 0 0 0 rgba(5,220,127,0.45); }
          70% { box-shadow: 0 0 0 14px rgba(5,220,127,0); }
          100% { box-shadow: 0 0 0 0 rgba(5,220,127,0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-slideUp { animation: slideUp 0.25s ease forwards; }
        .draft-in {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 12px;
          color: #fff;
          outline: none;
          color-scheme: dark;
        }
        .draft-in:focus { border-color: rgba(5,220,127,0.5); }
        .draft-in::placeholder { color: rgba(255,255,255,0.25); }
      `}</style>
    </>
  );
}

// ══════════════════════════════════════════════
// Small pieces
// ══════════════════════════════════════════════
function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-white/35">
        {label}
      </span>
      {children}
    </label>
  );
}

function DraftButtons({ busy, onConfirm, onCancel, confirmLabel }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <button
        onClick={onConfirm}
        disabled={busy}
        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#05DC7F] text-black text-[12px] font-semibold hover:brightness-110 active:scale-95 transition disabled:opacity-50"
      >
        {busy ? (
          <CornerDownLeft size={13} className="animate-pulse" />
        ) : (
          <Check size={13} />
        )}
        {busy ? "Sending..." : confirmLabel}
      </button>
      <button
        onClick={onCancel}
        disabled={busy}
        className="px-3 py-1.5 rounded-lg border border-white/12 text-white/55 text-[12px] hover:text-white hover:border-white/25 transition disabled:opacity-50"
      >
        Cancel
      </button>
    </div>
  );
}
