import { readFile, writeFile } from 'node:fs/promises';
import { buildCalendar } from './lib/interim-calendar.mjs';
const source = JSON.parse(await readFile(new URL('../docs/baseline/near-term-deadlines.json', import.meta.url), 'utf8'));
const target = new URL('../docs/baseline/interim-deadlines.ics', import.meta.url);
await writeFile(target, buildCalendar(source.deadlines));
console.log(`Built ${source.deadlines.length} verified interim events with four alarms each. Phone import still requires verification.`);
