/**
 * Resolve opening-hours object from a place row.
 * Prefer `hours` (vendor JSONB) over legacy fields so an empty truthy `{}`
 * on `opening_hours_json` does not hide real data on `hours`.
 */
export function resolvePlaceHours(place) {
  const p = place || {};
  const tryParse = (val) => {
    if (val == null || val === "") return null;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        return parsed !== null && typeof parsed === "object" ? parsed : null;
      } catch {
        return null;
      }
    }
    if (typeof val === "object") return val;
    return null;
  };
  const candidates = [
    tryParse(p.hours),
    tryParse(p.opening_hours_json),
    tryParse(p.opening_hours),
  ];
  for (const h of candidates) {
    if (!h || typeof h !== "object") continue;
    if (Object.keys(h).length === 0) continue;
    return h;
  }
  return null;
}

/**
 * Single time → 12h label without space before AM/PM (e.g. 06:00AM, 04:30PM).
 * Accepts 24h HH:MM[:SS], or 12h with AM/PM.
 */
export function formatTimeTo12Hour(str) {
  if (str == null || str === "") return "";
  const s = String(str).trim();
  if (s.toLowerCase() === "closed") return "Closed";

  const noSec = s.replace(
    /^(\d{1,2}:\d{2}):\d{2}(?:\.\d+)?(?=\s|$|[AP]M)/i,
    "$1",
  );

  const twelve = noSec.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i);
  if (twelve) {
    const h = parseInt(twelve[1], 10);
    const min = twelve[2];
    const ap = twelve[3].toUpperCase();
    const hourPadded = String(h).padStart(2, "0");
    return `${hourPadded}:${min}${ap}`;
  }

  const m = noSec.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return s;

  const h24 = parseInt(m[1], 10);
  const min = m[2];
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  const hourPadded = String(h12).padStart(2, "0");
  return `${hourPadded}:${min}${period}`;
}

/** Format one day's opening hours for display (object, range string, or array). */
export function formatOpeningHoursValue(raw) {
  if (!raw) return "Closed";
  if (typeof raw === "string") {
    const t = raw.trim();
    if (t.toLowerCase() === "closed") return "Closed";
    const parts = t.split(/\s*-\s*/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return `${formatTimeTo12Hour(parts[0])} - ${formatTimeTo12Hour(parts[1])}`;
    }
    return formatTimeTo12Hour(t);
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    if (raw.open && raw.close) {
      return `${formatTimeTo12Hour(String(raw.open))} - ${formatTimeTo12Hour(String(raw.close))}`;
    }
    if (raw.close === null || raw.close === false) return "Closed";
    return "Hours available";
  }
  if (Array.isArray(raw)) {
    if (raw.length >= 2) {
      return `${formatTimeTo12Hour(String(raw[0]))} - ${formatTimeTo12Hour(String(raw[1]))}`;
    }
    if (raw.length >= 1) return formatTimeTo12Hour(String(raw[0]));
  }
  return "Closed";
}
