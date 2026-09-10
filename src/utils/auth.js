/**
 * Logout — ek jagah, teenon dashboards ke liye
 * ────────────────────────────────────────────
 *     import { logout } from "../../utils/auth";
 *     <button onClick={logout}>…</button>
 *
 * Yeh teen alag jagah teen alag tarah se likha hua tha, aur teenon mein
 * se do toote hue thay.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠ 1. EMPLOYEE KA LOGOUT EK AISE SAFHE PAR BHEJTA THA JO HAI HI NAHI
 * ═══════════════════════════════════════════════════════════
 *     window.location.href = "/login";
 *
 * Us waqt `App.jsx` mein login `/` par tha — `/login` naam ka koi route
 * nahi, aur na koi catch-all. To browser ek khali safhe par pohanch jata
 * tha.
 *
 * (Baad mein home page bana aur login WAQAI `/login` par chala gaya. Yeh
 * bug phir bhi likha ja raha hai, kyunke us ka sabaq route ke naam ka
 * nahi tha: ek raasta jo mojood na ho, wo chup-chaap khali safha deta
 * hai — na error, na koi nishan.)
 *
 * Aur us ke peeche ka kaam THEEK ho chuka hota: `localStorage.clear()`
 * chal chuka hota aur banda waqai logout ho chuka hota. Sirf dikhta yeh
 * tha ke "logout button kaam nahi karta" — halanke wo kaam kar chuka
 * hota aur screen khali reh jati.
 *
 * ═══════════════════════════════════════════════════════════
 * ⚠ 2. CEO AUR SUPERADMIN KA LOGOUT ADHOORA THA
 * ═══════════════════════════════════════════════════════════
 * Login AATH cheezein rakhta hai:
 *
 *     token · role · full_name · user_id
 *     department · company_name · company_id
 *
 * Aur logout sirf TEEN hataata tha:
 *
 *     localStorage.removeItem("token");
 *     localStorage.removeItem("role");
 *     localStorage.removeItem("full_name");
 *
 * Yani logout ke baad bhi `company_id`, `company_name`, `department` aur
 * `user_id` browser mein pare rehte thay — us shakhs ki shanakht jo ja
 * chuka hai.
 *
 * `Login.jsx` khud `clear()` karta hai (wo masla wahan pakra ja chuka
 * hai), to agla login inhein le nahi urrta. Magar logout ka apna kaam
 * yehi hai: jo cheez us shakhs ki thi wo peeche na rahe. "Agla login
 * saaf kar dega" logout ka udhaar hai, us ka kaam nahi.
 *
 * ═══════════════════════════════════════════════════════════
 * KYUN `clear()`, AUR KYUN POORA RELOAD
 * ═══════════════════════════════════════════════════════════
 * `clear()` — kyunke naam ginwane wala tareeqa har us din tootta hai
 * jis din login ek nayi cheez rakhna shuru karta hai aur yahan likhna
 * bhool jata hai. Wo pehle bhi ho chuka hai (chaar keys reh gayi thin).
 *
 * Aur `window.location.replace` — `navigate()` se nahi:
 *
 *   · `navigate()` SPA ko zinda rakhta hai, aur us waqt jo component
 *     memory mein data uthaye baithe hain wo waisay hi rehte hain.
 *     Logout ka matlab yeh hai ke kuch peeche na rahe — na storage
 *     mein, na memory mein. Poora reload us ki zamanat deta hai.
 *   · `replace` (`href` nahi) — taake browser ka Back button us safhe
 *     par wapas na le jaye jise abhi chhora gaya hai. Wahan
 *     `ProtectedRoute` waise bhi rok leta, magar ek lamhe ke liye purana
 *     safha dikh jana khud ek bad-soorti hai.
 */

const API = "http://127.0.0.1:8000";

export function logout() {
  // ══════════════════════════════════════════════
  // Backend ko batao — us ke baghair token 24 GHANTE zinda rehta hai
  // ══════════════════════════════════════════════
  // Storage saaf karne se token khatam nahi hota: JWT wapas nahi liya
  // ja sakta, wo apni `exp` tak chalta hai. Yani "logout" sirf is
  // browser ki bhool thi — jis ke paas wo token pehle se ho (devtools
  // se copy, ya shared machine par saaf karne se pehle uth gaya ho),
  // us ke liye kuch badalta hi nahi tha.
  //
  // `POST /auth/logout` `users.token_version` barha deta hai, aur us se
  // us shakhs ke SAARE token usi lamhe mar jate hain — har device par.
  const token = (() => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  })();

  if (token) {
    // ⚠ `keepalive` — kyunke agli line poora safha badal deti hai.
    // Bina us ke browser is request ko beech mein hi kaat deta hai, aur
    // token zinda reh jata: logout ka sab se zaroori hissa theek us
    // waqt gir jata jab wo bheja ja raha hota.
    //
    // Aur jawab ka intezar NAHI kiya jata. Server band ho, network na
    // ho — banda phir bhi bahar nikalna chahiye. Server ka hissa reh
    // jaye to token apni `exp` par khud marta hai; browser ka hissa reh
    // jaye to wo screen par bana rehta hai, aur yeh us se bura hai.
    try {
      fetch(`${API}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Kuch bhi ho — neeche wala hissa phir bhi chalta hai.
    }
  }

  try {
    localStorage.clear();
  } catch {
    // Private window ya storage band — phir bhi bahar to nikalna hai.
  }
  // ⚠ `/login`, `/` nahi — aur yeh badla hai.
  // Pehle login `/` par tha. Jab home page bana to login `/login` par
  // chala gaya, aur `/` landing ban gaya. Logout ke baad landing par
  // pohanchne ka matlab yeh hota ke banda apni screen se nikal to jata,
  // magar usay yeh dikhta hi na ke ab wo bahar hai.
  //
  // Yeh wohi ek line hai jis ke bare mein pehle likha gaya tha ke agar
  // login ka raasta badle to SIRF yeh badlegi — teen jagah nahi.
  window.location.replace("/login");
}
