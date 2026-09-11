import { useEffect, useMemo, useState } from 'react';
import type { ActivityType, Child, Entry } from './domain/types';
import { buildBuiltinTypes } from './domain/defaults';
import { planQuickLog, planRestart } from './domain/actions';
import { DEFAULT_LOCALE, I18n, I18nContext, fill, isLocale, type Locale } from './i18n';
import { useRepository } from './hooks/useRepository';
import { useRepoQuery } from './hooks/useRepoQuery';
import { useNow } from './hooks/useNow';
import { useToast } from './ui/Toast';
import { HomeScreen } from './ui/HomeScreen';
import { EntryEditor } from './ui/EntryEditor';
import { ChildrenScreen } from './ui/ChildrenScreen';
import { TypesScreen } from './ui/TypesScreen';
import { SettingsScreen } from './ui/SettingsScreen';
import { RestartDialog } from './ui/RestartDialog';

type View =
  | { name: 'home' }
  | { name: 'settings' }
  | { name: 'children' }
  | { name: 'types' }
  | { name: 'entry-edit'; entryId: string }
  | { name: 'entry-new'; typeId?: string };

export function App() {
  const repo = useRepository();
  const toast = useToast();
  const now = useNow();
  const [view, setView] = useState<View>({ name: 'home' });
  const [restart, setRestart] = useState<{ type: ActivityType; open: Entry } | null>(null);

  const settings = useRepoQuery((r) => r.getSettings(), []);
  const children = useRepoQuery((r) => r.listChildren(), []);
  const types = useRepoQuery((r) => r.listActivityTypes(), []);

  const locale: Locale = settings.data && isLocale(settings.data.locale) ? settings.data.locale : DEFAULT_LOCALE;
  const i18n = useMemo(() => new I18n(locale), [locale]);

  // Seed the standard activity types on first run.
  useEffect(() => {
    if (types.loading || !types.data || types.data.length > 0 || settings.loading) return;
    void repo.saveActivityTypes(buildBuiltinTypes(i18n.builtinLabels(), Date.now()));
  }, [repo, types.loading, types.data, settings.loading, i18n]);

  // Make sure there is always an active child when one exists.
  const activeChild: Child | undefined = useMemo(() => {
    const list = children.data ?? [];
    return list.find((c) => c.id === settings.data?.activeChildId) ?? list[0];
  }, [children.data, settings.data?.activeChildId]);

  useEffect(() => {
    if (activeChild && settings.data && settings.data.activeChildId !== activeChild.id) {
      void repo.saveSettings({ activeChildId: activeChild.id });
    }
  }, [repo, activeChild, settings.data]);

  const entries = useRepoQuery(
    (r) => (activeChild ? r.listEntries({ childId: activeChild.id }) : Promise.resolve([] as Entry[])),
    [activeChild?.id],
  );

  const loading = settings.loading || children.loading || types.loading;
  if (loading || !types.data) {
    return <div className="loading" />;
  }

  const childList = children.data ?? [];
  const typeList = types.data;
  const entryList = entries.data ?? [];

  const saveChild = async (child: Child) => {
    await repo.saveChild(child);
    if (!settings.data?.activeChildId) await repo.saveSettings({ activeChildId: child.id });
  };

  if (!activeChild) {
    return (
      <I18nContext.Provider value={i18n}>
        <ChildrenScreen
          children={childList}
          now={now}
          onboarding
          onSave={(c) => void saveChild(c)}
          onSelect={() => {}}
          onDelete={() => {}}
        />
      </I18nContext.Provider>
    );
  }

  const quickLog = async (type: ActivityType) => {
    const t = Date.now();
    const plan = planQuickLog(type, activeChild.id, entryList, t);
    const previous = plan.action === 'stop' ? entryList.find((e) => e.id === plan.entry.id) : undefined;
    await repo.saveEntry(plan.entry);

    const clock = i18n.clock(plan.action === 'stop' ? (plan.entry.endedAt ?? t) : plan.entry.startedAt);
    const text =
      plan.action === 'log-point'
        ? fill(i18n.m.home.logged, { name: type.name, t: clock })
        : plan.action === 'start'
          ? fill(i18n.m.home.started, { name: type.name, t: clock })
          : fill(i18n.m.home.stopped, { name: type.name, t: clock });

    toast({
      text,
      actions: [
        {
          label: i18n.m.common.undo,
          onClick: () => {
            if (plan.action === 'stop' && previous) void repo.saveEntry(previous);
            else void repo.deleteEntry(plan.entry.id);
          },
        },
        { label: i18n.m.common.details, onClick: () => setView({ name: 'entry-edit', entryId: plan.entry.id }) },
      ],
    });
  };

  const confirmRestart = async (wokeAt: number) => {
    if (!restart) return;
    const { closed, started } = planRestart(restart.open, wokeAt, Date.now());
    await repo.saveEntries([closed, started]);
    setRestart(null);
  };

  const setLocale = (next: Locale) => void repo.saveSettings({ locale: next });

  let screen: React.ReactNode;
  switch (view.name) {
    case 'settings':
      screen = (
        <SettingsScreen
          locale={locale}
          onLocale={setLocale}
          onChildren={() => setView({ name: 'children' })}
          onTypes={() => setView({ name: 'types' })}
          onBack={() => setView({ name: 'home' })}
        />
      );
      break;
    case 'children':
      screen = (
        <ChildrenScreen
          children={childList}
          activeChildId={activeChild.id}
          now={now}
          onSave={(c) => void saveChild(c)}
          onSelect={(id) => {
            void repo.saveSettings({ activeChildId: id });
            setView({ name: 'home' });
          }}
          onDelete={(id) => {
            void repo.deleteChild(id);
            void repo.saveSettings({ activeChildId: undefined });
            setView({ name: 'home' });
          }}
          onBack={() => setView({ name: 'settings' })}
        />
      );
      break;
    case 'types':
      screen = (
        <TypesScreen
          types={typeList}
          now={now}
          onSaveMany={(ts) => void repo.saveActivityTypes(ts)}
          onBack={() => setView({ name: 'settings' })}
        />
      );
      break;
    case 'entry-edit':
    case 'entry-new': {
      const existing = view.name === 'entry-edit' ? entryList.find((e) => e.id === view.entryId) : undefined;
      if (view.name === 'entry-edit' && !existing) {
        screen = null;
        setTimeout(() => setView({ name: 'home' }), 0);
        break;
      }
      screen = (
        <EntryEditor
          key={view.name === 'entry-edit' ? view.entryId : `new-${view.typeId ?? ''}`}
          childId={activeChild.id}
          types={typeList}
          entries={entryList}
          entry={existing}
          initialTypeId={view.name === 'entry-new' ? view.typeId : undefined}
          now={now}
          onSave={(e) => {
            void repo.saveEntry(e);
            setView({ name: 'home' });
          }}
          onDelete={(e) => {
            void repo.deleteEntry(e.id);
            setView({ name: 'home' });
          }}
          onBack={() => setView({ name: 'home' })}
        />
      );
      break;
    }
    default:
      screen = (
        <HomeScreen
          child={activeChild}
          childCount={childList.length}
          types={typeList}
          entries={entryList}
          now={now}
          onQuickLog={(t) => void quickLog(t)}
          onLongPress={(t) => setView({ name: 'entry-new', typeId: t.id })}
          onRestart={(type, open) => setRestart({ type, open })}
          onSelectEntry={(e) => setView({ name: 'entry-edit', entryId: e.id })}
          onAddEntry={() => setView({ name: 'entry-new' })}
          onSettings={() => setView({ name: 'settings' })}
          onSwitchChild={() => setView({ name: 'children' })}
        />
      );
  }

  return (
    <I18nContext.Provider value={i18n}>
      {screen}
      {restart && (
        <RestartDialog
          child={activeChild}
          open={restart.open}
          now={Date.now()}
          onConfirm={(wokeAt) => void confirmRestart(wokeAt)}
          onCancel={() => setRestart(null)}
        />
      )}
    </I18nContext.Provider>
  );
}
