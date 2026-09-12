import { beforeEach, describe, expect, it } from 'vitest';
import { DexieRepository } from './dexieRepository';
import { KidlogDatabase } from './db';
import { buildBuiltinTypes } from '../domain/defaults';
import { I18n } from '../i18n';
import { planQuickLog } from '../domain/actions';
import { openEntry } from '../domain/derive';

let repo: DexieRepository;
let counter = 0;

beforeEach(() => {
  repo = new DexieRepository(new KidlogDatabase(`test-${counter++}`));
});

describe('DexieRepository', () => {
  it('creates default settings on first read', async () => {
    const s = await repo.getSettings();
    expect(s.locale).toBe('nb');
  });

  it('stores built-in types in order', async () => {
    const types = buildBuiltinTypes(new I18n('nb').builtinLabels(), 1);
    await repo.saveActivityTypes(types);
    const stored = await repo.listActivityTypes();
    expect(stored.map((t) => t.builtinKey)).toEqual([
      'sleep', 'feed', 'nursing', 'diaper', 'walk', 'play', 'bath', 'medicine', 'note',
    ]);
    expect(stored[0].name).toBe('Søvn');
    expect(stored[2].fields[0].options?.map((o) => o.label)).toEqual(['Venstre', 'Høyre']);
  });

  it('starts and stops a sleep through the quick-log plan', async () => {
    const [sleep] = buildBuiltinTypes(new I18n('nb').builtinLabels(), 1);
    await repo.saveActivityType(sleep);
    const now = Date.now();

    const start = planQuickLog(sleep, 'c1', await repo.listEntries({ childId: 'c1' }), now);
    await repo.saveEntry(start.entry);
    expect(openEntry(await repo.listEntries({ childId: 'c1' }), sleep.id)).toBeDefined();

    const stop = planQuickLog(sleep, 'c1', await repo.listEntries({ childId: 'c1' }), now + 60_000);
    expect(stop.action).toBe('stop');
    await repo.saveEntry(stop.entry);
    const entries = await repo.listEntries({ childId: 'c1' });
    expect(entries).toHaveLength(1);
    expect(entries[0].endedAt).toBeDefined();
  });

  it('soft-deletes entries and hides them from queries', async () => {
    await repo.saveEntry({
      id: 'e1', childId: 'c1', typeId: 't', startedAt: 10, values: {}, createdAt: 1, updatedAt: 1,
    });
    await repo.deleteEntry('e1');
    expect(await repo.listEntries({ childId: 'c1' })).toEqual([]);
    expect(await repo.getEntry('e1')).toBeUndefined();
    const backup = await repo.exportBackup();
    expect(backup.entries[0].deletedAt).toBeDefined();
  });

  it('filters entries by child and time range', async () => {
    for (const [id, childId, startedAt] of [['a', 'c1', 10], ['b', 'c1', 20], ['c', 'c2', 15]] as const) {
      await repo.saveEntry({ id, childId, typeId: 't', startedAt, values: {}, createdAt: 1, updatedAt: 1 });
    }
    expect((await repo.listEntries({ childId: 'c1' })).map((e) => e.id)).toEqual(['a', 'b']);
    expect((await repo.listEntries({ childId: 'c1', from: 15 })).map((e) => e.id)).toEqual(['b']);
    expect((await repo.listEntries({ childId: 'c1', to: 20 })).map((e) => e.id)).toEqual(['a']);
  });

  it('imports a backup keeping the newest version of each record', async () => {
    await repo.saveEntry({ id: 'e1', childId: 'c1', typeId: 't', startedAt: 10, values: {}, createdAt: 1, updatedAt: 5 });
    const backup = await repo.exportBackup();
    backup.entries = [
      { ...backup.entries[0], startedAt: 99, updatedAt: 3 }, // older: ignored
      { id: 'e2', childId: 'c1', typeId: 't', startedAt: 20, values: {}, createdAt: 1, updatedAt: 1 },
    ];
    await repo.importBackup(backup);
    const entries = await repo.listEntries({ childId: 'c1' });
    expect(entries.map((e) => [e.id, e.startedAt])).toEqual([['e1', 10], ['e2', 20]]);
  });

  it('notifies subscribers on writes', async () => {
    let calls = 0;
    const unsubscribe = repo.subscribe(() => calls++);
    await repo.saveSettings({ activeChildId: 'c1' });
    unsubscribe();
    await repo.saveSettings({ activeChildId: 'c2' });
    expect(calls).toBe(1);
  });
});
