import { useState } from 'react';
import type { ActivityType, FieldDef, FieldType, Kind } from '../domain/types';
import { CUSTOM_TYPE_COLORS } from '../domain/defaults';
import { newId } from '../domain/ids';
import { useI18n } from '../i18n';
import { Screen } from './Screen';

interface Props {
  types: ActivityType[];
  now: number;
  onSaveMany: (types: ActivityType[]) => void;
  onBack: () => void;
}

export function TypesScreen({ types, now, onSaveMany, onBack }: Props) {
  const i18n = useI18n();
  const [editing, setEditing] = useState<ActivityType | 'new' | null>(null);
  const active = types.filter((t) => !t.archived);
  const archived = types.filter((t) => t.archived);

  if (editing) {
    return (
      <TypeForm
        type={editing === 'new' ? undefined : editing}
        nextSortOrder={types.reduce((m, t) => Math.max(m, t.sortOrder), -1) + 1}
        now={now}
        onSave={(t) => {
          onSaveMany([t]);
          setEditing(null);
        }}
        onBack={() => setEditing(null)}
      />
    );
  }

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= active.length) return;
    const reordered = [...active];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    onSaveMany(reordered.map((t, i) => ({ ...t, sortOrder: i, updatedAt: now })));
  };

  return (
    <Screen title={i18n.m.types.title} onBack={onBack}>
      <p className="intro">{i18n.m.types.intro}</p>
      <ul className="list">
        {active.map((type, index) => (
          <li key={type.id} className="list-item" style={{ ['--type-color' as string]: type.color }}>
            <label className="list-toggle">
              <input
                type="checkbox"
                checked={type.showOnHome}
                onChange={(e) => onSaveMany([{ ...type, showOnHome: e.target.checked, updatedAt: now }])}
                aria-label={i18n.m.types.showOnHome}
              />
            </label>
            <button className="list-main" onClick={() => setEditing(type)}>
              <span className="list-title">
                <span className="type-dot" /> {type.emoji} {type.name}
                {type.isBuiltin && <span className="badge muted">{i18n.m.types.builtinHint}</span>}
              </span>
              <span className="list-sub">
                {type.kind === 'duration' ? i18n.m.types.kindDuration : i18n.m.types.kindPoint}
              </span>
            </button>
            <span className="list-reorder">
              <button className="icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={i18n.m.types.moveUp}>
                ▲
              </button>
              <button
                className="icon-button"
                onClick={() => move(index, 1)}
                disabled={index === active.length - 1}
                aria-label={i18n.m.types.moveDown}
              >
                ▼
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button className="button primary" onClick={() => setEditing('new')}>
        {i18n.m.types.addType}
      </button>
      {archived.length > 0 && (
        <>
          <h2 className="section-title">{i18n.m.types.archived}</h2>
          <ul className="list">
            {archived.map((type) => (
              <li key={type.id} className="list-item">
                <span className="list-main">
                  <span className="list-title">
                    {type.emoji} {type.name}
                  </span>
                </span>
                <button className="link-button" onClick={() => onSaveMany([{ ...type, archived: false, updatedAt: now }])}>
                  {i18n.m.types.unarchive}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Screen>
  );
}

interface FieldDraft {
  key: string;
  label: string;
  type: FieldType;
  unit: string;
  options: string;
}

function toDraft(f: FieldDef): FieldDraft {
  return {
    key: f.key,
    label: f.label,
    type: f.type,
    unit: f.unit ?? '',
    options: f.options?.map((o) => o.label).join(', ') ?? '',
  };
}

function fromDraft(d: FieldDraft): FieldDef | null {
  const label = d.label.trim();
  if (!label) return null;
  const def: FieldDef = { key: d.key, label, type: d.type };
  if (d.type === 'number' && d.unit.trim()) def.unit = d.unit.trim();
  if (d.type === 'choice') {
    const options = d.options
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length === 0) return null;
    def.options = options.map((label) => ({ value: label, label }));
  }
  return def;
}

function TypeForm({
  type,
  nextSortOrder,
  now,
  onSave,
  onBack,
}: {
  type?: ActivityType;
  nextSortOrder: number;
  now: number;
  onSave: (t: ActivityType) => void;
  onBack: () => void;
}) {
  const i18n = useI18n();
  const [name, setName] = useState(type?.name ?? '');
  const [emoji, setEmoji] = useState(type?.emoji ?? '⭐');
  const [color, setColor] = useState(type?.color ?? CUSTOM_TYPE_COLORS[0]);
  const [kind, setKind] = useState<Kind>(type?.kind ?? 'point');
  const [fields, setFields] = useState<FieldDraft[]>(type?.fields.map(toDraft) ?? []);
  const valid = name.trim().length > 0;

  const updateField = (i: number, patch: Partial<FieldDraft>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));

  return (
    <Screen title={type ? i18n.m.types.editType : i18n.m.types.addType} onBack={onBack}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave({
            id: type?.id ?? newId(),
            builtinKey: type?.builtinKey,
            name: name.trim(),
            emoji: emoji.trim() || '⭐',
            color,
            kind: type?.isBuiltin ? type.kind : kind,
            fields: fields.map(fromDraft).filter((f): f is FieldDef => f !== null),
            isBuiltin: type?.isBuiltin ?? false,
            showOnHome: type?.showOnHome ?? true,
            sortOrder: type?.sortOrder ?? nextSortOrder,
            archived: type?.archived ?? false,
            createdAt: type?.createdAt ?? now,
            updatedAt: now,
          });
        }}
      >
        <label className="field">
          <span>{i18n.m.types.name}</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus={!type} />
        </label>
        <label className="field">
          <span>{i18n.m.types.emoji}</span>
          <input type="text" value={emoji} maxLength={4} onChange={(e) => setEmoji(e.target.value)} className="emoji-input" />
        </label>
        <div className="field">
          <span>{i18n.m.types.color}</span>
          <div className="choice-row">
            {CUSTOM_TYPE_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch${c === color ? ' selected' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              />
            ))}
          </div>
        </div>
        <div className="field">
          <span>{i18n.m.types.kind}</span>
          <label className="radio">
            <input type="radio" checked={kind === 'point'} disabled={type?.isBuiltin} onChange={() => setKind('point')} />
            <span>{i18n.m.types.kindPoint}</span>
          </label>
          <label className="radio">
            <input type="radio" checked={kind === 'duration'} disabled={type?.isBuiltin} onChange={() => setKind('duration')} />
            <span>{i18n.m.types.kindDuration}</span>
          </label>
        </div>

        <div className="field">
          <span>{i18n.m.types.fields}</span>
          {fields.map((f, i) => (
            <div key={f.key} className="field-card">
              <input
                type="text"
                placeholder={i18n.m.types.fieldLabel}
                value={f.label}
                onChange={(e) => updateField(i, { label: e.target.value })}
              />
              <select value={f.type} onChange={(e) => updateField(i, { type: e.target.value as FieldType })}>
                <option value="number">{i18n.m.types.fieldTypeNumber}</option>
                <option value="choice">{i18n.m.types.fieldTypeChoice}</option>
                <option value="text">{i18n.m.types.fieldTypeText}</option>
              </select>
              {f.type === 'number' && (
                <input
                  type="text"
                  placeholder={i18n.m.types.fieldUnit}
                  value={f.unit}
                  onChange={(e) => updateField(i, { unit: e.target.value })}
                />
              )}
              {f.type === 'choice' && (
                <input
                  type="text"
                  placeholder={i18n.m.types.fieldOptions}
                  value={f.options}
                  onChange={(e) => updateField(i, { options: e.target.value })}
                />
              )}
              <button type="button" className="link-button danger" onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>
                {i18n.m.common.delete}
              </button>
            </div>
          ))}
          <button
            type="button"
            className="button secondary"
            onClick={() => setFields((fs) => [...fs, { key: newId(), label: '', type: 'number', unit: '', options: '' }])}
          >
            {i18n.m.types.addField}
          </button>
        </div>

        <div className="form-actions">
          <button type="submit" className="button primary" disabled={!valid}>
            {i18n.m.common.save}
          </button>
          {type && !type.archived && (
            <button
              type="button"
              className="button danger"
              onClick={() => onSave({ ...type, archived: true, showOnHome: false, updatedAt: now })}
            >
              {i18n.m.types.archive}
            </button>
          )}
        </div>
      </form>
    </Screen>
  );
}
