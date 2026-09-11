import type { ActivityType, Entry } from './types';
import { isDeleted, isOpen } from './types';
import { dayKey } from './time';

/** Entries that are not soft-deleted, sorted by start time ascending. */
export function liveEntries(entries: Entry[]): Entry[] {
  return entries.filter((e) => !isDeleted(e)).sort((a, b) => a.startedAt - b.startedAt);
}

/** The single running (open) entry for a duration type, if any. */
export function openEntry(entries: Entry[], typeId: string): Entry | undefined {
  let best: Entry | undefined;
  for (const e of entries) {
    if (e.typeId !== typeId || isDeleted(e) || !isOpen(e)) continue;
    if (!best || e.startedAt > best.startedAt) best = e;
  }
  return best;
}

/** The latest entry of a type, by its start time. */
export function lastEntry(entries: Entry[], typeId: string): Entry | undefined {
  let best: Entry | undefined;
  for (const e of entries) {
    if (e.typeId !== typeId || isDeleted(e)) continue;
    if (!best || e.startedAt > best.startedAt) best = e;
  }
  return best;
}

export type TypeStatus =
  | { state: 'running'; entry: Entry; since: number; elapsedMs: number }
  | { state: 'idle'; last?: Entry; lastAt?: number; sinceLastMs?: number };

/**
 * What the quick-action box for a type should show right now.
 * For duration types "idle" measures from the end of the last period,
 * which for sleep is exactly "how long has the child been awake".
 */
export function typeStatus(type: ActivityType, entries: Entry[], now: number): TypeStatus {
  if (type.kind === 'duration') {
    const open = openEntry(entries, type.id);
    if (open) {
      return { state: 'running', entry: open, since: open.startedAt, elapsedMs: Math.max(0, now - open.startedAt) };
    }
  }
  const last = lastEntry(entries, type.id);
  if (!last) return { state: 'idle' };
  const lastAt = type.kind === 'duration' && last.endedAt !== undefined ? last.endedAt : last.startedAt;
  return { state: 'idle', last, lastAt, sinceLastMs: Math.max(0, now - lastAt) };
}

export function entryDurationMs(entry: Entry, now: number): number {
  const end = entry.endedAt ?? now;
  return Math.max(0, end - entry.startedAt);
}

export type TimelineItem =
  | { kind: 'day'; ts: number; dayKey: string }
  | {
      kind: 'entry';
      ts: number;
      entry: Entry;
      type: ActivityType;
      /** Time since the previous entry of the same type (start to start). */
      sincePreviousMs?: number;
    }
  | {
      /** The child woke up here and stayed awake until `to` (next sleep start). */
      kind: 'awake';
      ts: number;
      from: number;
      to: number;
      durationMs: number;
      sleepEntry: Entry;
    };

export interface TimelineOptions {
  /** Type id used to derive awake periods. Usually the built-in 'sleep' type. */
  sleepTypeId?: string;
}

/**
 * Builds the chronological timeline (oldest first) with day headers,
 * entries, and derived awake periods between sleeps.
 */
export function buildTimeline(
  entries: Entry[],
  types: ActivityType[],
  now: number,
  options: TimelineOptions = {},
): TimelineItem[] {
  const typeById = new Map(types.map((t) => [t.id, t]));
  const sorted = liveEntries(entries).filter((e) => typeById.has(e.typeId));

  const items: TimelineItem[] = [];
  const previousByType = new Map<string, Entry>();

  for (const entry of sorted) {
    const type = typeById.get(entry.typeId)!;
    const previous = previousByType.get(entry.typeId);
    items.push({
      kind: 'entry',
      ts: entry.startedAt,
      entry,
      type,
      sincePreviousMs: previous ? entry.startedAt - previous.startedAt : undefined,
    });
    previousByType.set(entry.typeId, entry);
  }

  if (options.sleepTypeId) {
    const sleeps = sorted.filter((e) => e.typeId === options.sleepTypeId);
    for (let i = 0; i < sleeps.length; i++) {
      const current = sleeps[i];
      if (current.endedAt === undefined) continue;
      const next = sleeps[i + 1];
      // Awake until the next sleep starts; the trailing awake period is shown
      // live in the quick-action box instead of the timeline.
      if (!next) continue;
      const to = Math.max(current.endedAt, next.startedAt);
      items.push({
        kind: 'awake',
        ts: current.endedAt,
        from: current.endedAt,
        to,
        durationMs: to - current.endedAt,
        sleepEntry: current,
      });
    }
  }

  items.sort((a, b) => a.ts - b.ts || rank(a) - rank(b));

  const withDays: TimelineItem[] = [];
  let currentDay: string | undefined;
  for (const item of items) {
    const key = dayKey(item.ts);
    if (key !== currentDay) {
      currentDay = key;
      withDays.push({ kind: 'day', ts: item.ts, dayKey: key });
    }
    withDays.push(item);
  }
  void now;
  return withDays;
}

function rank(item: TimelineItem): number {
  // At equal timestamps show "woke up" before whatever happened right after.
  return item.kind === 'awake' ? 0 : 1;
}

export interface DaySummary {
  dayKey: string;
  /** Milliseconds of sleep that *started* on this day. */
  sleepMs: number;
  countsByType: Record<string, number>;
}

export function summarizeDay(
  entries: Entry[],
  day: string,
  now: number,
  sleepTypeId?: string,
): DaySummary {
  const summary: DaySummary = { dayKey: day, sleepMs: 0, countsByType: {} };
  for (const e of liveEntries(entries)) {
    if (dayKey(e.startedAt) !== day) continue;
    summary.countsByType[e.typeId] = (summary.countsByType[e.typeId] ?? 0) + 1;
    if (sleepTypeId && e.typeId === sleepTypeId) summary.sleepMs += entryDurationMs(e, now);
  }
  return summary;
}
