import { useEffect, useState } from 'react';

/**
 * Current time, refreshed on an interval and immediately when the app
 * becomes visible again, so timers are right the moment the app is reopened.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const id = window.setInterval(update, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', update);
    };
  }, [intervalMs]);
  return now;
}
