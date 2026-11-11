import type { Transaction } from '@contadim/contracts';
import { formatBRL } from '@contadim/core';
import clsx from 'clsx';
import { useState } from 'react';

import { ConfirmDelete } from '../../components/ConfirmDelete';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Sheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api-client';
import { formatDayLabel } from '../../lib/dates';
import { useCategories } from '../categories/api';
import { CategoryIcon } from '../categories/CategoryIcon';
import { useDeletePurchase, useUpdatePurchase } from './api';

/**
 * Edição de uma compra no cartão a partir de uma parcela: categoria e descrição valem
 * para todas as parcelas. Excluir remove a compra inteira.
 */
export function PurchaseSheet({
  open,
  onClose,
  installment,
}: {
  open: boolean;
  onClose: () => void;
  installment: Transaction | null;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Compra no cartão">
      {installment && (
        <PurchaseForm key={installment.id} installment={installment} onDone={onClose} />
      )}
    </Sheet>
  );
}

function PurchaseForm({ installment, onDone }: { installment: Transaction; onDone: () => void }) {
  const toast = useToast();
  const cardId = installment.cardId!;
  const groupId = installment.installmentGroupId!;
  const { data: categories = [] } = useCategories();
  const update = useUpdatePurchase(cardId);
  const remove = useDeletePurchase(cardId);
  const [categoryId, setCategoryId] = useState(installment.categoryId);
  const [description, setDescription] = useState(installment.description ?? '');
  const [error, setError] = useState('');

  const total = installment.installmentTotal ?? 1;
  const message = (err: unknown) =>
    err instanceof ApiError ? err.message : 'Algo deu errado. Tente novamente';

  const onSave = async () => {
    setError('');
    try {
      await update.mutateAsync({ groupId, input: { categoryId, description } });
      toast.show('Compra atualizada');
      onDone();
    } catch (err) {
      setError(message(err));
    }
  };

  const onDelete = async () => {
    setError('');
    try {
      await remove.mutateAsync(groupId);
      toast.show(total > 1 ? 'Compra e parcelas excluídas' : 'Compra excluída');
      onDone();
    } catch (err) {
      setError(message(err));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <Alert>{error}</Alert>}
      <p className="text-sm text-stone-600">
        Comprado {formatDayLabel(installment.date).toLowerCase()} ·{' '}
        {total > 1
          ? `parcela ${installment.installmentNumber}/${total} de ${formatBRL(installment.amount)}`
          : `à vista, ${formatBRL(installment.amount)}`}
      </p>
      <TextField
        label="Descrição"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Ex.: mercado, farmácia"
      />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Categoria</legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categories
            .filter((category) => category.type === 'EXPENSE')
            .map((category) => (
              <button
                key={category.id}
                type="button"
                aria-pressed={categoryId === category.id}
                onClick={() => setCategoryId(category.id)}
                className={clsx(
                  'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-medium ring-1',
                  categoryId === category.id
                    ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-600'
                    : 'text-stone-700 ring-stone-200 hover:bg-stone-50',
                )}
              >
                <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                <span className="line-clamp-1">{category.name}</span>
              </button>
            ))}
        </div>
      </fieldset>
      {total > 1 && (
        <p className="text-sm text-stone-500">
          As mudanças valem para as {total} parcelas. Para mudar valor ou parcelas, exclua e lance
          de novo.
        </p>
      )}
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ConfirmDelete
          label={total > 1 ? 'Excluir compra e parcelas' : 'Excluir compra'}
          loading={remove.isPending}
          onConfirm={() => void onDelete()}
        />
        <Button loading={update.isPending} onClick={() => void onSave()}>
          Salvar
        </Button>
      </div>
    </div>
  );
}
