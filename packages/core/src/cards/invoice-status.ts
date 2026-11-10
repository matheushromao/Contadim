import type { IsoDate } from '../dates/dates';
import { assertCents, type Cents, sumCents } from '../money/money';

export const InvoiceStatus = {
  /** Ainda recebendo compras (antes do fechamento). */
  OPEN: 'OPEN',
  /** Fechada, aguardando pagamento, dentro do prazo. */
  CLOSED: 'CLOSED',
  /** Fechada, com parte paga, dentro do prazo. */
  PARTIALLY_PAID: 'PARTIALLY_PAID',
  /** Fechada e quitada (inclui fatura zerada). */
  PAID: 'PAID',
  /** Venceu sem ser quitada. */
  OVERDUE: 'OVERDUE',
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const INVOICE_STATUSES = Object.values(InvoiceStatus) as [InvoiceStatus, ...InvoiceStatus[]];

/** Quanto falta pagar (nunca negativo: pagar a mais não "sobra" para outra fatura). */
export function invoiceRemaining(total: Cents, paid: Cents): Cents {
  assertCents(total);
  assertCents(paid);
  return Math.max(0, total - paid);
}

/** Situação da fatura em `today`. O dia do vencimento ainda está no prazo. */
export function invoiceStatus(input: {
  total: Cents;
  paid: Cents;
  today: IsoDate;
  closingDate: IsoDate;
  dueDate: IsoDate;
}): InvoiceStatus {
  const remaining = invoiceRemaining(input.total, input.paid);
  if (input.today < input.closingDate) return InvoiceStatus.OPEN;
  if (remaining === 0) return InvoiceStatus.PAID;
  if (input.today > input.dueDate) return InvoiceStatus.OVERDUE;
  return input.paid > 0 ? InvoiceStatus.PARTIALLY_PAID : InvoiceStatus.CLOSED;
}

/** Total ainda em aberto em um conjunto de faturas (inclui parcelas futuras). */
export function outstandingAmount(invoices: readonly { total: Cents; paid: Cents }[]): Cents {
  return sumCents(invoices.map(({ total, paid }) => invoiceRemaining(total, paid)));
}

/** Limite disponível. Pode ficar negativo quando o limite foi ultrapassado. */
export function availableLimit(limit: Cents, outstanding: Cents): Cents {
  assertCents(limit);
  assertCents(outstanding);
  return limit - outstanding;
}
