/**
 * HrBot — laptop uthaye, chal kar aata hua
 * ────────────────────────────────────────
 * Landing page ke daayen taraf. Daayen se chal kar andar aata hai, phir
 * khara ho kar kaam karta rehta hai.
 *
 * ═══════════════════════════════════════════════════════════
 * SVG + CSS — three.js NAHI
 * ═══════════════════════════════════════════════════════════
 * `three`, `@react-three/fiber` aur `drei` is project mein pehle se
 * mojood hain (`CircuitBackground`), to 3D bot banaya ja sakta tha. Do
 * wajah se nahi banaya:
 *
 *   · Ek dhang ka character 3D mein ek ASSET hai (GLTF/GLB), code nahi.
 *     Primitives se bana hua "robot" har dafa bhadda lagta hai.
 *   · Landing page ka PEHLA FRAME sab se ziyada maani rakhta hai. SVG
 *     foran render hota hai; 3D canvas ko WebGL context aur pehla frame
 *     chahiye.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠ CHAL INSAN JAISI KYUN LAGTI HAI — CHAAR CHEEZEIN, EK NAHI
 * ═══════════════════════════════════════════════════════════
 * Pehli koshish mein taangein seedhi lakriyan thin jo aage peeche
 * jhoolti thin. Wo "chalna" nahi lagta — wo pendulum lagta hai. Insan ki
 * chal mein chaar cheezein ek saath hoti hain:
 *
 *   1. GHUTNA — sab se bara farq yehi deta hai. Jo taang uthti hai us ka
 *      ghutna murta hai, jo aage parti hai us ka seedha hota hai. Is ke
 *      liye taang do hisson mein hai (raan + pindli), aur pindli raan ke
 *      ANDAR hai — to wo us ki gardish saath le kar chalti hai, bilkul
 *      jaise asli ghutna.
 *   2. UPAR NEECHE, magar DUGNI raftar par. Jism har QADAM par uthta
 *      girta hai, har cycle par nahi — do dafa fi cycle.
 *   3. Daayen baayen JHUKAV. Wazan jis taang par ho, jism us taraf.
 *      Bina is ke chal patli aur machine jaisi lagti hai.
 *   4. Aage ko halka sa JHUKAV chalte waqt, aur pohanch kar seedha.
 *
 * ⚠ Aur cycle ka 0%/100% "passing pose" hai — jahan dono taangein saath
 * hoti hain. Us se chal apne aap KHARE hone par khatam hoti hai. Agar
 * cycle contact pose par khatam hoti to bot aakhir mein qadam beech
 * mein rok kar khara reh jata.
 *
 * ═══════════════════════════════════════════════════════════
 * LAPTOP UTHAYE HUE — AUR US SE BAAZU JHOOLTE NAHI
 * ═══════════════════════════════════════════════════════════
 * Jo shakhs laptop uthaye chal raha ho, us ke baazu nahi jhoolte — wo
 * usay thame rakhta hai, aur chal ka poora izhaar taangon aur jism se
 * hota hai. Isi liye yahan baazu tay hain.
 *
 * Aur ek chhoti cheez: laptop jism se KAM hilta hai. Insan jo cheez
 * uthata hai usay sthir rakhta hai, aur wohi us harkat ko asli banata
 * hai.
 */

