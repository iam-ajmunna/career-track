export const DAY = 86400000;
export type Urgency = 'normal' | 'attention' | 'high' | 'urgent' | 'critical' | 'final' | 'closed';
export type Deadline = { id: string; scholarship_id: string; title: string; deadline_wall: string;
  deadline_tz: string; deadline_at: string; precision: string; source_url: string; verified_on: string; notes: string };

export function urgency(remaining: number): Urgency {
  if (remaining <= 0) return 'closed';
  if (remaining < DAY) return 'final';
  if (remaining < 3 * DAY) return 'critical';
  if (remaining < 7 * DAY) return 'urgent';
  if (remaining < 14 * DAY) return 'high';
  if (remaining <= 30 * DAY) return 'attention';
  return 'normal';
}
export function countdown(deadline: string, now: number, compact = false): string {
  const remaining = Date.parse(deadline) - now;
  if (!Number.isFinite(remaining)) return 'Not verified';
  if (remaining <= 0) return 'Closed';
  const total = Math.ceil(remaining / 1000);
  const days = Math.floor(total / 86400), hours = Math.floor(total / 3600) % 24;
  const minutes = Math.floor(total / 60) % 60, seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, '0');
  if (compact && remaining >= 3 * DAY) return `${days}d ${pad(hours)}h`;
  if (compact && remaining >= DAY) return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  if (compact) return `${pad(Math.floor(total / 3600))}h ${pad(minutes)}m ${pad(seconds)}s`;
  return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
export function selectHero(deadlines: Deadline[], statuses: Record<string, string>, now: number,
  readiness: (id: string) => number = () => 0): Deadline | null {
  let best: Deadline | null = null;
  for (const item of deadlines) {
    const at = Date.parse(item.deadline_at);
    if (!Number.isFinite(at) || at <= now || ['submitted', 'skipped', 'withdrawn'].includes(statuses[item.scholarship_id])) continue;
    if (!best || at < Date.parse(best.deadline_at) ||
      (at === Date.parse(best.deadline_at) && readiness(item.scholarship_id) < readiness(best.scholarship_id))) best = item;
  }
  return best;
}
export function formatZoned(instant: string, zone: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short', hourCycle: 'h23' }).format(new Date(instant));
}
