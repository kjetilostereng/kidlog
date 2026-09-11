import type { ActivityType, Entry } from './types';
import { newId } from './ids';
import { openEntry } from './derive';
import { roundToMinute } from './time';

/**
 * Pure functions that decide what a quick tap should do. They return the
 * entries to write; persisting is the repository's job. Keeping this pure
 * makes the core behaviour testable without a database.
 */

export type QuickLogPlan =
  | { action: 'log-point'; entry: Entry }
  | { action: 'start'; entry: Entry }
  | { action: 'stop'; entry: Entry };

export function planQuickLog(
  type: ActivityType,
  childId: string,
  entries: Entry[],
  now: number,
): QuickLogPlan {
  const at = roundToMinute(now);
  if (type.kind === 'duration') {
    const open = openEntry(entries, type.id);
    if (open) {
      return { action: 'stop', entry: { ...open, endedAt: Math.max(at, open.startedAt), updatedAt: now } };
    }
    return { action: 'start', entry: newEntry(type, childId, at, now, true) };
  }
  return { action: 'log-point', entry: newEntry(type, childId, at, now, false) };
}

/**
 * The child was registered as sleeping but actually woke up earlier and has
 * now fallen asleep again: close the old period at `wokeAt` and start a new one.
 */
export function planRestart(
  open: Entry,
  wokeAt: number,
  now: number,
): { closed: Entry; started: Entry } {
  const startAt = roundToMinute(now);
  const endAt = Math.min(Math.max(roundToMinute(wokeAt), open.startedAt), startAt);
  return {
    closed: { ...open, endedAt: endAt, updatedAt: now },
    started: {
      id: newId(),
      childId: open.childId,
      typeId: open.typeId,
      startedAt: startAt,
      endedAt: undefined,
      values: {},
      createdAt: now,
      updatedAt: now,
    },
  };
}

export function newEntry(
  type: ActivityType,
  childId: string,
  startedAt: number,
  now: number,
  open: boolean,
): Entry {
  return {
    id: newId(),
    childId,
    typeId: type.id,
    startedAt,
    endedAt: type.kind === 'duration' && !open ? startedAt : undefined,
    values: {},
    createdAt: now,
    updatedAt: now,
  };
}

export interface ValidationError {
  code: 'end-before-start' | 'in-future' | 'overlap';
  otherEntry?: Entry;
}

/** Problems with an edited entry that the UI should surface before saving. */
export function validateEntry(
  entry: Entry,
  type: ActivityType,
  entries: Entry[],
  now: number,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (entry.endedAt !== undefined && entry.endedAt < entry.startedAt) {
    errors.push({ code: 'end-before-start' });
  }
  if (entry.startedAt > now + 5 * 60_000) {
    errors.push({ code: 'in-future' });
  }
  if (type.kind === 'duration') {
    const end = entry.endedAt ?? Number.POSITIVE_INFINITY;
    for (const other of entries) {
      if (other.id === entry.id || other.typeId !== type.id || other.childId !== entry.childId) continue;
      if (other.deletedAt !== undefined) continue;
      const otherEnd = other.endedAt ?? Number.POSITIVE_INFINITY;
      if (entry.startedAt < otherEnd && other.startedAt < end) {
        errors.push({ code: 'overlap', otherEntry: other });
        break;
      }
    }
  }
  return errors;
}
