import { describe, expect, it } from 'vitest';

import {
  availableLimit,
  invoiceRemaining,
  invoiceStatus,
  outstandingAmount,
} from './invoice-status';

const dates = { closingDate: '2026-12-03', dueDate: '2026-12-10' };

describe('invoiceStatus', () => {
  it.each([
    ['antes do fechamento', { total: 5000, paid: 0, today: '2026-12-02' }, 'OPEN'],
    [
      'aberta mesmo se já houver pagamento',
      { total: 5000, paid: 5000, today: '2026-11-20' },
      'OPEN',
    ],
    ['no dia do fechamento', { total: 5000, paid: 0, today: '2026-12-03' }, 'CLOSED'],
    ['paga em parte', { total: 5000, paid: 2000, today: '2026-12-05' }, 'PARTIALLY_PAID'],
    ['quitada', { total: 5000, paid: 5000, today: '2026-12-05' }, 'PAID'],
    ['paga a mais', { total: 5000, paid: 6000, today: '2026-12-05' }, 'PAID'],
    ['zerada e fechada', { total: 0, paid: 0, today: '2026-12-05' }, 'PAID'],
    [
      'no dia do vencimento ainda no prazo',
      { total: 5000, paid: 0, today: '2026-12-10' },
      'CLOSED',
    ],
    ['vencida', { total: 5000, paid: 0, today: '2026-12-11' }, 'OVERDUE'],
    ['vencida com pagamento parcial', { total: 5000, paid: 100, today: '2026-12-11' }, 'OVERDUE'],
    ['quitada depois do vencimento', { total: 5000, paid: 5000, today: '2027-01-01' }, 'PAID'],
  ])('%s', (_label, input, expected) => {
    expect(invoiceStatus({ ...input, ...dates })).toBe(expected);
  });
});

describe('invoiceRemaining / outstandingAmount / availableLimit', () => {
  it('nunca deixa o restante negativo', () => {
    expect(invoiceRemaining(5000, 2000)).toBe(3000);
    expect(invoiceRemaining(5000, 9000)).toBe(0);
  });

  it('soma o que falta pagar em todas as faturas', () => {
    expect(
      outstandingAmount([
        { total: 10000, paid: 10000 },
        { total: 10000, paid: 4000 },
        { total: 10000, paid: 0 },
        // Pagar a mais numa fatura não libera limite das outras.
        { total: 1000, paid: 5000 },
      ]),
    ).toBe(16000);
  });

  it('calcula o limite disponível, que pode ficar negativo', () => {
    expect(availableLimit(500000, 16000)).toBe(484000);
    expect(availableLimit(10000, 15000)).toBe(-5000);
  });
});
