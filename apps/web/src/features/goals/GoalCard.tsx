import type { Goal } from '@contadim/contracts';
import { formatBRL } from '@contadim/core';
import clsx from 'clsx';

import { CategoryIcon } from '../categories/CategoryIcon';
import { planText, STATUS_LABELS } from './goal-text';

const STATUS_STYLES = {
  IN_PROGRESS: 'bg-sky-100 text-sky-800',
  ACHIEVED: 'bg-emerald-100 text-emerald-800',
  OVERDUE: 'bg-rose-100 text-rose-800',
  NO_DEADLINE: 'bg-stone-100 text-stone-700',
} as const;

/** Meta com ícone, progresso, valores e o plano mensal. */
export function GoalCard({ goal, large = false }: { goal: Goal; large?: boolean }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <div className="flex items-center gap-3">
        <CategoryIcon icon={goal.icon} color={goal.color} />
        <div className="min-w-0 flex-1">
          <p className={clsx('truncate font-semibold', large && 'text-lg')}>{goal.name}</p>
          <p className="tabular text-sm text-stone-600">
            {formatBRL(goal.saved)} de {formatBRL(goal.targetAmount)}
          </p>
        </div>
        <span
          className={clsx(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            STATUS_STYLES[goal.status],
          )}
        >
          {STATUS_LABELS[goal.status]}
        </span>
      </div>

      <div
        className={clsx('mt-3 overflow-hidden rounded-full bg-stone-100', large ? 'h-3' : 'h-2')}
        role="progressbar"
        aria-label={`${goal.name}: ${goal.percent}% guardado`}
        aria-valuenow={goal.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${goal.percent}%`, backgroundColor: goal.color }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-sm">
        <span className="text-stone-700">{planText(goal)}</span>
        <span className="tabular shrink-0 font-semibold text-stone-500">
          {goal.percent.toLocaleString('pt-BR')}%
        </span>
      </div>
    </div>
  );
}