const BOT_CSS = `
.hrbot {
  --walk: 2.4s;
  --step: .48s;
  position: relative;
  width: 100%;
  max-width: 340px;
  animation: hrbot-enter var(--walk) cubic-bezier(.25,.6,.35,1) forwards;
}

@keyframes hrbot-enter {
  from { transform: translateX(52%); opacity: 0; }
  to   { transform: translateX(0);   opacity: 1; }
}

/* ── Aage ko jhukav: chalte waqt, phir seedha ── */
.hrbot-lean {
  transform-origin: 130px 300px;
  animation: hrbot-lean var(--walk) ease-out forwards;
}
@keyframes hrbot-lean {
  0%   { rotate: 3.5deg; }
  70%  { rotate: 3.5deg; }
  100% { rotate: 0deg; }
}

/* ── Jism: upar neeche (DUGNI raftar) + daayen baayen jhukav ── */
.hrbot-body {
  transform-origin: 130px 300px;
  animation:
    hrbot-bob   var(--step) ease-in-out 5,
    hrbot-sway  var(--step) ease-in-out 5,
    hrbot-idle  3.8s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-bob {
  0%, 50%, 100% { translate: 0 0; }
  25%, 75%      { translate: 0 -5px; }
}
@keyframes hrbot-sway {
  0%, 100% { rotate: 0deg; }
  25%      { rotate: 1.6deg; }
  75%      { rotate: -1.6deg; }
}
@keyframes hrbot-idle {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -5px; }
}

/* ── Taangein: raan (kulha) ──
   0%/100% passing pose hai — dono taangein saath — to chal khare hone
   par khatam hoti hai. */
.hrbot-thigh-l { animation: hrbot-hip-a var(--step) ease-in-out 5 forwards; }
.hrbot-thigh-r { animation: hrbot-hip-b var(--step) ease-in-out 5 forwards; }
@keyframes hrbot-hip-a {
  0%, 100% { rotate: 0deg; }
  25%      { rotate: 17deg; }
  50%      { rotate: 0deg; }
  75%      { rotate: -15deg; }
}
@keyframes hrbot-hip-b {
  0%, 100% { rotate: 0deg; }
  25%      { rotate: -15deg; }
  50%      { rotate: 0deg; }
  75%      { rotate: 17deg; }
}

/* ── Ghutna: uthti hui taang murti hai, parti hui seedhi hoti hai ── */
.hrbot-shin-l { animation: hrbot-knee-a var(--step) ease-in-out 5 forwards; }
.hrbot-shin-r { animation: hrbot-knee-b var(--step) ease-in-out 5 forwards; }
@keyframes hrbot-knee-a {
  0%, 100% { rotate: -7deg; }
  25%      { rotate: -2deg; }
  50%      { rotate: -8deg; }
  75%      { rotate: -36deg; }
}
@keyframes hrbot-knee-b {
  0%, 100% { rotate: -7deg; }
  25%      { rotate: -36deg; }
  50%      { rotate: -8deg; }
  75%      { rotate: -2deg; }
}

/* ── Laptop jism se KAM hilta hai ── */
.hrbot-carry {
  animation:
    hrbot-carry var(--step) ease-in-out 5,
    hrbot-carry-idle 3.8s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-carry {
  0%, 50%, 100% { translate: 0 0; }
  25%, 75%      { translate: 0 1.6px; }
}
@keyframes hrbot-carry-idle {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 1.5px; }
}

/* ── Sar thora der se hilta hai ── */
.hrbot-head {
  transform-origin: 130px 132px;
  animation: hrbot-head var(--step) ease-in-out 5;
}
@keyframes hrbot-head {
  0%, 100% { rotate: 0deg; }
  30%      { rotate: -1.4deg; }
  80%      { rotate: 1.4deg; }
}

/* ── Palkein: ek dafa, phir foran halki si dobara ──
   Ek surat mein jhapakna machine jaisa lagta hai; do mein zinda. */
.hrbot-lids {
  transform-origin: 130px 86px;
  animation: hrbot-blink 5.5s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-blink {
  0%, 92%, 100% { scale: 1 0; }
  94%, 95%      { scale: 1 1; }
  96%           { scale: 1 0; }
  97%, 98%      { scale: 1 1; }
}

.hrbot-antenna { animation: hrbot-pulse 2.4s ease-in-out var(--walk) infinite; }
@keyframes hrbot-pulse {
  0%, 100% { opacity: .35; r: 5; }
  50%      { opacity: 1;   r: 6.5; }
}

/* ── Laptop screen ki lakeerein ── */
.hrbot-scan { animation: hrbot-scan 2.6s ease-in-out var(--walk) infinite; }
@keyframes hrbot-scan {
  0%, 100% { opacity: .25; }
  50%      { opacity: .95; }
}

/* ── Saya: qadam ke saath sikurta hai ── */
.hrbot-shadow {
  transform-origin: 130px 314px;
  animation:
    hrbot-shadow var(--step) ease-in-out 5,
    hrbot-shadow-idle 3.8s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-shadow {
  0%, 50%, 100% { scale: 1 1;   opacity: .30; }
  25%, 75%      { scale: .84 1; opacity: .17; }
}
@keyframes hrbot-shadow-idle {
  0%, 100% { scale: 1 1;   opacity: .30; }
  50%      { scale: .9 1;  opacity: .20; }
}

/* ⚠ Jo shakhs harkat band rakhta hai, us ke liye bot KHARA milta hai —
   ghayab nahi. Landing page ka mazmoon harkat par nahi tika hona
   chahiye. */
@media (prefers-reduced-motion: reduce) {
  .hrbot, .hrbot-lean, .hrbot-body, .hrbot-head, .hrbot-carry,
  .hrbot-thigh-l, .hrbot-thigh-r, .hrbot-shin-l, .hrbot-shin-r,
  .hrbot-lids, .hrbot-antenna, .hrbot-shadow, .hrbot-scan {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
    translate: none !important;
    rotate: none !important;
    scale: none !important;
  }
}
`;

