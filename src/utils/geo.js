// ══════════════════════════════════════════
// GPS Acquisition — 3 stage fallback
// ══════════════════════════════════════════
// Sometimes the location simply would not come through and the attendance
// table showed "No GPS". There were three reasons:
//
//   1. We gave up the moment watchPosition fired its error callback.
//      A Windows desktop has no GPS chip, so enableHighAccuracy:true
//      returns POSITION_UNAVAILABLE first — even though WiFi could have
//      supplied a location. We now keep listening through transient errors.
//   2. maximumAge:0 — even a 30-second-old reading was rejected, though
//      that is perfectly good enough for attendance.
//   3. There was no network-based fallback when high accuracy failed.
//
// Ab: high accuracy → network (WiFi/IP) → cached.
// We stop immediately only on permission DENIED (a retry gains nothing).

export const PERMISSION_DENIED = 1;
export const POSITION_UNAVAILABLE = 2;
export const TIMEOUT = 3;
export const UNSUPPORTED = 0;

// A reading this old is still acceptable (people barely move in an office)
export const LAST_GOOD_MAX_AGE_MS = 3 * 60 * 1000;

export const geoErrorMessage = (code) =>
  ({
    [UNSUPPORTED]: "This browser does not support location",
    [PERMISSION_DENIED]:
      "Location permission is blocked — allow it from the lock icon in the address bar",
    [POSITION_UNAVAILABLE]:
      "Location services are off — turn them on in Windows Settings → Privacy → Location",
    [TIMEOUT]: "Getting your location took too long — please try again",
  })[code] || "No GPS location was available";

const toReading = (pos, source) => ({
  lat: pos.coords.latitude,
  lng: pos.coords.longitude,
  accuracy: pos.coords.accuracy,
  at: Date.now(),
  source,
});

// ──── Stage 1: listen for a few seconds and take the best reading ────
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
        // ──── Good enough that there is no point waiting further ────
        if (reading.accuracy <= targetAccuracy) finish();
      },
      (err) => {
        lastError = err.code;
        // ──── Permission denied = a retry is pointless. Other errors may
        //      may still arrive — keep listening until the deadline ────
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

// ──── The full strategy ────
export async function acquireLocation(options = {}) {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { error: UNSUPPORTED };
  }

  // Geolocation does not work at all without a secure context
  // (localhost is fine, a LAN IP is not)
  if (typeof window !== "undefined" && window.isSecureContext === false) {
    return { error: POSITION_UNAVAILABLE };
  }

  const gps = await watchBestPosition(options);
  if (!gps.error) return gps;

  // ──── With permission denied there is no point trying further ────
  if (gps.error === PERMISSION_DENIED) return gps;

  // ──── WiFi/IP based — this is usually what works on a desktop ────
  const network = await getPositionOnce({
    highAccuracy: false,
    timeoutMs: 8000,
    maximumAge: 60000,
  });
  if (!network.error) return network;

  // ──── Last try: whatever the browser has cached ────
  return getPositionOnce({
    highAccuracy: false,
    timeoutMs: 5000,
    maximumAge: 300000,
  });
}

// ──── Haversine — distance from the office, in metres ────
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
