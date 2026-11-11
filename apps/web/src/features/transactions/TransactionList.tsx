import type { Transaction } from '@contadim/contracts';
import { CreditCard } from 'lucide-react';
import { useMemo } from 'react';

import { Money } from '../../components/Money';
import { formatDayLabel } from '../../lib/dates';
import { useAccounts } from '../accounts/api';
import { useCards } from '../cards/api';
import { useCategories } from '../categories/api';
import { CategoryIcon } from '../categories/CategoryIcon';

interface Section {
  key: string;
  title: string;
  icon?: 'card';
  items: Transaction[];
}

/**
 * Lançamentos do mês: os de conta agrupados por dia (mais recentes primeiro) e as
 * parcelas de cartão agrupadas por cartão, já que pertencem à fatura do mês.
 */
export function TransactionList({
  transactions,
  onSelect,
}: {
  transactions: Transaction[];
  onSelect: (transaction: Transaction) => void;
}) {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );
  const accountById = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const sections = useMemo(() => {
    const byDay = new Map<string, Transaction[]>();
    const byCard = new Map<string, Transaction[]>();
    for (const transaction of transactions) {
      const [groups, key] = transaction.cardId
        ? [byCard, transaction.cardId]
        : [byDay, transaction.date];
      const group = groups.get(key) ?? [];
      group.push(transaction);
      groups.set(key, group);
    }
    const result: Section[] = [...byDay.entries()].map(([date, items]) => ({
      key: date,
      title: formatDayLabel(date),
      items,
    }));
    for (const [cardId, items] of byCard) {
      result.push({
        key: `card-${cardId}`,
        title: `Cartão ${cardById.get(cardId)?.name ?? ''}`.trim(),
        icon: 'card',
        items,
      });
    }
    return result;
  }, [transactions, cardById]);

  return (
    <div className="flex flex-col gap-4">
      {sections.map((section) => (
        <section key={section.key} aria-label={section.title}>
          <h3 className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold tracking-wide text-stone-500 uppercase">
            {section.icon === 'card' && <CreditCard className="size-3.5" aria-hidden="true" />}
            {section.title}
          </h3>
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
            {section.items.map((transaction) => {
              const category = categoryById.get(transaction.categoryId);
              const account = transaction.accountId
                ? accountById.get(transaction.accountId)
                : undefined;
              const installment =
                transaction.cardId && (transaction.installmentTotal ?? 1) > 1
                  ? `${transaction.installmentNumber}/${transaction.installmentTotal}`
                  : null;
              const details = [
                transaction.description ? category?.name : null,
                account?.name,
                transaction.cardId
                  ? `compra ${formatDayLabel(transaction.date).toLowerCase()}`
                  : null,
              ].filter(Boolean);
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
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {transaction.description ?? category?.name ?? 'Lançamento'}
                        </span>
                        {installment && (
                          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600">
                            {installment}
                          </span>
                        )}
                      </span>
                      <span className="block truncate text-sm text-stone-500">
                        {details.join(' · ')}
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
