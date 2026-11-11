import type { Account, CreditCard } from '@contadim/contracts';
import { formatBRL, installmentSchedule, isValidIsoDate, MAX_INSTALLMENTS } from '@contadim/core';

import { formatMonthLabel } from '../../lib/dates';
import { LAST_ACCOUNT_KEY, LAST_SOURCE_KEY, storage } from '../../lib/storage';

/** "De onde sai o dinheiro" no lançamento rápido: uma conta ou um cartão. */
export type PaymentSource = { kind: 'account'; id: string } | { kind: 'card'; id: string };

export const encodeSource = (source: PaymentSource) => `${source.kind}:${source.id}`;

export function decodeSource(value: string): PaymentSource | null {
  const [kind, id] = value.split(':');
  return (kind === 'account' || kind === 'card') && id ? { kind, id } : null;
}

/** Última forma usada (se ainda existir); senão, a primeira conta (ou o primeiro cartão). */
export function defaultSource(accounts: Account[], cards: CreditCard[]): string {
  const exists = (value: string | null) => {
    const source = value ? decodeSource(value) : null;
    if (!source) return false;
    const list: { id: string }[] = source.kind === 'account' ? accounts : cards;
    return list.some((item) => item.id === source.id);
  };
  const last = storage.get(LAST_SOURCE_KEY);
  if (exists(last)) return last!;
  const lastAccount = storage.get(LAST_ACCOUNT_KEY);
  if (lastAccount && exists(`account:${lastAccount}`)) return `account:${lastAccount}`;
  if (accounts[0]) return encodeSource({ kind: 'account', id: accounts[0].id });
  return encodeSource({ kind: 'card', id: cards[0]!.id });
}

export const INSTALLMENT_OPTIONS = Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1);

/**
 * Prévia do parcelamento, calculada com a mesma regra da API.
 * Ex.: "12x de R$ 100,00 · 1ª na fatura de dezembro de 2026".
 */
export function installmentPreview(input: {
  card: CreditCard;
  amount: number;
  installments: number;
  date: string;
}): string | null {
  if (input.amount <= 0 || !isValidIsoDate(input.date)) return null;
  if (input.amount < input.installments) return 'Valor pequeno demais para tantas parcelas';
  const schedule = installmentSchedule({
    purchaseDate: input.date,
    totalCents: input.amount,
    installments: input.installments,
    cycle: { closingDay: input.card.closingDay, dueDay: input.card.dueDay },
  });
  const first = schedule[0]!;
  const rest = schedule.at(-1)!;
  const invoice = formatMonthLabel(first.invoiceMonth);
  if (input.installments === 1) return `Entra na fatura de ${invoice}`;
  // Centavos que sobram vão na 1ª parcela: "1ª de R$ 3,34 + 2x de R$ 3,33".
  const amounts =
    first.amount === rest.amount
      ? `${input.installments}x de ${formatBRL(first.amount)}`
      : `1ª de ${formatBRL(first.amount)} + ${input.installments - 1}x de ${formatBRL(rest.amount)}`;
  return `${amounts} · 1ª na fatura de ${invoice}`;
}
