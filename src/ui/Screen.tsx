import type { ReactNode } from 'react';
import { useI18n } from '../i18n';

interface Props {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
}

export function Screen({ title, onBack, right, children }: Props) {
  const i18n = useI18n();
  return (
    <div className="screen">
      <header className="topbar">
        {onBack ? (
          <button className="icon-button" onClick={onBack} aria-label={i18n.m.common.back}>
            ‹
          </button>
        ) : (
          <span className="icon-button" />
        )}
        <h1 className="topbar-title">{title}</h1>
        <span className="topbar-right">{right ?? <span className="icon-button" />}</span>
      </header>
      <div className="screen-body">{children}</div>
    </div>
  );
}
