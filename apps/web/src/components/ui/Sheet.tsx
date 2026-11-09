import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/**
 * Painel modal: sobe de baixo no celular (bottom sheet) e vira um diálogo central no desktop.
 * Fecha com Esc ou tocando fora.
 */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-stone-900/40" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-xl md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:pb-6"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-stone-200 md:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-bold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
