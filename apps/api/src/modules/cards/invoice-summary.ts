import type { InvoiceSummary } from '@contadim/contracts';
import {
  type CardCycle,
  type IsoDate,
  invoiceDates,
  invoiceRemaining,
  invoiceStatus,
  type YearMonth,
} from '@contadim/core';

import type { InvoiceTotals } from './cards.repository.js';

/** Monta o resumo de uma fatura a partir das regras do core (reutilizado pelo módulo de faturas). */
export function buildInvoiceSummary(input: {
  cardId: string;
  cycle: CardCycle;
  month: YearMonth;
  totals: InvoiceTotals | undefined;
  today: IsoDate;
}): InvoiceSummary {
  const { total, paid } = input.totals ?? { total: 0, paid: 0 };
  const dates = invoiceDates(input.month, input.cycle);
  return {
    cardId: input.cardId,
    month: input.month,
    ...dates,
    total,
    paid,
    remaining: invoiceRemaining(total, paid),
    status: invoiceStatus({ total, paid, today: input.today, ...dates }),
  };
}
