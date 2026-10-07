// ══════════════════════════════════════════════
// Backend ka address — EK jagah
// ══════════════════════════════════════════════
// Pehle `http://127.0.0.1:8000` 32 files mein 76 jagah likha tha. Deploy
// ke baad har user ka browser backend APNE hi computer par dhoondta, aur
// phone se kholne par phone khud ko — kuch na chalta.
//
// Tarteeb:
//   1. VITE_API_URL (Frontend/.env, build ke waqt) — deploy par yehi
//   2. warna: jis address se safha khula, usi ka port 8000
//        laptop par  http://localhost:5173     -> http://127.0.0.1:8000
//        phone se    http://192.168.1.5:5173   -> http://192.168.1.5:8000
//
// ⚠ "localhost" ko 127.0.0.1 kyun: uvicorn 127.0.0.1 par sunta hai, aur
// Windows par "localhost" pehle ::1 (IPv6) try karta hai — har request
// pehle atakti. Pehle bhi yahi 127.0.0.1 tha; laptop par kuch nahi badla.

function guessFromPage() {
  const { protocol, hostname } = window.location;
  if (!hostname || hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://127.0.0.1:8000";
  }
  return `${protocol}//${hostname}:8000`;
}

export const API_URL = (import.meta.env.VITE_API_URL || guessFromPage()).replace(
  /\/+$/,
  "",
);
