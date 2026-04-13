export default function LoadingButton({
  loading,
  onClick,
  text,
  loadingText = "PROCESSING",
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="relative w-full sm:w-auto min-w-[140px] h-[44px] mx-auto flex items-center justify-center border border-[#05DC7F] text-[#05DC7F] rounded-[14px] hover:bg-[#05DC7F] hover:text-black transition overflow-hidden disabled:cursor-not-allowed group"
    >
      {loading ? (
        <div className="flex items-center gap-2">
          {/* ──── Robotic text ──── */}
          <span className="text-[#05DC7F] text-xs font-mono tracking-widest">
            {loadingText}
          </span>

          {/* ──── Pulsing dots ──── */}
          <div className="flex items-center gap-[4px]">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className="block w-[5px] h-[5px] rounded-full bg-[#05DC7F]"
                style={{
                  animation: `robotPulse 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <span className="font-semibold tracking-widest">{text}</span>
      )}

      {/* ──── Scanning line effect jab loading ho ──── */}
      {loading && (
        <span
          className="absolute top-0 left-0 h-full w-[40px] bg-gradient-to-r from-transparent via-[#05DC7F]/30 to-transparent"
          style={{
            animation: "scanLine 1.5s linear infinite",
          }}
        />
      )}

      {/* ──── CSS animations ──── */}
      <style>{`
        @keyframes robotPulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.5); }
          50% { opacity: 1; transform: scaleY(1.4); }
        }
        @keyframes scanLine {
          0% { left: -40px; }
          100% { left: 100%; }
        }
      `}</style>
    </button>
  );
}
