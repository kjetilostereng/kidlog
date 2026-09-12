export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

export function durationParts(ms: number): DurationParts {
  const total = Math.max(0, Math.floor(ms / MINUTE));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  return { days, hours, minutes };
}

/** Local calendar day key, 'YYYY-MM-DD'. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Whole days between two local calendar days (b - a). */
export function calendarDaysBetween(a: number, b: number): number {
  return Math.round((startOfDay(b) - startOfDay(a)) / DAY);
}

export interface AgeParts {
  years: number;
  months: number;
  weeks: number;
  days: number;
}

/** Age of someone born on `birthDate` ('YYYY-MM-DD') at `now`, in calendar units. */
export function ageParts(birthDate: string, now: number): AgeParts {
  const [y, m, d] = birthDate.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let years = today.getFullYear() - birth.getFullYear();
  let months = today.getMonth() - birth.getMonth();
  let days = today.getDate() - birth.getDate();
  if (days < 0) {
    months -= 1;
    // Days in the month preceding `today`.
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return { years: 0, months: 0, weeks: 0, days: 0 };
  return { years, months, weeks: Math.floor(days / 7), days: days % 7 };
}

/** Converts a timestamp to the value expected by <input type="datetime-local">. */
export function toDateTimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocal(value: string): number | undefined {
  if (!value) return undefined;
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? undefined : ts;
}

/** Drops seconds and milliseconds so logged times line up with what the user sees. */
export function roundToMinute(ts: number): number {
  return Math.floor(ts / MINUTE) * MINUTE;
}
