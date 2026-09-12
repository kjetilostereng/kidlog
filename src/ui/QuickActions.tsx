import type { ActivityType, Entry } from '../domain/types';
import { typeStatus } from '../domain/derive';
import { useI18n, fill } from '../i18n';
import { useLongPress } from '../hooks/useLongPress';

interface Props {
  types: ActivityType[];
  entries: Entry[];
  now: number;
  onQuickLog: (type: ActivityType) => void;
  onLongPress: (type: ActivityType) => void;
  onRestart: (type: ActivityType, open: Entry) => void;
}

export function QuickActions({ types, entries, now, onQuickLog, onLongPress, onRestart }: Props) {
  return (
    <div className="quick-actions">
      {types.map((type) => (
        <QuickBox
          key={type.id}
          type={type}
          entries={entries}
          now={now}
          onQuickLog={onQuickLog}
          onLongPress={onLongPress}
          onRestart={onRestart}
        />
      ))}
    </div>
  );
}

function QuickBox({
  type,
  entries,
  now,
  onQuickLog,
  onLongPress,
  onRestart,
}: { type: ActivityType } & Omit<Props, 'types'>) {
  const i18n = useI18n();
  const status = typeStatus(type, entries, now);
  const press = useLongPress(
    () => onQuickLog(type),
    () => onLongPress(type),
  );
  const isSleep = type.builtinKey === 'sleep';
  const running = status.state === 'running';

  let statusText: string;
  if (status.state === 'running') {
    const d = i18n.duration(status.elapsedMs);
    statusText = isSleep ? fill(i18n.m.home.sleepingFor, { d }) : fill(i18n.m.home.runningFor, { d });
  } else if (status.sinceLastMs !== undefined) {
    const d = i18n.duration(status.sinceLastMs);
    statusText = isSleep ? fill(i18n.m.home.awakeFor, { d }) : fill(i18n.m.home.sinceLast, { d });
  } else {
    statusText = i18n.m.home.never;
  }

  let action: string;
  if (type.kind === 'duration') {
    if (isSleep) action = running ? i18n.m.home.stopSleep : i18n.m.home.startSleep;
    else action = running ? i18n.m.home.stop : i18n.m.home.start;
  } else {
    action = i18n.m.home.log;
  }

  return (
    <div className={`quick-box${running ? ' is-running' : ''}`} style={{ ['--type-color' as string]: type.color }}>
      <button className="quick-box-main" {...press} aria-label={`${type.name}: ${action}`}>
        <span className="quick-box-head">
          <span className="quick-box-emoji">{type.emoji}</span>
          <span className="quick-box-name">{type.name}</span>
        </span>
        <span className="quick-box-status">{statusText}</span>
        <span className="quick-box-action">{action}</span>
      </button>
      {running && isSleep && status.state === 'running' && (
        <button className="quick-box-secondary" onClick={() => onRestart(type, status.entry)}>
          {i18n.m.home.restartHint}
        </button>
      )}
    </div>
  );
}
