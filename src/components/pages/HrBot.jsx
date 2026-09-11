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
 * ⚠ PEHLI CHAAL "TAIRTI HUI" KYUN LAGTI THI — ASAL WAJAH
 * ═══════════════════════════════════════════════════════════
 * Taangein theek hil rahi thin. Masla yeh tha ke taangon ki raftar aur
 * jism ke safar ka aapas mein koi taalluq hi nahi tha:
 *
 *     taangein  →  10 qadam    (.48s × 5, har cycle mein 2 qadam)
 *     safar     →  52% (~177px)
 *
 * Ek qadam ka asli fasla geometry se nikalta hai, marzi se nahi:
 *
 *     qadam = 2 × taang ki lambai × sin(kulhe ka zaawiya)
 *           = 2 × 70 × sin(17°)  ≈  41 units  ≈  54px
 *
 * To 10 qadam ko ~540px chahiye thay, mile 177px. Yani bot apni taangon
 * se TEEN GUNA aahista chal raha tha — aur paon zameen par ragarte
 * thay. Yehi wo "ajeeb" cheez hai jo aankh foran pakar leti hai chahe
 * naam na de sake. Animation mein isay moonwalk kehte hain.
 *
 * Hal: qadam aur safar ko EK HI timeline par baandh do. Ab dono ke
 * moray (0 · 22 · 44 · 66 · 86 · 100%) bilkul ek hain, to har qadam par
 * jism theek utna hi aage jata hai jitna paon le ja raha hai.
 *
 * ⚠ Aur timing `linear` hai. Qadam ke DARMIYAN jism ki raftar taqreeban
 * barabar rehti hai; yahan ease-in-out lagana wohi ragar wapas le aata
 * hai jo abhi door ki hai.
 *
 * Qadam aakhir mein CHHOTE hote jate hain (17° → 16° → 14° → 9°), aur
 * safar ke tukre bhi usi hisab se. Insan darwaze par pohanch kar ek dam
 * nahi rukta — wo aakhri do qadam chhote karta hai.
 *
 * ⚠ DOOSRI GHALTI: jism ULTA uchhal raha tha
 * Pehle jism contact par UPER tha aur passing par NEECHE. Asli chal
 * mein bilkul ulta hai — jab dono taangein phaili hoti hain (contact)
 * kulha sab se NEECHE hota hai, aur jab ek taang seedhi neeche sahara
 * de rahi ho (passing) tab sab se UPER. Ulta hone se chal "ussalti"
 * hui lagti hai.
 *
 * ═══════════════════════════════════════════════════════════
 * CHAAL KE CHAAR HISSE
 * ═══════════════════════════════════════════════════════════
 *   1. GHUTNA — sab se bara farq. Uthne wali taang ka ghutna murta hai,
 *      parne wali ka seedha. Is ke liye taang do hisson mein hai aur
 *      pindli raan ke ANDAR hai, to wo us ki gardish saath le kar
 *      chalti hai — bilkul asli ghutne ki tarah.
 *   2. TAKHNA — paon edi par girta hai (panje uper), phir flat, phir
 *      panje se dhakka (edi uper). Is ke baghair paon takhta lagta hai.
 *   3. UPAR NEECHE, DUGNI raftar par — har QADAM par, har stride par
 *      nahi.
 *   4. DAAYEN BAAYEN JHUKAV — wazan jis taang par ho, jism us taraf.
 *
 * ⚠ Timeline ka 0% aur 100% dono "passing pose" hain — jahan taangein
 * saath hoti hain. Is se chal apne aap KHARE hone par khatam hoti hai.
 * Agar contact pose par khatam hoti to bot aakhir mein qadam beech mein
 * rok kar khara reh jata.
 *
 * ═══════════════════════════════════════════════════════════
 * LAPTOP — TEEN SATAH, EK HI NUQTA-E-NAZAR
 * ═══════════════════════════════════════════════════════════
 * Pehle laptop do seedhe rects thay, to wo chipka hua kaghaz lagta tha.
 * Ab teen satah hain jo ek hi camera se dekhi gayi hain — thora uper
 * se:
 *
 *     screen    trapezium, UPER ka kinara chhota (peeche jhuka hua)
 *     keyboard  trapezium, SAAMNE ka kinara bara (hamare qareeb)
 *     motai     saamne ka patla kinara — isi se wazan aata hai
 *
 * ⚠ Aur wo cheez jo "pakra hua" ehsaas deti hai: UNGLIYAN keyboard ki
 * satah ke UPER hain, hatheli us ke peeche. Koi cheez sirf tab pakri
 * hui lagti hai jab us ka koi hissa cheez ke SAAMNE ho. Sirf kinare par
 * haath rakh dene se wo cheez rakhi hui lagti hai, pakri hui nahi.
 *
 * Jo shakhs laptop uthaye chal raha ho us ke baazu nahi jhoolte — wo
 * usay thame rakhta hai, aur chal ka izhaar taangon aur jism se hota
 * hai. Isi liye baazu tay hain.
 *
 * Aur laptop jism se KAM hilta hai: `hrbot-carry` jism ke uchhal ke
 * KHILAF chalta hai, to bacha hua ~1.5px reh jata hai. Insan jo cheez
 * uthata hai usay sthir rakhta hai — aur wohi is harkat ko asli banata
 * hai.
 */