export default function HrBot() {
  return (
    <div className="hrbot" aria-hidden="true">
      <style>{BOT_CSS}</style>

      <svg viewBox="0 0 260 330" className="w-full h-auto" role="img">
        <defs>
          <linearGradient id="hrbot-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2C333B" />
            <stop offset="100%" stopColor="#1A1F25" />
          </linearGradient>
          <linearGradient id="hrbot-visor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#062E22" />
            <stop offset="100%" stopColor="#03150F" />
          </linearGradient>
          <linearGradient id="hrbot-screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A3A2C" />
            <stop offset="100%" stopColor="#04180F" />
          </linearGradient>
          <filter id="hrbot-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse
          className="hrbot-shadow"
          cx="130" cy="314" rx="62" ry="9"
          fill="#05DC7F" opacity=".3"
        />

        <g className="hrbot-lean">
          <g className="hrbot-body">
            {/* ══════ Taangein — raan + pindli, ghutne par juri ══════ */}
            {/* Pindli raan ke ANDAR hai, to wo us ki gardish saath le kar
                chalti hai — bilkul waise jaise asli ghutna. */}
            <g className="hrbot-thigh-l" style={{ transformOrigin: "112px 234px" }}>
              <rect x="104" y="234" width="16" height="34" rx="8" fill="url(#hrbot-metal)" />
              <g className="hrbot-shin-l" style={{ transformOrigin: "112px 266px" }}>
                <rect x="105" y="266" width="14" height="30" rx="7" fill="#232A32" />
                <rect x="99" y="292" width="26" height="12" rx="6" fill="#0F1319" />
              </g>
            </g>

            <g className="hrbot-thigh-r" style={{ transformOrigin: "148px 234px" }}>
              <rect x="140" y="234" width="16" height="34" rx="8" fill="url(#hrbot-metal)" />
              <g className="hrbot-shin-r" style={{ transformOrigin: "148px 266px" }}>
                <rect x="141" y="266" width="14" height="30" rx="7" fill="#232A32" />
                <rect x="135" y="292" width="26" height="12" rx="6" fill="#0F1319" />
              </g>
            </g>

            {/* ══════ Dhar ══════ */}
            <rect x="84" y="142" width="92" height="96" rx="26" fill="url(#hrbot-metal)" />
            <rect
              x="84" y="142" width="92" height="96" rx="26"
              fill="none" stroke="#05DC7F" strokeOpacity=".22" strokeWidth="1.5"
            />
            <rect x="108" y="160" width="44" height="3" rx="1.5" fill="#05DC7F" opacity=".2" />
            <rect x="108" y="168" width="28" height="3" rx="1.5" fill="#05DC7F" opacity=".13" />

            {/* Gardan */}
            <rect x="120" y="128" width="20" height="18" rx="6" fill="#171C22" />

            {/* ══════ Baazu — TAY, kyunke laptop uthaya hua hai ══════ */}
            {/* Kandha se kohni tak neeche, phir kohni se haath tak andar.
                ⚠ Forearm ki lambai laptop ke KINARE tak hai, us ke beech
                tak nahi. Pehli koshish mein wo 36 lamba tha aur haath us
                ke DARMIYAN aa gaya tha — jo toota hua lagta hai, kyunke
                haath hamesha baazu ke SIREY par hota hai. */}
            <rect x="72" y="150" width="15" height="40" rx="7.5" fill="url(#hrbot-metal)" />
            <rect x="79" y="184" width="17" height="14" rx="7" fill="#232A32" />
            <rect x="173" y="150" width="15" height="40" rx="7.5" fill="url(#hrbot-metal)" />
            <rect x="164" y="184" width="17" height="14" rx="7" fill="#232A32" />

            {/* ══════ Laptop ══════ */}
            <g className="hrbot-carry">
              {/* Screen — peeche ki taraf jhuki hui */}
              <g transform="rotate(-14 130 176)">
                <rect x="95" y="146" width="70" height="46" rx="6" fill="#1A2027" />
                <rect
                  x="95" y="146" width="70" height="46" rx="6"
                  fill="none" stroke="#05DC7F" strokeOpacity=".38" strokeWidth="1.2"
                />
                <rect x="100" y="151" width="60" height="36" rx="3" fill="url(#hrbot-screen)" />
                <g className="hrbot-scan">
                  <rect x="106" y="158" width="34" height="2.6" rx="1.3" fill="#05DC7F" opacity=".85" />
                  <rect x="106" y="165" width="46" height="2.6" rx="1.3" fill="#05DC7F" opacity=".5" />
                  <rect x="106" y="172" width="26" height="2.6" rx="1.3" fill="#05DC7F" opacity=".35" />
                </g>
              </g>

              {/* Keyboard */}
              <rect x="92" y="192" width="76" height="9" rx="4" fill="#2C333B" />
              <rect
                x="92" y="192" width="76" height="9" rx="4"
                fill="none" stroke="#05DC7F" strokeOpacity=".25" strokeWidth="1"
              />

              {/* Haath — laptop ke donon kinaron par, forearm ke SIREY se
                  mile hue. Markaz 130 se ±36 par, jaisa baqi sab. */}
              <rect x="86" y="187" width="17" height="16" rx="7" fill="#171C22" />
              <rect x="157" y="187" width="17" height="16" rx="7" fill="#171C22" />
            </g>

            {/* ══════ Sar ══════ */}
            <g className="hrbot-head">
              <rect x="76" y="54" width="108" height="80" rx="30" fill="url(#hrbot-metal)" />
              <rect
                x="76" y="54" width="108" height="80" rx="30"
                fill="none" stroke="#05DC7F" strokeOpacity=".25" strokeWidth="1.5"
              />

              <rect x="90" y="72" width="80" height="44" rx="20" fill="url(#hrbot-visor)" />
              <rect
                x="90" y="72" width="80" height="44" rx="20"
                fill="none" stroke="#05DC7F" strokeOpacity=".3" strokeWidth="1"
              />

              <g filter="url(#hrbot-glow)">
                <circle cx="113" cy="92" r="7" fill="#05DC7F" />
                <circle cx="147" cy="92" r="7" fill="#05DC7F" />
              </g>
              <g className="hrbot-lids">
                <rect x="104" y="82" width="18" height="12" rx="4" fill="#062E22" />
                <rect x="138" y="82" width="18" height="12" rx="4" fill="#062E22" />
              </g>

              <path
                d="M118 106 Q130 112 142 106"
                fill="none" stroke="#05DC7F" strokeOpacity=".55"
                strokeWidth="2" strokeLinecap="round"
              />

              <rect x="127" y="36" width="6" height="20" rx="3" fill="#232A32" />
              <circle
                className="hrbot-antenna"
                cx="130" cy="34" r="5.5"
                fill="#05DC7F" filter="url(#hrbot-glow)"
              />

              <rect x="68" y="82" width="10" height="24" rx="5" fill="#232A32" />
              <rect x="182" y="82" width="10" height="24" rx="5" fill="#232A32" />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
