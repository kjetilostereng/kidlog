import type { ActivityType, BuiltinKey } from './types';
import { newId } from './ids';

/**
 * Template for the standard activity types. Names and labels are resolved
 * through i18n when the types are first seeded, so they end up in the user's
 * language and remain editable afterwards.
 */
export interface BuiltinTemplate {
  key: BuiltinKey;
  emoji: string;
  color: string;
  kind: ActivityType['kind'];
  showOnHome: boolean;
  fields: {
    key: string;
    type: 'number' | 'choice' | 'text';
    unit?: string;
    options?: string[];
  }[];
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  { key: 'sleep', emoji: '😴', color: '#8fa8e8', kind: 'duration', showOnHome: true, fields: [] },
  {
    key: 'feed',
    emoji: '🍼',
    color: '#f2b8a2',
    kind: 'point',
    showOnHome: true,
    fields: [
      { key: 'amountMl', type: 'number', unit: 'ml' },
      { key: 'feedKind', type: 'choice', options: ['bottle', 'solid'] },
    ],
  },
  {
    key: 'nursing',
    emoji: '🤱',
    color: '#e8a8c8',
    kind: 'duration',
    showOnHome: true,
    fields: [{ key: 'side', type: 'choice', options: ['left', 'right'] }],
  },
  {
    key: 'diaper',
    emoji: '🧷',
    color: '#d9c76a',
    kind: 'point',
    showOnHome: true,
    fields: [{ key: 'content', type: 'choice', options: ['pee', 'poo', 'both'] }],
  },
  { key: 'walk', emoji: '🚶', color: '#9ccf9a', kind: 'duration', showOnHome: true, fields: [] },
  { key: 'play', emoji: '🧸', color: '#f0c674', kind: 'duration', showOnHome: false, fields: [] },
  { key: 'bath', emoji: '🛁', color: '#8fd3e0', kind: 'point', showOnHome: false, fields: [] },
  {
    key: 'medicine',
    emoji: '💊',
    color: '#d99fd9',
    kind: 'point',
    showOnHome: false,
    fields: [{ key: 'dose', type: 'text' }],
  },
  { key: 'note', emoji: '📝', color: '#c9c2b8', kind: 'point', showOnHome: true, fields: [] },
];

export interface BuiltinLabels {
  name: (key: BuiltinKey) => string;
  fieldLabel: (typeKey: BuiltinKey, fieldKey: string) => string;
  optionLabel: (typeKey: BuiltinKey, fieldKey: string, option: string) => string;
}

export function buildBuiltinTypes(labels: BuiltinLabels, now: number): ActivityType[] {
  return BUILTIN_TEMPLATES.map((t, index) => ({
    id: newId(),
    builtinKey: t.key,
    name: labels.name(t.key),
    emoji: t.emoji,
    color: t.color,
    kind: t.kind,
    fields: t.fields.map((f) => ({
      key: f.key,
      label: labels.fieldLabel(t.key, f.key),
      type: f.type,
      unit: f.unit,
      options: f.options?.map((o) => ({ value: o, label: labels.optionLabel(t.key, f.key, o) })),
    })),
    isBuiltin: true,
    showOnHome: t.showOnHome,
    sortOrder: index,
    archived: false,
    createdAt: now,
    updatedAt: now,
  }));
}

export const CUSTOM_TYPE_COLORS = [
  '#8fa8e8',
  '#f2b8a2',
  '#e8a8c8',
  '#d9c76a',
  '#9ccf9a',
  '#f0c674',
  '#8fd3e0',
  '#d99fd9',
  '#c9c2b8',
  '#f0a06a',
];
