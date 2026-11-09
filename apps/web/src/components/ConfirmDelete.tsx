import { useState } from 'react';

import { Button } from './ui/Button';

/** Exclusão em dois toques, sem `window.confirm` (que bloqueia a página). */
export function ConfirmDelete({
  label,
  onConfirm,
  loading,
}: {
  label: string;
  onConfirm: () => void;
  loading?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="ghost" className="text-rose-600" onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-stone-600">Tem certeza?</span>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Não
      </Button>
      <Button variant="danger" loading={loading ?? false} onClick={onConfirm}>
        Sim, excluir
      </Button>
    </div>
  );
}