const BOT_CSS = `
.hrbot {
  --walk: 2.9s;
  position: relative;
  width: 100%;
  max-width: 340px;
  /* ⚠ Bot container ke BAHAR se chal kar aata hai. Is ke baghair safha
     daayen taraf scroll hone lagta hai. */
  overflow: hidden;
}

/* ══════════════════════════════════════════════════════════
   Safar — qadam ke SAATH bandha hua
   Moray (22 · 44 · 66 · 86%) wohi hain jo kulhe ki keyframes ke hain,
   aur har tukre ka fasla usi qadam ke zaawiye se nikla hai. Isi liye
   paon ragarte nahi.
   ══════════════════════════════════════════════════════════ */
.hrbot-walk {
  animation: hrbot-walk var(--walk) linear forwards;
}
@keyframes hrbot-walk {
  0%   { transform: translateX(67%);   opacity: 0; }
  7%   { opacity: 1; }
  22%  { transform: translateX(51.3%); }
  44%  { transform: translateX(36.4%); }
  66%  { transform: translateX(21.5%); }
  86%  { transform: translateX(8.4%);  }
  100% { transform: translateX(0);     opacity: 1; }
}

/* ── Aage ko jhukav: chalte waqt, phir seedha ── */
.hrbot-lean {
  transform-origin: 130px 300px;
  animation: hrbot-lean var(--walk) ease-out forwards;
}
@keyframes hrbot-lean {
  0%   { rotate: 4deg; }
  70%  { rotate: 3.4deg; }
  100% { rotate: 0deg; }
}

/* ── Jism: uper neeche + daayen baayen jhukav ──
   ⚠ Passing par UPER, contact par NEECHE. */
.hrbot-body {
  transform-origin: 130px 300px;
  animation:
    hrbot-bob  var(--walk) linear,
    hrbot-sway var(--walk) ease-in-out,
    hrbot-idle 3.8s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-bob {
  0%   { translate: 0 -4px; }
  11%  { translate: 0 0; }
  22%  { translate: 0 -4px; }
  33%  { translate: 0 0; }
  44%  { translate: 0 -4px; }
  55%  { translate: 0 0; }
  66%  { translate: 0 -4px; }
  77%  { translate: 0 0; }
  86%  { translate: 0 -3px; }
  93%  { translate: 0 -1px; }
  100% { translate: 0 0; }
}
@keyframes hrbot-sway {
  0%   { rotate: 0deg; }
  22%  { rotate: -1.5deg; }
  44%  { rotate: 1.5deg; }
  66%  { rotate: -1.5deg; }
  86%  { rotate: 1.1deg; }
  100% { rotate: 0deg; }
}
@keyframes hrbot-idle {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 -5px; }
}

/* ── Kulha ── */
.hrbot-thigh-l { animation: hrbot-hip-a var(--walk) ease-in-out forwards; }
.hrbot-thigh-r { animation: hrbot-hip-b var(--walk) ease-in-out forwards; }
@keyframes hrbot-hip-a {
  0%   { rotate: 0deg; }    11%  { rotate: 17deg; }   22%  { rotate: 0deg; }
  33%  { rotate: -16deg; }  44%  { rotate: 0deg; }    55%  { rotate: 16deg; }
  66%  { rotate: 0deg; }    77%  { rotate: -14deg; }  86%  { rotate: 0deg; }
  93%  { rotate: 9deg; }    100% { rotate: 0deg; }
}
@keyframes hrbot-hip-b {
  0%   { rotate: 0deg; }    11%  { rotate: -16deg; }  22%  { rotate: 0deg; }
  33%  { rotate: 17deg; }   44%  { rotate: 0deg; }    55%  { rotate: -16deg; }
  66%  { rotate: 0deg; }    77%  { rotate: 14deg; }   86%  { rotate: 0deg; }
  93%  { rotate: -9deg; }   100% { rotate: 0deg; }
}

/* ── Ghutna: sab se ziyada mura hua toe-off par, yani jab kulha sab se
   PEECHE ho ── */
.hrbot-shin-l { animation: hrbot-knee-a var(--walk) ease-in-out forwards; }
.hrbot-shin-r { animation: hrbot-knee-b var(--walk) ease-in-out forwards; }
@keyframes hrbot-knee-a {
  0%   { rotate: -7deg; }   11%  { rotate: -2deg; }   22%  { rotate: -8deg; }
  33%  { rotate: -36deg; }  44%  { rotate: -7deg; }   55%  { rotate: -2deg; }
  66%  { rotate: -8deg; }   77%  { rotate: -34deg; }  86%  { rotate: -7deg; }
  93%  { rotate: -2deg; }   100% { rotate: -6deg; }
}
@keyframes hrbot-knee-b {
  0%   { rotate: -8deg; }   11%  { rotate: -36deg; }  22%  { rotate: -7deg; }
  33%  { rotate: -2deg; }   44%  { rotate: -8deg; }   55%  { rotate: -36deg; }
  66%  { rotate: -7deg; }   77%  { rotate: -2deg; }   86%  { rotate: -8deg; }
  93%  { rotate: -14deg; }  100% { rotate: -6deg; }
}

/* ── Takhna: edi par girna, panje se dhakka ── */
.hrbot-foot-l { animation: hrbot-foot-a var(--walk) ease-in-out forwards; }
.hrbot-foot-r { animation: hrbot-foot-b var(--walk) ease-in-out forwards; }
@keyframes hrbot-foot-a {
  0%   { rotate: 0deg; }    11%  { rotate: -6deg; }   22%  { rotate: 0deg; }
  33%  { rotate: 14deg; }   44%  { rotate: 0deg; }    55%  { rotate: -6deg; }
  66%  { rotate: 0deg; }    77%  { rotate: 13deg; }   86%  { rotate: 0deg; }
  93%  { rotate: -4deg; }   100% { rotate: 0deg; }
}
@keyframes hrbot-foot-b {
  0%   { rotate: 0deg; }    11%  { rotate: 13deg; }   22%  { rotate: 0deg; }
  33%  { rotate: -6deg; }   44%  { rotate: 0deg; }    55%  { rotate: 13deg; }
  66%  { rotate: 0deg; }    77%  { rotate: -6deg; }   86%  { rotate: 0deg; }
  93%  { rotate: 6deg; }    100% { rotate: 0deg; }
}

/* ── Laptop jism ke KHILAF chalta hai — bacha hua ~1.5px ── */
.hrbot-carry {
  animation:
    hrbot-carry var(--walk) linear,
    hrbot-carry-idle 3.8s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-carry {
  0%   { translate: 0 2.5px; }  11%  { translate: 0 0; }
  22%  { translate: 0 2.5px; }  33%  { translate: 0 0; }
  44%  { translate: 0 2.5px; }  55%  { translate: 0 0; }
  66%  { translate: 0 2.5px; }  77%  { translate: 0 0; }
  86%  { translate: 0 2px; }    93%  { translate: 0 .5px; }
  100% { translate: 0 0; }
}
@keyframes hrbot-carry-idle {
  0%, 100% { translate: 0 0; }
  50%      { translate: 0 3.5px; }
}

/* ── Sar thora der se hilta hai ── */
.hrbot-head {
  transform-origin: 130px 132px;
  animation: hrbot-head var(--walk) ease-in-out;
}
@keyframes hrbot-head {
  0%   { rotate: 0deg; }     16%  { rotate: -1.3deg; }
  38%  { rotate: 1.3deg; }   60%  { rotate: -1.3deg; }
  82%  { rotate: 1.1deg; }   100% { rotate: 0deg; }
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

/* ── Saya: contact par bara (jism neeche), passing par chhota ── */
.hrbot-shadow {
  transform-origin: 130px 314px;
  animation:
    hrbot-shadow var(--walk) linear,
    hrbot-shadow-idle 3.8s ease-in-out var(--walk) infinite;
}
@keyframes hrbot-shadow {
  0%   { scale: .86 1; opacity: .17; }  11%  { scale: 1 1;   opacity: .30; }
  22%  { scale: .86 1; opacity: .17; }  33%  { scale: 1 1;   opacity: .30; }
  44%  { scale: .86 1; opacity: .17; }  55%  { scale: 1 1;   opacity: .30; }
  66%  { scale: .86 1; opacity: .17; }  77%  { scale: 1 1;   opacity: .30; }
  86%  { scale: .9 1;  opacity: .20; }  93%  { scale: .97 1; opacity: .28; }
  100% { scale: 1 1;   opacity: .30; }
}
@keyframes hrbot-shadow-idle {
  0%, 100% { scale: 1 1;  opacity: .30; }
  50%      { scale: .9 1; opacity: .20; }
}

/* ⚠ Jo shakhs harkat band rakhta hai, us ke liye bot KHARA milta hai —
   ghayab nahi. Landing page ka mazmoon harkat par nahi tika hona
   chahiye. */
@media (prefers-reduced-motion: reduce) {
  .hrbot-walk, .hrbot-lean, .hrbot-body, .hrbot-head, .hrbot-carry,
  .hrbot-thigh-l, .hrbot-thigh-r, .hrbot-shin-l, .hrbot-shin-r,
  .hrbot-foot-l, .hrbot-foot-r,
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

      <div className="hrbot-walk">
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
            {/* Keyboard ki satah — roshni uper se, to peeche halki aur
                saamne gehri. Isi se wo "letti hui" lagti hai. */}
            <linearGradient id="hrbot-deck" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#39424C" />
              <stop offset="100%" stopColor="#252C34" />
            </linearGradient>
            <linearGradient id="hrbot-lidback" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#232A32" />
              <stop offset="55%" stopColor="#1A2027" />
              <stop offset="100%" stopColor="#141920" />
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
              {/* ══════ Taangein — raan + pindli + paon ══════ */}
              {/* Pindli raan ke ANDAR hai aur paon pindli ke andar, to
                  har hissa uper wale ki gardish saath le kar chalta hai
                  — bilkul asli ghutne aur takhne ki tarah. */}
              <g className="hrbot-thigh-l" style={{ transformOrigin: "112px 234px" }}>
                <rect x="104" y="234" width="16" height="34" rx="8" fill="url(#hrbot-metal)" />
                <g className="hrbot-shin-l" style={{ transformOrigin: "112px 266px" }}>
                  <rect x="105" y="266" width="14" height="30" rx="7" fill="#232A32" />
                  <g className="hrbot-foot-l" style={{ transformOrigin: "112px 294px" }}>
                    <rect x="99" y="292" width="26" height="12" rx="6" fill="#0F1319" />
                  </g>
                </g>
              </g>

              <g className="hrbot-thigh-r" style={{ transformOrigin: "148px 234px" }}>
                <rect x="140" y="234" width="16" height="34" rx="8" fill="url(#hrbot-metal)" />
                <g className="hrbot-shin-r" style={{ transformOrigin: "148px 266px" }}>
                  <rect x="141" y="266" width="14" height="30" rx="7" fill="#232A32" />
                  <g className="hrbot-foot-r" style={{ transformOrigin: "148px 294px" }}>
                    <rect x="135" y="292" width="26" height="12" rx="6" fill="#0F1319" />
                  </g>
                </g>
              </g>

              {/* ══════ Dhar ══════ */}
              <rect x="84" y="142" width="92" height="96" rx="26" fill="url(#hrbot-metal)" />
              <rect
                x="84" y="142" width="92" height="96" rx="26"
                fill="none" stroke="#05DC7F" strokeOpacity=".22" strokeWidth="1.5"
              />
              {/* Sirf ek lakeer — baqi seena laptop ke peeche hai */}
              <rect x="110" y="149" width="40" height="3" rx="1.5" fill="#05DC7F" opacity=".18" />

              {/* Gardan */}
              <rect x="120" y="128" width="20" height="18" rx="6" fill="#171C22" />

              {/* ══════ Baazu — TAY, kyunke laptop uthaya hua hai ══════ */}
              {/* Kandhe se kohni neeche-bahar, kohni se haath uper-andar.
                  ⚠ Forearm ka SIRA theek wahan hai jahan haath hai
                  (98,210) — haath hamesha baazu ke sirey par hota hai,
                  us ke darmiyan nahi. */}
              <path d="M88 158 L77 198" stroke="url(#hrbot-metal)" strokeWidth="15"
                strokeLinecap="round" fill="none" />
              <path d="M77 198 L98 210" stroke="#252C34" strokeWidth="13"
                strokeLinecap="round" fill="none" />
              <path d="M172 158 L183 198" stroke="url(#hrbot-metal)" strokeWidth="15"
                strokeLinecap="round" fill="none" />
              <path d="M183 198 L162 210" stroke="#252C34" strokeWidth="13"
                strokeLinecap="round" fill="none" />

              {/* ══════ Laptop ══════ */}
              <g className="hrbot-carry">
                {/* Hatheliyan — laptop ke PEECHE, kinaron ko sambhale hue */}
                <rect x="88" y="201" width="19" height="17" rx="8" fill="#171C22"
                  transform="rotate(-9 97.5 209.5)" />
                <rect x="153" y="201" width="19" height="17" rx="8" fill="#171C22"
                  transform="rotate(9 162.5 209.5)" />

                {/* Screen — uper ka kinara chhota, yani peeche jhuka hua */}
                <path d="M104 158 L156 158 L159 204 L101 204 Z" fill="url(#hrbot-lidback)" />
                <path d="M104 158 L156 158 L159 204 L101 204 Z"
                  fill="none" stroke="#05DC7F" strokeOpacity=".38" strokeWidth="1.2" />
                <path d="M109 163 L151 163 L153 199 L107 199 Z" fill="url(#hrbot-screen)" />
                <g className="hrbot-scan">
                  <rect x="113" y="169" width="30" height="2.6" rx="1.3" fill="#05DC7F" opacity=".85" />
                  <rect x="113" y="176" width="40" height="2.6" rx="1.3" fill="#05DC7F" opacity=".5" />
                  <rect x="113" y="183" width="22" height="2.6" rx="1.3" fill="#05DC7F" opacity=".35" />
                </g>

                {/* Keyboard ki satah — SAAMNE ka kinara bara, yani hamare
                    qareeb. Yehi ek shakal poori cheez ko letta hua dikha
                    deti hai. */}
                <path d="M101 204 L159 204 L168 216 L92 216 Z" fill="url(#hrbot-deck)" />
                <path d="M101 204 L159 204 L168 216 L92 216 Z"
                  fill="none" stroke="#05DC7F" strokeOpacity=".22" strokeWidth="1" />
                {/* Keys aur trackpad — usi nuqta-e-nazar mein */}
                <path d="M106 206 L154 206 L158 211 L102 211 Z" fill="#171C22" opacity=".75" />
                <path d="M120 212 L140 212 L142 214.6 L118 214.6 Z" fill="#171C22" opacity=".6" />

                {/* Motai — saamne ka patla kinara. Is ke baghair laptop
                    kaghaz lagta hai. */}
                <path d="M92 216 L168 216 L167 221 L93 221 Z" fill="#12171D" />
                <path d="M92 216 L168 216" stroke="#05DC7F" strokeOpacity=".18" strokeWidth="1" />

                {/* ⚠ Ungliyan — keyboard ki satah ke UPER. Yehi wo cheez
                    hai jo "pakra hua" aur "rakha hua" mein farq karti
                    hai: kisi hissay ka cheez ke SAAMNE hona. */}
                <g fill="#20272F">
                  <rect x="97" y="203" width="3.8" height="10" rx="1.9"
                    transform="rotate(-16 98.9 208)" />
                  <rect x="101.8" y="204" width="3.8" height="10" rx="1.9"
                    transform="rotate(-13 103.7 209)" />
                  <rect x="106.6" y="205" width="3.8" height="9" rx="1.9"
                    transform="rotate(-10 108.5 209.5)" />
                  <rect x="159.2" y="203" width="3.8" height="10" rx="1.9"
                    transform="rotate(16 161.1 208)" />
                  <rect x="154.4" y="204" width="3.8" height="10" rx="1.9"
                    transform="rotate(13 156.3 209)" />
                  <rect x="149.6" y="205" width="3.8" height="9" rx="1.9"
                    transform="rotate(10 151.5 209.5)" />
                </g>
                {/* Angoothe — saamne ki motai par, neeche se sahara */}
                <rect x="99" y="216" width="12" height="5" rx="2.5" fill="#20272F" />
                <rect x="149" y="216" width="12" height="5" rx="2.5" fill="#20272F" />
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
    </div>
  );
}
