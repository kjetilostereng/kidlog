import { useMemo, useState } from 'react';
import type { ActivityType, Entry, FieldValue } from '../domain/types';
import { newEntry, validateEntry, type ValidationError } from '../domain/actions';
import { fromDateTimeLocal, roundToMinute, toDateTimeLocal } from '../domain/time';
import { useI18n, fill } from '../i18n';
import { Screen } from './Screen';

interface Props {
  childId: string;
  types: ActivityType[];
  entries: Entry[];
  /** Existing entry to edit; omit to create a new one. */
  entry?: Entry;
  /** Preselected type when creating. */
  initialTypeId?: string;
  now: number;
  onSave: (entry: Entry) => void;
  onDelete?: (entry: Entry) => void;
  onBack: () => void;
}

export function EntryEditor({ childId, types, entries, entry, initialTypeId, now, onSave, onDelete, onBack }: Props) {
  const i18n = useI18n();
  const selectable = useMemo(
    () => types.filter((t) => !t.archived || t.id === entry?.typeId),
    [types, entry?.typeId],
  );
  const [typeId, setTypeId] = useState(entry?.typeId ?? initialTypeId ?? selectable[0]?.id ?? '');
  const type = types.find((t) => t.id === typeId);

  const [start, setStart] = useState(toDateTimeLocal(entry?.startedAt ?? roundToMinute(now)));
  const [end, setEnd] = useState(
    entry?.endedAt !== undefined ? toDateTimeLocal(entry.endedAt) : toDateTimeLocal(roundToMinute(now)),
  );
  const [running, setRunning] = useState(entry ? entry.endedAt === undefined : false);
  const [note, setNote] = useState(entry?.note ?? '');
  const [values, setValues] = useState<Record<string, FieldValue>>(entry?.values ?? {});
  const [acknowledgedOverlap, setAcknowledgedOverlap] = useState(false);

  if (!type) {
    return (
      <Screen title={i18n.m.entry.newTitle} onBack={onBack}>
        <p>{i18n.m.common.none}</p>
      </Screen>
    );
  }

  const startedAt = fromDateTimeLocal(start);
  const endedAt = type.kind === 'duration' && !running ? fromDateTimeLocal(end) : undefined;

  const candidate: Entry | undefined =
    startedAt === undefined
      ? undefined
      : {
          ...(entry ?? newEntry(type, childId, startedAt, now, true)),
          typeId: type.id,
          startedAt,
          endedAt,
          note: note.trim() || undefined,
          values: pruneValues(values, type),
          updatedAt: now,
        };

  const errors: ValidationError[] = candidate ? validateEntry(candidate, type, entries, now) : [];
  const blocking = errors.filter((e) => e.code !== 'overlap');
  const overlap = errors.find((e) => e.code === 'overlap');
  const canSave = candidate !== undefined && blocking.length === 0 && (!overlap || acknowledgedOverlap);

  return (
    <Screen title={entry ? i18n.m.entry.editTitle : i18n.m.entry.newTitle} onBack={onBack}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSave && candidate) onSave(candidate);
        }}
      >
        <label className="field">
          <span>{i18n.m.entry.type}</span>
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} disabled={!!entry}>
            {selectable.map((t) => (
              <option key={t.id} value={t.id}>
                {t.emoji} {t.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{type.kind === 'duration' ? i18n.m.entry.start : i18n.m.entry.time}</span>
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>

        {type.kind === 'duration' && (
          <>
            <label className="field checkbox">
              <input type="checkbox" checked={running} onChange={(e) => setRunning(e.target.checked)} />
              <span>{i18n.m.entry.stillRunning}</span>
            </label>
            {!running && (
              <label className="field">
                <span>{i18n.m.entry.end}</span>
                <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
              </label>
            )}
          </>
        )}

        {type.fields.map((field) => (
          <label className="field" key={field.key}>
            <span>
              {field.label}
              {field.unit ? ` (${field.unit})` : ''}
            </span>
            {field.type === 'choice' ? (
              <div className="choice-row">
                {field.options?.map((o) => (
                  <button
                    type="button"
                    key={o.value}
                    className={`chip${values[field.key] === o.value ? ' selected' : ''}`}
                    onClick={() =>
                      setValues((v) => ({ ...v, [field.key]: v[field.key] === o.value ? '' : o.value }))
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            ) : field.type === 'number' ? (
              <input
                type="number"
                inputMode="decimal"
                value={values[field.key] ?? ''}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [field.key]: e.target.value === '' ? '' : Number(e.target.value) }))
                }
              />
            ) : (
              <input
                type="text"
                value={values[field.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
              />
            )}
          </label>
        ))}

        <label className="field">
          <span>{i18n.m.entry.note}</span>
          <textarea
            rows={2}
            value={note}
            placeholder={i18n.m.entry.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>

        {blocking.map((err) => (
          <p key={err.code} className="error">
            {i18n.m.entry.errors[err.code]}
          </p>
        ))}
        {overlap && !acknowledgedOverlap && (
          <div className="warning">
            <p>
              {fill(i18n.m.entry.errors.overlap, {
                t: overlap.otherEntry ? i18n.clockOrDate(overlap.otherEntry.startedAt, now) : '',
              })}
            </p>
            <button type="button" className="button secondary" onClick={() => setAcknowledgedOverlap(true)}>
              {i18n.m.entry.saveAnyway}
            </button>
          </div>
        )}

        <div className="form-actions">
          <button type="submit" className="button primary" disabled={!canSave}>
            {i18n.m.common.save}
          </button>
          {entry && onDelete && (
            <button
              type="button"
              className="button danger"
              onClick={() => {
                if (window.confirm(i18n.m.common.confirmDelete)) onDelete(entry);
              }}
            >
              {i18n.m.common.delete}
            </button>
          )}
        </div>
      </form>
    </Screen>
  );
}

function pruneValues(values: Record<string, FieldValue>, type: ActivityType): Record<string, FieldValue> {
  const out: Record<string, FieldValue> = {};
  for (const f of type.fields) {
    const v = values[f.key];
    if (v !== undefined && v !== '') out[f.key] = v;
  }
  return out;
}
