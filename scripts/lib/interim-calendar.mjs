const encoder = new TextEncoder();
const escapeText = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');

// RFC 5545 content lines are folded by UTF-8 octets, never inside a code point.
export function foldLine(value) {
  const lines = [];
  let line = '', bytes = 0;
  for (const character of value) {
    const size = encoder.encode(character).length;
    if (bytes + size > 75) { lines.push(line); line = ' '; bytes = 1; }
    line += character;
    bytes += size;
  }
  return [...lines, line].join('\r\n');
}

export function wallTime(instant, zone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(new Date(instant));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

export function validateDeadline(item) {
  if (!/^[a-z0-9-]+$/.test(item.id) || item.precision !== 'exact' || !item.title) {
    throw new Error('Interim calendar accepts identified, exact, verified deadlines only.');
  }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(item.deadline_at) ||
      !Number.isFinite(Date.parse(item.deadline_at)) ||
      new Date(item.deadline_at).toISOString() !== item.deadline_at.replace('Z', '.000Z')) {
    throw new Error(`Invalid UTC deadline for ${item.id}.`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.verified_on) ||
      !Number.isFinite(Date.parse(item.verified_on)) ||
      new Date(item.verified_on).toISOString().slice(0, 10) !== item.verified_on ||
      new URL(item.source_url).protocol !== 'https:' || /[\r\n]/.test(item.source_url)) {
    throw new Error(`Missing or invalid provenance for ${item.id}.`);
  }
  if (wallTime(item.deadline_at, item.deadline_tz) !== item.deadline_wall) {
    throw new Error(`UTC instant and provider wall-clock disagree for ${item.id}.`);
  }
}

export function buildCalendar(deadlines) {
  const seen = new Set();
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Career Track//E0 Interim Deadlines//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Career Track interim deadlines'];
  for (const item of deadlines) {
    validateDeadline(item);
    if (seen.has(item.id)) throw new Error(`Duplicate calendar ID ${item.id}.`);
    seen.add(item.id);
    lines.push('BEGIN:VEVENT', `UID:${item.id}@career-track`,
      `DTSTAMP:${item.verified_on.replaceAll('-', '')}T000000Z`,
      `DTSTART:${item.deadline_at.replace(/[-:]/g, '')}`, 'DURATION:PT1M', 'SEQUENCE:0',
      `SUMMARY:${escapeText(item.title)}`, `URL:${item.source_url}`,
      `DESCRIPTION:${escapeText(`Official: ${item.deadline_wall} ${item.deadline_tz}. Dhaka: ${wallTime(item.deadline_at, 'Asia/Dhaka')}. Verified ${item.verified_on}. ${item.notes}\nSource: ${item.source_url}`)}`,
      'TRANSP:TRANSPARENT');
    for (const trigger of ['-P7D', '-P3D', '-P1D', '-PT3H']) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:${trigger}`,
        `DESCRIPTION:${escapeText(item.title)}`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  return [...lines, 'END:VCALENDAR'].map(foldLine).join('\r\n') + '\r\n';
}
