import { describe, expect, it } from 'vitest';

import {
  daysInMonth,
  isValidIsoDate,
  isValidYearMonth,
  monthRange,
  shiftMonth,
  toIsoDate,
  toYearMonth,
} from './dates';

describe('daysInMonth', () => {
  it('considera anos bissextos', () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe('isValidIsoDate', () => {
  it.each(['2026-11-09', '2024-02-29', '2026-12-31'])('aceita %s', (value) => {
    expect(isValidIsoDate(value)).toBe(true);
  });

  it.each(['2026-02-29', '2026-13-01', '2026-00-10', '2026-1-1', '09/11/2026', '2026-11-09T00:00'])(
    'rejeita %s',
    (value) => {
      expect(isValidIsoDate(value)).toBe(false);
    },
  );
});

describe('isValidYearMonth', () => {
  it('valida o formato YYYY-MM', () => {
    expect(isValidYearMonth('2026-11')).toBe(true);
    expect(isValidYearMonth('2026-13')).toBe(false);
    expect(isValidYearMonth('2026-1')).toBe(false);
  });
});

describe('monthRange', () => {
  it('retorna o primeiro e o último dia do mês', () => {
    expect(monthRange('2026-11')).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  });

  it('rejeita meses inválidos', () => {
    expect(() => monthRange('2026-13')).toThrow(RangeError);
  });
});

describe('shiftMonth', () => {
  it.each([
    ['2026-11', 1, '2026-12'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-05', 0, '2026-05'],
    ['2026-03', 24, '2028-03'],
    ['2026-03', -15, '2024-12'],
  ])('%s %+d → %s', (start, delta, expected) => {
    expect(shiftMonth(start, delta)).toBe(expected);
  });
});

describe('toYearMonth', () => {
  it('extrai o mês de uma data', () => {
    expect(toYearMonth('2026-11-09')).toBe('2026-11');
    expect(() => toYearMonth('2026-11')).toThrow(RangeError);
  });
});

describe('toIsoDate', () => {
  it('usa o calendário local', () => {
    expect(toIsoDate(new Date(2026, 10, 9, 23, 59))).toBe('2026-11-09');
    expect(toIsoDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01');
  });
});
