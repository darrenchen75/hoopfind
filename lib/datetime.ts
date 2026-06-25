export const DEFAULT_TIME_ZONE = "America/New_York";

// Returns a usable IANA zone, falling back to the default for empty/invalid input.
export function normalizeTimeZone(timeZone: string | null | undefined): string {
  const candidate = timeZone?.trim();
  if (!candidate) {
    return DEFAULT_TIME_ZONE;
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }); // throws on bad name
    return candidate;
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// Browser-only: the creator's resolved IANA zone, normalized with a safe fallback.
export function getBrowserTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

// Reads the instant `ms` as wall-clock in `zone`, returned as a UTC epoch (ms).
function zoneWallClockAsUtc(ms: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(ms));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}

// The instant whose wall clock in `timeZone` reads `date`/`time`, as a UTC ISO
// string. Offset trick: interpret the wall-clock as if UTC, measure how that
// instant reads back in the zone, and correct. A second pass fixes the case
// where the first correction crossed a DST boundary into a different offset.
export function wallClockToUtcIso(date: string, time: string, timeZone: string): string {
  const zone = normalizeTimeZone(timeZone);
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const target = Date.UTC(y, mo - 1, d, h, mi);

  if (Number.isNaN(target)) {
    return ""; // unparseable date/time — callers' Invalid-Date guard handles it
  }

  let utc = target;
  for (let pass = 0; pass < 2; pass++) {
    const diff = zoneWallClockAsUtc(utc, zone) - target; // ms the zone is ahead of target
    if (diff === 0) break;
    utc -= diff;
  }
  return new Date(utc).toISOString();
}

// A UTC ISO instant rendered as <input type="date"> / <input type="time">
// values in `timeZone`. hourCycle "h23" makes midnight "00", never "24".
export function utcIsoToWallClockParts(
  startsAt: string,
  timeZone: string,
): { date: string; time: string } {
  const zone = normalizeTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(startsAt));
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  const hour = p.hour === "24" ? "00" : p.hour; // belt-and-suspenders
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${hour}:${p.minute}` };
}

// Human-readable "Wed, Jul 1 · 9:00 AM" pinned to the game's zone.
export function formatGameDateTime(startsAt: string, timeZone: string): string {
  const zone = normalizeTimeZone(timeZone);
  const date = new Date(startsAt);
  const datePart = date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", timeZone: zone,
  });
  const timePart = date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: zone,
  });
  return `${datePart} · ${timePart}`;
}
