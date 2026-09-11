import Dexie, { type EntityTable } from 'dexie';
import type { ActivityType, Child, Entry, Settings } from '../domain/types';

export class KidlogDatabase extends Dexie {
  children!: EntityTable<Child, 'id'>;
  activityTypes!: EntityTable<ActivityType, 'id'>;
  entries!: EntityTable<Entry, 'id'>;
  settings!: EntityTable<Settings, 'id'>;

  constructor(name = 'kidlog') {
    super(name);
    this.version(1).stores({
      children: 'id, updatedAt',
      activityTypes: 'id, builtinKey, sortOrder, updatedAt',
      entries: 'id, childId, typeId, startedAt, [childId+startedAt], [childId+typeId], updatedAt',
      settings: 'id',
    });
  }
}
