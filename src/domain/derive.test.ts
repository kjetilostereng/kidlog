import { describe, expect, it } from 'vitest';
import type { ActivityType, Entry } from './types';
import { buildTimeline, openEntry, summarizeDay, typeStatus } from './derive';
import { planQuickLog, planRestart, validateEntry } from './actions';
import { HOUR, MINUTE } from './time';

const T0 = new Date(2026, 8, 10, 6, 0).getTime(); // 2026-09-10 06:00 local

function type(id: string, kind: ActivityType['kind']): ActivityType {
  return {
    id,
    name: id,
    emoji: '',
    color: '#000',
    kind,
    fields: [],
    isBuiltin: true,
    showOnHome: true,
    sortOrder: 0,
    archived: false,
    createdAt: 0,
    updatedAt: 0,
  };
}

const sleep = type('sleep', 'duration');
const feed = type('feed', 'point');

function entry(typeId: string, startedAt: number, endedAt?: number, extra: Partial<Entry> = {}): Entry {
  return {
    id: `${typeId}-${startedAt}`,
    childId: 'c1',
    typeId,
    startedAt,
    endedAt,
    values: {},
    createdAt: startedAt,
    updatedAt: startedAt,
    ...extra,
  };
}

describe('typeStatus', () => {
  it('reports a running sleep with elapsed time', () => {
    const entries = [entry('sleep', T0 + 7 * HOUR)];
    const status = typeStatus(sleep, entries, T0 + 7 * HOUR + 45 * MINUTE);
    expect(status.state).toBe('running');
    if (status.state === 'running') expect(status.elapsedMs).toBe(45 * MINUTE);
  });

  it('measures awake time from the end of the last sleep', () => {
    const entries = [entry('sleep', T0, T0 + HOUR)];
    const status = typeStatus(sleep, entries, T0 + 3 * HOUR);
    expect(status.state).toBe('idle');
    if (status.state === 'idle') expect(status.sinceLastMs).toBe(2 * HOUR);
  });

  it('measures time since the last meal', () => {
    const entries = [entry('feed', T0 + HOUR), entry('feed', T0 + 4 * HOUR)];
    const status = typeStatus(feed, entries, T0 + 5 * HOUR);
    if (status.state === 'idle') expect(status.sinceLastMs).toBe(HOUR);
    else throw new Error('expected idle');
  });

  it('ignores deleted entries', () => {
    const entries = [entry('sleep', T0, undefined, { deletedAt: T0 + 1 })];
    expect(openEntry(entries, 'sleep')).toBeUndefined();
  });
});

describe('planQuickLog', () => {
  it('starts a duration when nothing is running', () => {
    const plan = planQuickLog(sleep, 'c1', [], T0 + 30_500);
    expect(plan.action).toBe('start');
    expect(plan.entry.endedAt).toBeUndefined();
    expect(plan.entry.startedAt).toBe(T0); // rounded down to the minute
  });

  it('stops the running duration on the next tap', () => {
    const open = entry('sleep', T0);
    const plan = planQuickLog(sleep, 'c1', [open], T0 + HOUR);
    expect(plan.action).toBe('stop');
    expect(plan.entry.id).toBe(open.id);
    expect(plan.entry.endedAt).toBe(T0 + HOUR);
  });

  it('logs a point entry for point types', () => {
    const plan = planQuickLog(feed, 'c1', [], T0);
    expect(plan.action).toBe('log-point');
    expect(plan.entry.typeId).toBe('feed');
  });
});

describe('planRestart', () => {
  it('closes the forgotten sleep at the wake time and starts a new one now', () => {
    const open = entry('sleep', T0);
    const { closed, started } = planRestart(open, T0 + 90 * MINUTE, T0 + 3 * HOUR);
    expect(closed.endedAt).toBe(T0 + 90 * MINUTE);
    expect(started.startedAt).toBe(T0 + 3 * HOUR);
    expect(started.endedAt).toBeUndefined();
  });

  it('clamps the wake time between start and now', () => {
    const open = entry('sleep', T0);
    expect(planRestart(open, T0 - HOUR, T0 + HOUR).closed.endedAt).toBe(T0);
    expect(planRestart(open, T0 + 5 * HOUR, T0 + HOUR).closed.endedAt).toBe(T0 + HOUR);
  });
});

describe('buildTimeline', () => {
  it('inserts awake periods between sleeps and gaps between meals', () => {
    const entries = [
      entry('sleep', T0, T0 + HOUR), // 06:00–07:00
      entry('feed', T0 + HOUR + 10 * MINUTE), // 07:10
      entry('feed', T0 + 3 * HOUR + 50 * MINUTE), // 09:50
      entry('sleep', T0 + 4 * HOUR + 5 * MINUTE), // 10:05, running
    ];
    const items = buildTimeline(entries, [sleep, feed], T0 + 5 * HOUR, { sleepTypeId: 'sleep' });
    const kinds = items.map((i) => i.kind);
    expect(kinds).toEqual(['day', 'entry', 'awake', 'entry', 'entry', 'entry']);

    const awake = items.find((i) => i.kind === 'awake');
    if (awake?.kind !== 'awake') throw new Error('expected awake');
    expect(awake.durationMs).toBe(3 * HOUR + 5 * MINUTE);

    const secondFeed = items.filter((i) => i.kind === 'entry' && i.type.id === 'feed')[1];
    if (secondFeed?.kind !== 'entry') throw new Error('expected entry');
    expect(secondFeed.sincePreviousMs).toBe(2 * HOUR + 40 * MINUTE);
  });

  it('does not add a trailing awake period after the last closed sleep', () => {
    const entries = [entry('sleep', T0, T0 + HOUR)];
    const items = buildTimeline(entries, [sleep], T0 + 2 * HOUR, { sleepTypeId: 'sleep' });
    expect(items.map((i) => i.kind)).toEqual(['day', 'entry']);
  });

  it('adds a day header when crossing midnight', () => {
    const entries = [entry('feed', T0), entry('feed', T0 + 20 * HOUR)];
    const items = buildTimeline(entries, [feed], T0 + 21 * HOUR);
    expect(items.map((i) => i.kind)).toEqual(['day', 'entry', 'day', 'entry']);
  });
});

describe('validateEntry', () => {
  it('flags end before start', () => {
    const e = entry('sleep', T0 + HOUR, T0);
    expect(validateEntry(e, sleep, [], T0 + 2 * HOUR).map((x) => x.code)).toContain('end-before-start');
  });

  it('flags overlapping sleep periods', () => {
    const a = entry('sleep', T0, T0 + 2 * HOUR);
    const b = entry('sleep', T0 + HOUR, T0 + 3 * HOUR);
    expect(validateEntry(b, sleep, [a], T0 + 4 * HOUR).map((x) => x.code)).toContain('overlap');
  });

  it('does not flag adjacent periods', () => {
    const a = entry('sleep', T0, T0 + HOUR);
    const b = entry('sleep', T0 + HOUR, T0 + 2 * HOUR);
    expect(validateEntry(b, sleep, [a], T0 + 4 * HOUR)).toEqual([]);
  });
});

describe('summarizeDay', () => {
  it('sums sleep that started on the day and counts entries', () => {
    const entries = [entry('sleep', T0, T0 + HOUR), entry('feed', T0 + HOUR), entry('feed', T0 + 2 * HOUR)];
    const s = summarizeDay(entries, '2026-09-10', T0 + 3 * HOUR, 'sleep');
    expect(s.sleepMs).toBe(HOUR);
    expect(s.countsByType.feed).toBe(2);
  });
});
