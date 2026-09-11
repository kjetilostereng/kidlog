import { useState } from 'react';
import type { Child, Entry } from '../domain/types';
import { fromDateTimeLocal, toDateTimeLocal } from '../domain/time';
import { useI18n, fill } from '../i18n';

interface Props {
  child: Child;
  open: Entry;
  now: number;
  onConfirm: (wokeAt: number) => void;
  onCancel: () => void;
}

export function RestartDialog({ child, open, now, onConfirm, onCancel }: Props) {
  const i18n = useI18n();
  const [value, setValue] = useState(toDateTimeLocal(now));
  const wokeAt = fromDateTimeLocal(value);
  const valid = wokeAt !== undefined && wokeAt >= open.startedAt && wokeAt <= now;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <h2>{fill(i18n.m.restart.title, { name: child.name })}</h2>
        <p>{fill(i18n.m.restart.body, { t: i18n.clockOrDate(open.startedAt, now) })}</p>
        <label className="field">
          <span>{i18n.m.timeline.wokeUp}</span>
          <input
            type="datetime-local"
            value={value}
            min={toDateTimeLocal(open.startedAt)}
            max={toDateTimeLocal(now)}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <div className="modal-actions">
          <button className="button secondary" onClick={onCancel}>
            {i18n.m.common.cancel}
          </button>
          <button className="button primary" disabled={!valid} onClick={() => wokeAt !== undefined && onConfirm(wokeAt)}>
            {i18n.m.restart.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
