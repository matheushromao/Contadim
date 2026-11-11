import type { Goal } from '@contadim/contracts';
import { formatBRL, type GoalMovementType } from '@contadim/core';
import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, Pencil, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';

import { Money } from '../../components/Money';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { ApiError } from '../../lib/api-client';
import { formatDayLabel } from '../../lib/dates';
import { useAccounts } from '../accounts/api';
import { useDeleteGoalMovement, useGoal, useGoalMovements } from './api';
import { GoalCard } from './GoalCard';
import { GoalFormSheet } from './GoalFormSheet';
import { GoalMovementSheet } from './GoalMovementSheet';

export function GoalDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const goal = useGoal(id);
  const [editing, setEditing] = useState(false);
  const [moving, setMoving] = useState<GoalMovementType | null>(null);

  if (goal.isPending) return <LoadingState />;
  if (goal.isError) return <ErrorState error={goal.error} onRetry={() => void goal.refetch()} />;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link
          to="/metas"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Metas
        </Link>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Button>
      </div>

      <GoalCard goal={goal.data} large />

      {goal.data.savedThisMonth > 0 && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Neste mês você já guardou <strong>{formatBRL(goal.data.savedThisMonth)}</strong>. Mandou
          bem! 👏
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button onClick={() => setMoving('DEPOSIT')}>
          <ArrowDownToLine className="size-4" aria-hidden="true" />
          Guardar
        </Button>
        <Button
          variant="secondary"
          disabled={goal.data.saved === 0}
          onClick={() => setMoving('WITHDRAWAL')}
        >
          <ArrowUpFromLine className="size-4" aria-hidden="true" />
          Resgatar
        </Button>
      </div>

      <History goal={goal.data} />

      <GoalMovementSheet goal={goal.data} type={moving} onClose={() => setMoving(null)} />
      <GoalFormSheet
        open={editing}
        onClose={() => setEditing(false)}
        goal={goal.data}
        onDeleted={() => void navigate('/metas', { replace: true })}
      />
    </section>
  );
}

function History({ goal }: { goal: Goal }) {
  const toast = useToast();
  const movements = useGoalMovements(goal.id);
  const { data: accounts = [] } = useAccounts();
  const remove = useDeleteGoalMovement(goal.id);
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? '';

  const undo = (movementId: string) =>
    remove.mutate(movementId, {
      onSuccess: () => toast.show('Movimentação desfeita'),
      onError: (error) =>
        toast.show(error instanceof ApiError ? error.message : 'Não foi possível desfazer'),
    });

  return (
    <div>
      <h2 className="mb-2 font-semibold">Histórico</h2>
      {movements.isPending ? (
        <LoadingState />
      ) : movements.isError ? (
        <ErrorState error={movements.error} />
      ) : movements.data.length === 0 ? (
        <EmptyState emoji="🌱" title="Nada guardado ainda">
          Toque em <strong>Guardar</strong> para dar o primeiro passo.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
          {movements.data.map((movement) => {
            const isDeposit = movement.type === 'DEPOSIT';
            return (
              <li key={movement.id} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">
                    {isDeposit ? 'Guardado' : 'Resgatado'} · {formatDayLabel(movement.date)}
                  </span>
                  <span className="block truncate text-sm text-stone-500">
                    {[
                      `${isDeposit ? 'de' : 'para'} ${accountName(movement.accountId)}`,
                      movement.note,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <Money
                  cents={movement.amount}
                  type={isDeposit ? 'INCOME' : 'EXPENSE'}
                  className="font-semibold"
                />
                <button
                  type="button"
                  aria-label="Desfazer movimentação"
                  disabled={remove.isPending}
                  onClick={() => undo(movement.id)}
                  className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
                >
                  <Undo2 className="size-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
