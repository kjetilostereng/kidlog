import { useRef, useState } from 'react';
import { LOCALES, isLocale, useI18n, fill, type Locale } from '../i18n';
import { useRepository } from '../hooks/useRepository';
import type { Backup } from '../storage/repository';
import { Screen } from './Screen';

interface Props {
  locale: Locale;
  onLocale: (locale: Locale) => void;
  onChildren: () => void;
  onTypes: () => void;
  onBack: () => void;
}

export function SettingsScreen({ locale, onLocale, onChildren, onTypes, onBack }: Props) {
  const i18n = useI18n();
  const repo = useRepository();
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const exportBackup = async () => {
    const backup = await repo.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kidlog-backup-${new Date(backup.exportedAt).toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importBackup = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as Backup;
      await repo.importBackup(parsed);
      setMessage(i18n.m.settings.importDone);
    } catch (err) {
      console.error(err);
      setMessage(i18n.m.settings.importFailed);
    }
  };

  return (
    <Screen title={i18n.m.settings.title} onBack={onBack}>
      <ul className="list">
        <li className="list-item">
          <button className="list-main" onClick={onChildren}>
            <span className="list-title">{i18n.m.settings.children}</span>
          </button>
        </li>
        <li className="list-item">
          <button className="list-main" onClick={onTypes}>
            <span className="list-title">{i18n.m.settings.activities}</span>
          </button>
        </li>
      </ul>

      <h2 className="section-title">{i18n.m.settings.language}</h2>
      <select
        value={locale}
        onChange={(e) => {
          if (isLocale(e.target.value)) onLocale(e.target.value);
        }}
      >
        {Object.entries(LOCALES).map(([key, value]) => (
          <option key={key} value={key}>
            {value.label}
          </option>
        ))}
      </select>

      <h2 className="section-title">{i18n.m.settings.backup}</h2>
      <p className="intro">{i18n.m.settings.storageNote}</p>
      <div className="form-actions">
        <button className="button secondary" onClick={exportBackup}>
          {i18n.m.settings.export}
        </button>
        <button className="button secondary" onClick={() => fileInput.current?.click()}>
          {i18n.m.settings.import}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importBackup(file);
            e.target.value = '';
          }}
        />
      </div>
      {message && <p className="intro">{message}</p>}

      <h2 className="section-title">{i18n.m.settings.about}</h2>
      <p className="intro">{fill(i18n.m.settings.version, { v: __APP_VERSION__ })}</p>
    </Screen>
  );
}
