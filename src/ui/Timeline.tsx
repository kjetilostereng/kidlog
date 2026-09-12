import { useEffect, useRef } from 'react';
import type { ActivityType, Entry } from '../domain/types';
import { buildTimeline, entryDurationMs, type TimelineItem } from '../domain/derive';
import { useI18n, fill, type I18n } from '../i18n';

interface Props {
  entries: Entry[];
  types: ActivityType[];
  sleepTypeId?: string;
  now: number;
  onSelect: (entry: Entry) => void;
  onShowOlder?: () => void;
  hasOlder: boolean;
}

export function Timeline({ entries, types, sleepTypeId, now, onSelect, onShowOlder, hasOlder }: Props) {
  const i18n = useI18n();
  const items = buildTimeline(entries, types, now, { sleepTypeId });
  const bottom = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const lastCount = useRef(-1);

  // Newest is at the bottom: jump there on first render and whenever a
  // new entry is added, but leave the scroll alone while the user reads history.
  useEffect(() => {
    if (lastCount.current === -1 || entries.length > lastCount.current) {
      bottom.current?.scrollIntoView({ block: 'end' });
    }
    lastCount.current = entries.length;
  }, [entries.length]);

  if (items.length === 0) {
    return (
      <div className="timeline timeline-empty" ref={container}>
        <p>{i18n.m.home.noEntries}</p>
      </div>
    );
  }

  return (
    <div className="timeline" ref={container}>
      {hasOlder && onShowOlder && (
        <button className="link-button timeline-older" onClick={onShowOlder}>
          {i18n.m.home.showOlder}
        </button>
      )}
      {items.map((item, index) => (
        <TimelineRow key={keyFor(item, index)} item={item} now={now} i18n={i18n} onSelect={onSelect} />
      ))}
      <div ref={bottom} />
    </div>
  );
}

function keyFor(item: TimelineItem, index: number): string {
  switch (item.kind) {
    case 'day':
      return `day-${item.dayKey}`;
    case 'entry':
      return `entry-${item.entry.id}`;
    case 'awake':
      return `awake-${item.sleepEntry.id}`;
    default:
      return String(index);
  }
}

function TimelineRow({
  item,
  now,
  i18n,
  onSelect,
}: {
  item: TimelineItem;
  now: number;
  i18n: I18n;
  onSelect: (entry: Entry) => void;
}) {
  if (item.kind === 'day') {
    return <div className="timeline-day">{i18n.dayHeading(item.ts, now)}</div>;
  }
  if (item.kind === 'awake') {
    return (
      <div className="timeline-row timeline-awake">
        <span className="timeline-time">{i18n.clock(item.ts)}</span>
        <span className="timeline-icon">☀️</span>
        <span className="timeline-main">
          <span className="timeline-title">{i18n.m.timeline.wokeUp}</span>
          <span className="timeline-sub">{fill(i18n.m.timeline.awakeFor, { d: i18n.duration(item.durationMs) })}</span>
        </span>
      </div>
    );
  }

  const { entry, type } = item;
  const running = type.kind === 'duration' && entry.endedAt === undefined;
  const details = describeEntry(entry, type, now, i18n);

  return (
    <button
      className={`timeline-row timeline-entry${running ? ' is-running' : ''}`}
      style={{ ['--type-color' as string]: type.color }}
      onClick={() => onSelect(entry)}
    >
      <span className="timeline-time">{i18n.clock(entry.startedAt)}</span>
      <span className="timeline-icon">{type.emoji}</span>
      <span className="timeline-main">
        <span className="timeline-title">
          {type.name}
          {details && <span className="timeline-details"> · {details}</span>}
        </span>
        {entry.note && <span className="timeline-note">{entry.note}</span>}
        {item.sincePreviousMs !== undefined && type.kind === 'point' && (
          <span className="timeline-sub">
            {fill(i18n.m.timeline.sinceLast, { d: i18n.duration(item.sincePreviousMs) })}
          </span>
        )}
      </span>
    </button>
  );
}

export function describeEntry(entry: Entry, type: ActivityType, now: number, i18n: I18n): string {
  const parts: string[] = [];
  if (type.kind === 'duration') {
    const dur = i18n.duration(entryDurationMs(entry, now));
    if (entry.endedAt === undefined) parts.push(fill(i18n.m.timeline.running, { d: dur }));
    else parts.push(`${i18n.clock(entry.startedAt)}–${i18n.clock(entry.endedAt)} (${dur})`);
  }
  for (const field of type.fields) {
    const value = entry.values[field.key];
    if (value === undefined || value === '') continue;
    if (field.type === 'choice') {
      parts.push(field.options?.find((o) => o.value === value)?.label ?? String(value));
    } else if (field.type === 'number') {
      parts.push(`${value}${field.unit ? ' ' + field.unit : ''}`);
    } else {
      parts.push(String(value));
    }
  }
  return parts.join(' · ');
}
