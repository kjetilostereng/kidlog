import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  text: string;
  actions?: ToastAction[];
  durationMs?: number;
}

const ToastContext = createContext<(toast: ToastMessage) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const timer = useRef<number | null>(null);

  const show = useCallback((next: ToastMessage) => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setToast(next);
    timer.current = window.setTimeout(() => setToast(null), next.durationMs ?? 6000);
  }, []);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-text">{toast.text}</span>
          {toast.actions?.map((a) => (
            <button
              key={a.label}
              className="toast-action"
              onClick={() => {
                setToast(null);
                a.onClick();
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
