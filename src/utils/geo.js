// ══════════════════════════════════════════
// GPS Acquisition — 3 stage fallback
// ══════════════════════════════════════════
// Kabhi kabhi location fetch nahi hoti thi aur attendance table mein
// "No GPS" aa jata tha. Teen wajahain thin:
//
//   1. watchPosition ka error callback aate hi hum haar maan lete the.
//      Windows desktop pe GPS chip nahi hota, to enableHighAccuracy:true
//      pehle POSITION_UNAVAILABLE deta hai — halanke WiFi se location
//      mil sakti thi. Ab transient error pe hum sunte rehte hain.
//   2. maximumAge:0 tha — 30 second purani reading bhi reject ho rahi thi,
//      halanke attendance ke liye wo bilkul kaafi hai.
//   3. High accuracy fail ho to koi network-based fallback nahi tha.
//
// Ab: high accuracy → network (WiFi/IP) → cached.
// Permission DENIED pe hi turant rukte hain (retry ka faida nahi).

export const PERMISSION_DENIED = 1;
export const POSITION_UNAVAILABLE = 2;
export const TIMEOUT = 3;
export const UNSUPPORTED = 0;

// Itni purani reading abhi bhi qabool hai (office mein banda hila nahi hota)
export const LAST_GOOD_MAX_AGE_MS = 3 * 60 * 1000;

export const geoErrorMessage = (code) =>
  ({
    [UNSUPPORTED]: "Is browser mein location support nahi hai",
    [PERMISSION_DENIED]:
      "Location permission block hai — address bar ke lock icon se 'Allow' karein",
    [POSITION_UNAVAILABLE]:
      "Location service band hai — Windows Settings → Privacy → Location on karein",
    [TIMEOUT]: "Location lene mein waqt lag gaya — dobara try karein",
  })[code] || "GPS location nahi mili";

const toReading = (pos, source) => ({
  lat: pos.coords.latitude,
  lng: pos.coords.longitude,
  accuracy: pos.coords.accuracy,
  at: Date.now(),
  source,
});

// ──── Stage 1: kuch seconds sun kar sabse achhi reading ────
export function watchBestPosition({ timeoutMs = 10000, targetAccuracy = 30 } = {}) {
  return new Promise((resolve) => {
    let best = null;
    let lastError = null;
    let settled = false;
    let watchId = null;
    let timer = null;

    const finish = () => {
      if (settled) return;
      settled = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      resolve(best || { error: lastError ?? TIMEOUT });
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading = toReading(pos, "gps");
        if (!best || reading.accuracy < best.accuracy) best = reading;
        // ──── Itni achhi reading mil gayi ke aur wait ki zarurat nahi ────
        if (reading.accuracy <= targetAccuracy) finish();
      },
      (err) => {
        lastError = err.code;
        // ──── Permission deny = retry bekaar. Baqi errors transient ho
        //      sakte hain — deadline tak sunte raho ────
        if (err.code === PERMISSION_DENIED) finish();
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: timeoutMs },
    );

    timer = setTimeout(finish, timeoutMs);
  });
}

// ──── Stage 2/3: ek single try (network ya cached) ────
export function getPositionOnce({
  highAccuracy = false,
  timeoutMs = 8000,
  maximumAge = 60000,
} = {}) {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(toReading(pos, maximumAge > 60000 ? "cached" : "network")),
      (err) => resolve({ error: err.code }),
      { enableHighAccuracy: highAccuracy, timeout: timeoutMs, maximumAge },
    );
  });
}

// ──── Poori strategy ────
export async function acquireLocation(options = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { error: UNSUPPORTED };
  }

  // Secure context ke baghair geolocation kaam hi nahi karti
  // (localhost theek hai, LAN IP par nahi)
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return { error: POSITION_UNAVAILABLE };
  }

  const gps = await watchBestPosition(options);
  if (!gps.error) return gps;

  // ──── Permission deny hai to aage koshish bekaar ────
  if (gps.error === PERMISSION_DENIED) return gps;

  // ──── WiFi/IP based — desktop pe aksar yahi chalti hai ────
  const network = await getPositionOnce({
    highAccuracy: false,
    timeoutMs: 8000,
    maximumAge: 60000,
  });
  if (!network.error) return network;

  // ──── Aakhri koshish: browser ke paas jo bhi cached hai ────
  return getPositionOnce({
    highAccuracy: false,
    timeoutMs: 5000,
    maximumAge: 300000,
  });
}

// ──── Haversine — office se distance meters mein ────
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
