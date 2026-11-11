import type { Transaction } from '@contadim/contracts';
import { invoiceDates, sumCents, type YearMonth } from '@contadim/core';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { Money } from '../../components/Money';
import { useCards } from '../cards/api';

/**
 * "Faturas do mês": quanto cada cartão cobra neste mês e quando vence.
 * Os valores vêm das parcelas do próprio mês (as compras no cartão contam pela fatura).
 */
export function MonthInvoices({
  month,
  transactions,
}: {
  month: YearMonth;
  transactions: Transaction[];
}) {
  const { data: cards = [] } = useCards();

  const invoices = cards
    .map((card) => {
      const charges = transactions.filter((transaction) => transaction.cardId === card.id);
      const { dueDate } = invoiceDates(month, { closingDay: card.closingDay, dueDay: card.dueDay });
      return { card, total: sumCents(charges.map((charge) => charge.amount)), dueDate };
    })
    .filter((invoice) => invoice.total > 0);

  if (invoices.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="mb-3 font-semibold">Faturas do mês</h2>
      <ul className="flex flex-col divide-y divide-stone-100">
        {invoices.map(({ card, total, dueDate }) => (
          <li key={card.id}>
            <Link
              to={`/cartoes/${card.id}?fatura=${month}`}
              className="flex items-center gap-3 py-2.5 hover:bg-stone-50"
            >
              <span
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: card.color }}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{card.name}</span>
                <span className="block text-sm text-stone-500">
                  Vence em {format(parseISO(dueDate), "d 'de' MMMM", { locale: ptBR })}
                </span>
              </span>
              <Money cents={total} className="font-semibold" />
              <ChevronRight className="size-4 text-stone-400" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
