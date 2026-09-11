import { createContext, useContext } from 'react';
import type { Repository } from '../storage/repository';

export const RepositoryContext = createContext<Repository | null>(null);

export function useRepository(): Repository {
  const repo = useContext(RepositoryContext);
  if (!repo) throw new Error('RepositoryContext is not provided');
  return repo;
}
