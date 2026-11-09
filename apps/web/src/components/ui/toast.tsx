import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import { ToastContext } from './toast-context';

/** Avisos curtos e discretos ("Anotado! 📝"). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((next: string) => {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2500);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8"
      >
        {message && (
          <p className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
            {message}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}
