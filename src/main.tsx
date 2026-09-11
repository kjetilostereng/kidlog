import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './App';
import { RepositoryContext } from './hooks/useRepository';
import { DexieRepository } from './storage/dexieRepository';
import { ToastProvider } from './ui/Toast';
import './styles.css';

registerSW({ immediate: true });

const repository = new DexieRepository();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RepositoryContext.Provider value={repository}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </RepositoryContext.Provider>
  </StrictMode>,
);
