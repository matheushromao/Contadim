import type { Transaction } from '@contadim/contracts';
import type { EntryType } from '@contadim/core';
import clsx from 'clsx';
import { useState } from 'react';

import { MonthNavigator } from '../../components/MonthNavigator';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui/States';
import { useMonthParam } from '../../lib/use-month-param';
import { useMonthTransactions } from './api';
import { EditTransactionSheet } from './EditTransactionSheet';
import { TransactionList } from './TransactionList';

const FILTERS: { label: string; value: EntryType | undefined }[] = [
  { label: 'Todos', value: undefined },
  { label: 'Despesas', value: 'EXPENSE' },
  { label: 'Receitas', value: 'INCOME' },
];

export function TransactionsPage() {
  const [month, setMonth] = useMonthParam();
  const [type, setType] = useState<EntryType | undefined>(undefined);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const transactions = useMonthTransactions(month, type);

  return (
    <section>
      <PageHeader title="Lançamentos" />
      <MonthNavigator month={month} onChange={setMonth} />

      <div className="mt-3 mb-4 flex gap-2" role="group" aria-label="Filtrar por tipo">
        {FILTERS.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={type === filter.value}
            onClick={() => setType(filter.value)}
            className={clsx(
              'rounded-full px-3.5 py-1.5 text-sm font-medium ring-1',
              type === filter.value
                ? 'bg-stone-900 text-white ring-stone-900'
                : 'bg-white text-stone-700 ring-stone-200',
            )}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {transactions.isPending ? (
        <LoadingState />
      ) : transactions.isError ? (
        <ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} />
      ) : transactions.data.length === 0 ? (
        <EmptyState emoji="🗒️" title="Nada por aqui neste mês">
          Toque no <strong>+</strong> para anotar um gasto ou uma entrada.
        </EmptyState>
      ) : (
        <TransactionList transactions={transactions.data} onSelect={setEditing} />
      )}

      <EditTransactionSheet transaction={editing} onClose={() => setEditing(null)} />
    </section>
  );
}
