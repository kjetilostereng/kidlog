import { useMemo, useState } from 'react';
import type { ActivityType, Child, Entry } from '../domain/types';
import { DAY, startOfDay } from '../domain/time';
import { useI18n } from '../i18n';
import { Timeline } from './Timeline';
import { QuickActions } from './QuickActions';

interface Props {
  child: Child;
  childCount: number;
  types: ActivityType[];
  entries: Entry[];
  now: number;
  onQuickLog: (type: ActivityType) => void;
  onLongPress: (type: ActivityType) => void;
  onRestart: (type: ActivityType, open: Entry) => void;
  onSelectEntry: (entry: Entry) => void;
  onAddEntry: () => void;
  onSettings: () => void;
  onSwitchChild: () => void;
}

const INITIAL_DAYS = 3;

export function HomeScreen({
  child,
  childCount,
  types,
  entries,
  now,
  onQuickLog,
  onLongPress,
  onRestart,
  onSelectEntry,
  onAddEntry,
  onSettings,
  onSwitchChild,
}: Props) {
  const i18n = useI18n();
  const [days, setDays] = useState(INITIAL_DAYS);

  const visibleTypes = types.filter((t) => !t.archived);
  const homeTypes = visibleTypes.filter((t) => t.showOnHome);
  const sleepTypeId = types.find((t) => t.builtinKey === 'sleep')?.id;

  const windowStart = startOfDay(now) - (days - 1) * DAY;
  const { windowed, hasOlder } = useMemo(() => {
    // Keep running periods visible even if they started before the window.
    const windowed = entries.filter((e) => e.startedAt >= windowStart || e.endedAt === undefined);
    return { windowed, hasOlder: windowed.length < entries.length };
  }, [entries, windowStart]);

  return (
    <div className="screen home">
      <header className="topbar">
        <button className="child-button" onClick={onSwitchChild} disabled={childCount < 2}>
          <span className="child-name">{child.name}</span>
          <span className="child-age">{i18n.age(child.birthDate, now)}</span>
        </button>
        <span className="topbar-right">
          <button className="icon-button" onClick={onAddEntry} aria-label={i18n.m.home.addBackdated} title={i18n.m.home.addBackdated}>
            +
          </button>
          <button className="icon-button" onClick={onSettings} aria-label={i18n.m.settings.title} title={i18n.m.settings.title}>
            ⚙
          </button>
        </span>
      </header>

      <Timeline
        entries={windowed}
        types={types}
        sleepTypeId={sleepTypeId}
        now={now}
        onSelect={onSelectEntry}
        hasOlder={hasOlder}
        onShowOlder={() => setDays((d) => d + 7)}
      />

      <QuickActions
        types={homeTypes}
        entries={entries}
        now={now}
        onQuickLog={onQuickLog}
        onLongPress={onLongPress}
        onRestart={onRestart}
      />
    </div>
  );
}
