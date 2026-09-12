/**
 * Core domain model for Kidlog.
 *
 * All ids are UUIDs and all timestamps are epoch milliseconds (UTC).
 * Every entity carries createdAt/updatedAt and uses soft deletes (deletedAt)
 * so the same model can later be synchronised to a cloud backend without
 * changing its shape.
 */

export type Kind = 'point' | 'duration';

export type FieldType = 'number' | 'choice' | 'text';

export interface FieldOption {
  value: string;
  label: string;
}

/** An extra field an activity type can ask for (e.g. amount in ml, left/right side). */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  unit?: string;
  options?: FieldOption[];
}

export interface Child {
  id: string;
  name: string;
  /** ISO date, 'YYYY-MM-DD'. */
  birthDate: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface ActivityType {
  id: string;
  /** Present on the standard types shipped with the app, e.g. 'sleep'. */
  builtinKey?: BuiltinKey;
  name: string;
  emoji: string;
  color: string;
  kind: Kind;
  fields: FieldDef[];
  /** Standard types can be hidden but not deleted. */
  isBuiltin: boolean;
  showOnHome: boolean;
  sortOrder: number;
  archived: boolean;
  createdAt: number;
  updatedAt: number;
}

export type BuiltinKey =
  | 'sleep'
  | 'feed'
  | 'nursing'
  | 'diaper'
  | 'walk'
  | 'play'
  | 'bath'
  | 'medicine'
  | 'note';

export type FieldValue = string | number;

export interface Entry {
  id: string;
  childId: string;
  typeId: string;
  /** For 'point' kinds this is the moment itself. */
  startedAt: number;
  /** Only for 'duration' kinds. Undefined means the activity is still running. */
  endedAt?: number;
  note?: string;
  values: Record<string, FieldValue>;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface Settings {
  id: 'settings';
  activeChildId?: string;
  locale: string;
  updatedAt: number;
}

export const SETTINGS_ID = 'settings' as const;

export function isOpen(entry: Entry): boolean {
  return entry.endedAt === undefined || entry.endedAt === null;
}

export function isDeleted(entity: { deletedAt?: number }): boolean {
  return entity.deletedAt !== undefined && entity.deletedAt !== null;
}
