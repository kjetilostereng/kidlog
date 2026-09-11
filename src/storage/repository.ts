import type { ActivityType, Child, Entry, Settings } from '../domain/types';

export interface EntryQuery {
  childId: string;
  /** Inclusive lower bound on startedAt. */
  from?: number;
  /** Exclusive upper bound on startedAt. */
  to?: number;
}

export interface Backup {
  version: 1;
  exportedAt: number;
  children: Child[];
  activityTypes: ActivityType[];
  entries: Entry[];
  settings: Settings;
}

/**
 * The single seam between the app and its storage. The current
 * implementation is local (IndexedDB); a cloud-backed one can replace or
 * wrap it later. Writes must call listeners registered with `subscribe`.
 */
export interface Repository {
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<Settings>;

  listChildren(): Promise<Child[]>;
  saveChild(child: Child): Promise<void>;
  deleteChild(id: string): Promise<void>;

  listActivityTypes(): Promise<ActivityType[]>;
  saveActivityType(type: ActivityType): Promise<void>;
  saveActivityTypes(types: ActivityType[]): Promise<void>;

  listEntries(query: EntryQuery): Promise<Entry[]>;
  getEntry(id: string): Promise<Entry | undefined>;
  saveEntry(entry: Entry): Promise<void>;
  saveEntries(entries: Entry[]): Promise<void>;
  deleteEntry(id: string): Promise<void>;

  exportBackup(): Promise<Backup>;
  importBackup(backup: Backup): Promise<void>;

  subscribe(listener: () => void): () => void;
}
