import { useState } from 'react';
import type { Child } from '../domain/types';
import { newId } from '../domain/ids';
import { useI18n } from '../i18n';
import { Screen } from './Screen';

interface Props {
  children: Child[];
  activeChildId?: string;
  now: number;
  onSave: (child: Child) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onBack?: () => void;
  /** Onboarding mode: no list, only the form. */
  onboarding?: boolean;
}

export function ChildrenScreen({ children, activeChildId, now, onSave, onSelect, onDelete, onBack, onboarding }: Props) {
  const i18n = useI18n();
  const [editing, setEditing] = useState<Child | 'new' | null>(onboarding ? 'new' : null);

  if (editing) {
    const existing = editing === 'new' ? undefined : editing;
    return (
      <ChildForm
        child={existing}
        title={onboarding ? i18n.m.child.welcomeTitle : existing ? i18n.m.child.editChild : i18n.m.child.addChild}
        intro={onboarding ? i18n.m.child.welcomeBody : undefined}
        now={now}
        onBack={onboarding ? undefined : () => setEditing(null)}
        onSave={(child) => {
          onSave(child);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <Screen title={i18n.m.child.title} onBack={onBack}>
      <ul className="list">
        {children.map((child) => (
          <li key={child.id} className="list-item">
            <button className="list-main" onClick={() => onSelect(child.id)}>
              <span className="list-title">
                {child.name}
                {child.id === activeChildId && <span className="badge">{i18n.m.child.active}</span>}
              </span>
              <span className="list-sub">{i18n.age(child.birthDate, now)} · {child.birthDate}</span>
            </button>
            <button className="icon-button" onClick={() => setEditing(child)} aria-label={i18n.m.common.edit}>
              ✎
            </button>
          </li>
        ))}
      </ul>
      <button className="button primary" onClick={() => setEditing('new')}>
        {i18n.m.child.addChild}
      </button>
      {children.length > 1 && activeChildId && (
        <button
          className="button danger"
          onClick={() => {
            if (window.confirm(i18n.m.child.deleteWarning)) onDelete(activeChildId);
          }}
        >
          {i18n.m.common.delete}: {children.find((c) => c.id === activeChildId)?.name}
        </button>
      )}
    </Screen>
  );
}

function ChildForm({
  child,
  title,
  intro,
  now,
  onSave,
  onBack,
}: {
  child?: Child;
  title: string;
  intro?: string;
  now: number;
  onSave: (child: Child) => void;
  onBack?: () => void;
}) {
  const i18n = useI18n();
  const [name, setName] = useState(child?.name ?? '');
  const [birthDate, setBirthDate] = useState(child?.birthDate ?? '');
  const valid = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(birthDate);

  return (
    <Screen title={title} onBack={onBack}>
      {intro && <p className="intro">{intro}</p>}
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSave({
            id: child?.id ?? newId(),
            name: name.trim(),
            birthDate,
            createdAt: child?.createdAt ?? now,
            updatedAt: now,
          });
        }}
      >
        <label className="field">
          <span>{i18n.m.child.name}</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus required />
        </label>
        <label className="field">
          <span>{i18n.m.child.birthDate}</span>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
        </label>
        <div className="form-actions">
          <button type="submit" className="button primary" disabled={!valid}>
            {i18n.m.common.save}
          </button>
        </div>
      </form>
    </Screen>
  );
}
