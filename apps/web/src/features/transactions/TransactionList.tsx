import type { Transaction } from '@contadim/contracts';
import { useMemo } from 'react';

import { Money } from '../../components/Money';
import { formatDayLabel } from '../../lib/dates';
import { useAccounts } from '../accounts/api';
import { useCategories } from '../categories/api';
import { CategoryIcon } from '../categories/CategoryIcon';

/** Lançamentos agrupados por dia, do mais recente para o mais antigo. */
export function TransactionList({
  transactions,
  onSelect,
}: {
  transactions: Transaction[];
  onSelect: (transaction: Transaction) => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );

  const days = useMemo(() => {
    const groups = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const group = groups.get(transaction.date) ?? [];
      group.push(transaction);
      groups.set(transaction.date, group);
    }
    return [...groups.entries()];
  }, [transactions]);

  return (
    <div className="flex flex-col gap-4">
      {days.map(([date, items]) => (
        <section key={date} aria-label={formatDayLabel(date)}>
          <h3 className="mb-1.5 px-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {formatDayLabel(date)}
          </h3>
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
            {items.map((transaction) => {
              const category = categoryById.get(transaction.categoryId);
              const account = transaction.accountId
                ? accountById.get(transaction.accountId)
                : undefined;
              return (
                <li key={transaction.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(transaction)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                  >
                    <CategoryIcon
                      icon={category?.icon ?? 'circle-ellipsis'}
                      color={category?.color ?? '#64748B'}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {transaction.description ?? category?.name ?? 'Lançamento'}
                      </span>
                      <span className="block truncate text-sm text-stone-500">
                        {[transaction.description ? category?.name : null, account?.name]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <Money
                      cents={transaction.amount}
                      type={transaction.type}
                      className="font-semibold"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
