// Deadline helpers. Deadlines are stored as UTC ISO strings (deadlineAt). Never compute from date-only text.
export const MS = { min: 60e3, hour: 3600e3, day: 86400e3 };

export function urgencyBand(remainingMs) {
  if (remainingMs <= 0) return { key: 'closed', label: 'CLOSED' };
  if (remainingMs < 1 * MS.day)  return { key: 'final',     label: 'FINAL HOURS' };
  if (remainingMs < 3 * MS.day)  return { key: 'critical',  label: 'CRITICAL' };
  if (remainingMs < 7 * MS.day)  return { key: 'urgent',    label: 'URGENT' };
  if (remainingMs < 14 * MS.day) return { key: 'high',      label: 'HIGH' };
  if (remainingMs < 30 * MS.day) return { key: 'attention', label: 'ATTENTION' };
  return { key: 'normal', label: '' };
}

const p2 = n => String(n).padStart(2, '0');
export function parts(remainingMs) {
  const t = Math.max(0, Math.floor(remainingMs / 1000));
  return { d: Math.floor(t / 86400), h: Math.floor(t % 86400 / 3600), m: Math.floor(t % 3600 / 60), s: t % 60 };
}
/** Compact text: '22d 04h' (>=3d), '2d 07h 12m' (<3d), '07h 12m' (<24h). */
export function formatCompact(remainingMs) {
  if (remainingMs <= 0) return 'Closed';
  const { d, h, m } = parts(remainingMs);
  if (d >= 3) return `${d}d ${p2(h)}h`;
  if (d >= 1) return `${d}d ${p2(h)}h ${p2(m)}m`;
  return `${p2(h)}h ${p2(m)}m`;
}
export function remainingMs(deadlineAtIso, now = Date.now()) {
  const t = Date.parse(deadlineAtIso);
  return Number.isNaN(t) ? null : t - now;
}
/** Show a UTC instant in an explicit IANA zone (e.g. provider zone and the user's zone). */
export function formatInZone(iso, timeZone, locale = 'en-GB') {
  return new Intl.DateTimeFormat(locale, { timeZone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}
