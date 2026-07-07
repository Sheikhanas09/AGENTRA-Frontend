import { useState, useRef, useEffect } from "react";
import { BotMessageSquare, X, Send } from "lucide-react";

const botReplies = {
  leave:
    "Aapki Leave Balance:\n✅ Annual Leave: 12 days\n✅ Sick Leave: 6 days\n✅ Casual Leave: 4 days\nLeave apply karne ke liye Leave tab visit karein.",
  payroll:
    "Aapki is month ki salary process ho chuki hai. Detail ke liye Payroll tab check karein. Koi aur sawaal?",
  attendance:
    "Is month aapki attendance 22/23 days hai. Last absent: Jan 28. Attendance tab mein full report dekhein.",
  default:
    "Shukriya! Main aapki request process kar raha hoon. HR department se rabta kiya jayega. Koi aur help chahiye?",
};

function getBotReply(text) {
  const t = text.toLowerCase();
  if (t.includes("leave")) return botReplies.leave;
  if (t.includes("payroll") || t.includes("salary")) return botReplies.payroll;
  if (t.includes("attendance")) return botReplies.attendance;
  return botReplies.default;
}

function getTime() {
  return new Date().toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HRChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "bot",
      text: "Assalam o Alaikum! 👋 Main aapka HR Assistant hoon. Kaise madad kar sakta hoon?",
      time: getTime(),
      quickReplies: ["Leave Balance", "Payroll", "Attendance"],
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg = {
      id: Date.now(),
      type: "user",
      text: msgText,
      time: getTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: "bot",
          text: getBotReply(msgText),
          time: getTime(),
        },
      ]);
    }, 1200);
  };

  return (
    <>
      {/* ===== CHAT PANEL ===== */}
      {isOpen && (
        <div className="fixed bottom-24 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm h-[430px] flex flex-col rounded-2xl border border-[#05DC7F]/30 bg-[#111] shadow-[0_0_30px_rgba(5,220,127,0.12)] overflow-hidden animate-slideUp">
          {/* HEADER */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#05DC7F]/20 bg-[#111] flex-shrink-0">
            <div className="w-9 h-9 rounded-full bg-[#05DC7F]/10 border border-[#05DC7F]/35 flex items-center justify-center">
              <BotMessageSquare size={18} className="text-[#05DC7F]" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold">HR Assistant</p>
              <p className="text-white/40 text-[11px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#05DC7F] inline-block" />
                Online · Always here to help
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/40 hover:text-white transition text-lg leading-none"
            >
              <X size={18} />
            </button>
          </div>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3 scrollbar-thin scrollbar-thumb-[#05DC7F]/20">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${
                  msg.type === "user"
                    ? "self-end items-end"
                    : "self-start items-start"
                }`}
              >
                <div
                  className={`px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-line ${
                    msg.type === "user"
                      ? "bg-[#05DC7F] text-black font-medium rounded-br-[4px]"
                      : "bg-[#05DC7F]/08 border border-[#05DC7F]/20 text-white/85 rounded-bl-[4px]"
                  }`}
                  style={
                    msg.type === "bot"
                      ? { background: "rgba(5,220,127,0.08)" }
                      : {}
                  }
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-white/25 mt-1 px-1">
                  {msg.time}
                </span>

                {/* QUICK REPLIES */}
                {msg.quickReplies && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {msg.quickReplies.map((qr) => (
                      <button
                        key={qr}
                        onClick={() => sendMessage(qr)}
                        className="text-[11px] px-3 py-1 rounded-full border border-[#05DC7F]/35 text-[#05DC7F] hover:bg-[#05DC7F]/12 transition-all"
                        style={{ background: "transparent" }}
                      >
                        {qr}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* TYPING INDICATOR */}
            {isTyping && (
              <div
                className="self-start flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-bl-[4px] border border-[#05DC7F]/20"
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

            <div ref={messagesEndRef} />
          </div>

          {/* INPUT */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[#05DC7F]/20 bg-[#111] flex-shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Message HR Assistant..."
              className="flex-1 bg-white/5 border border-[#05DC7F]/20 rounded-full text-white text-[13px] px-4 py-2 outline-none placeholder:text-white/25 focus:border-[#05DC7F]/50 transition-colors"
            />
            <button
              onClick={() => sendMessage()}
              className="w-8 h-8 rounded-full bg-[#05DC7F] flex items-center justify-center flex-shrink-0 hover:scale-110 active:scale-95 transition-transform"
            >
              <Send size={14} className="text-black" />
            </button>
          </div>
        </div>
      )}

      {/* ===== FLOATING BUTTON ===== */}
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

      {/* ===== ANIMATIONS ===== */}
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
        .animate-slideUp {
          animation: slideUp 0.25s ease forwards;
        }
      `}</style>
    </>
  );
}
