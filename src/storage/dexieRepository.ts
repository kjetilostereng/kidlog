import type { ActivityType, Child, Entry, Settings } from '../domain/types';
import { SETTINGS_ID, isDeleted } from '../domain/types';
import type { EntityTable, IDType } from 'dexie';
import { KidlogDatabase } from './db';
import type { Backup, EntryQuery, Repository } from './repository';

export class DexieRepository implements Repository {
  private listeners = new Set<() => void>();

  constructor(private db: KidlogDatabase = new KidlogDatabase()) {}

  private notify() {
    for (const l of this.listeners) l();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getSettings(): Promise<Settings> {
    const existing = await this.db.settings.get(SETTINGS_ID);
    if (existing) return existing;
    const fresh: Settings = { id: SETTINGS_ID, locale: 'nb', updatedAt: Date.now() };
    await this.db.settings.put(fresh);
    return fresh;
  }

  async saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings> {
    const current = await this.getSettings();
    const next: Settings = { ...current, ...patch, id: SETTINGS_ID, updatedAt: Date.now() };
    await this.db.settings.put(next);
    this.notify();
    return next;
  }

  async listChildren(): Promise<Child[]> {
    const all = await this.db.children.toArray();
    return all.filter((c) => !isDeleted(c)).sort((a, b) => a.createdAt - b.createdAt);
  }

  async saveChild(child: Child): Promise<void> {
    await this.db.children.put(child);
    this.notify();
  }

  async deleteChild(id: string): Promise<void> {
    const now = Date.now();
    await this.db.transaction('rw', this.db.children, this.db.entries, async () => {
      const child = await this.db.children.get(id);
      if (child) await this.db.children.put({ ...child, deletedAt: now, updatedAt: now });
      const entries = await this.db.entries.where('childId').equals(id).toArray();
      await this.db.entries.bulkPut(entries.map((e) => ({ ...e, deletedAt: now, updatedAt: now })));
    });
    this.notify();
  }

  async listActivityTypes(): Promise<ActivityType[]> {
    const all = await this.db.activityTypes.toArray();
    return all.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt - b.createdAt);
  }

  async saveActivityType(type: ActivityType): Promise<void> {
    await this.db.activityTypes.put(type);
    this.notify();
  }

  async saveActivityTypes(types: ActivityType[]): Promise<void> {
    await this.db.activityTypes.bulkPut(types);
    this.notify();
  }

  async listEntries(query: EntryQuery): Promise<Entry[]> {
    const lower = query.from ?? Number.NEGATIVE_INFINITY;
    const upper = query.to ?? Number.POSITIVE_INFINITY;
    const rows = await this.db.entries
      .where('[childId+startedAt]')
      .between([query.childId, lower], [query.childId, upper], true, false)
      .toArray();
    return rows.filter((e) => !isDeleted(e)).sort((a, b) => a.startedAt - b.startedAt);
  }

  async getEntry(id: string): Promise<Entry | undefined> {
    const e = await this.db.entries.get(id);
    return e && !isDeleted(e) ? e : undefined;
  }

  async saveEntry(entry: Entry): Promise<void> {
    await this.db.entries.put(entry);
    this.notify();
  }

  async saveEntries(entries: Entry[]): Promise<void> {
    await this.db.entries.bulkPut(entries);
    this.notify();
  }

  async deleteEntry(id: string): Promise<void> {
    const entry = await this.db.entries.get(id);
    if (!entry) return;
    const now = Date.now();
    await this.db.entries.put({ ...entry, deletedAt: now, updatedAt: now });
    this.notify();
  }

  async exportBackup(): Promise<Backup> {
    const [children, activityTypes, entries, settings] = await Promise.all([
      this.db.children.toArray(),
      this.db.activityTypes.toArray(),
      this.db.entries.toArray(),
      this.getSettings(),
    ]);
    return { version: 1, exportedAt: Date.now(), children, activityTypes, entries, settings };
  }

  /**
   * Merges a backup into the local database. Records are compared by id and
   * the newest `updatedAt` wins, which is the same rule a future sync will use.
   */
  async importBackup(backup: Backup): Promise<void> {
    if (backup.version !== 1) throw new Error(`Unsupported backup version: ${String(backup.version)}`);
    await this.db.transaction(
      'rw',
      [this.db.children, this.db.activityTypes, this.db.entries, this.db.settings],
      async () => {
        await mergeNewest(this.db.children, backup.children);
        await mergeNewest(this.db.activityTypes, backup.activityTypes);
        await mergeNewest(this.db.entries, backup.entries);
        const current = await this.db.settings.get(SETTINGS_ID);
        if (!current || backup.settings.updatedAt > current.updatedAt) {
          await this.db.settings.put({ ...backup.settings, id: SETTINGS_ID });
        }
      },
    );
    this.notify();
  }
}

async function mergeNewest<T extends { id: string; updatedAt: number }>(
  table: EntityTable<T, 'id'>,
  incoming: T[],
) {
  const toWrite: T[] = [];
  for (const item of incoming) {
    const existing = await table.get(item.id as IDType<T, 'id'>);
    if (!existing || item.updatedAt > existing.updatedAt) toWrite.push(item);
  }
  if (toWrite.length) await table.bulkPut(toWrite);
}
