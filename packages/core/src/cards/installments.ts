import { shiftMonth, type IsoDate, type YearMonth } from '../dates/dates';
import { assertCents, type Cents } from '../money/money';
import { type CardCycle, invoiceMonthFor } from './invoice-cycle';

export const MAX_INSTALLMENTS = 24;

/**
 * Divide um valor em parcelas iguais, sem perder centavos: o que sobra da divisão
 * vai na primeira parcela. Ex.: 1000 em 3x → `[334, 333, 333]`.
 */
export function splitInstallments(totalCents: Cents, installments: number): Cents[] {
  assertCents(totalCents);
  if (!Number.isInteger(installments) || installments < 1 || installments > MAX_INSTALLMENTS) {
    throw new RangeError(`Número de parcelas inválido: ${installments} (1–${MAX_INSTALLMENTS})`);
  }
  if (totalCents < installments) {
    throw new RangeError('O valor é pequeno demais para esse número de parcelas');
  }
  const base = Math.floor(totalCents / installments);
  const remainder = totalCents - base * installments;
  return Array.from({ length: installments }, (_, index) =>
    index === 0 ? base + remainder : base,
  );
}

export interface ScheduledInstallment {
  /** Número da parcela (1 = primeira). */
  number: number;
  amount: Cents;
  /** Fatura (mês de vencimento) em que a parcela é cobrada. */
  invoiceMonth: YearMonth;
}

/** Parcelas de uma compra no cartão: a 1ª na fatura da compra, as demais nos meses seguintes. */
export function installmentSchedule(input: {
  purchaseDate: IsoDate;
  totalCents: Cents;
  installments: number;
  cycle: CardCycle;
}): ScheduledInstallment[] {
  const firstInvoice = invoiceMonthFor(input.purchaseDate, input.cycle);
  return splitInstallments(input.totalCents, input.installments).map((amount, index) => ({
    number: index + 1,
    amount,
    invoiceMonth: shiftMonth(firstInvoice, index),
  }));
}
