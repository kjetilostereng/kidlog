import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { useRepository } from './useRepository';
import type { Repository } from '../storage/repository';

export interface QueryState<T> {
  data: T | undefined;
  loading: boolean;
  reload: () => void;
}

/**
 * Runs a query against the repository and re-runs it whenever the
 * repository reports a write. Backend-agnostic, unlike Dexie's live queries.
 */
export function useRepoQuery<T>(query: (repo: Repository) => Promise<T>, deps: DependencyList): QueryState<T> {
  const repo = useRepository();
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    query(repo).then(
      (result) => {
        if (cancelled) return;
        setData(result);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo, tick, ...deps]);

  useEffect(() => repo.subscribe(reload), [repo, reload]);

  return { data, loading, reload };
}
