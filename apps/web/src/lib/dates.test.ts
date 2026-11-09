import { describe, expect, it } from 'vitest';

import {
  currentYearMonth,
  formatDayLabel,
  formatMonthLabel,
  parseMonthParam,
  today,
} from './dates';

const now = new Date(2026, 10, 9, 14, 30);

describe('dates', () => {
  it('usa o calendário local para hoje e o mês atual', () => {
    expect(today(now)).toBe('2026-11-09');
    expect(currentYearMonth(now)).toBe('2026-11');
  });

  it('formata o mês por extenso', () => {
    expect(formatMonthLabel('2026-11')).toBe('novembro de 2026');
    expect(formatMonthLabel('2027-01')).toBe('janeiro de 2027');
  });

  it('usa "Hoje" e "Ontem" quando faz sentido', () => {
    expect(formatDayLabel('2026-11-09', now)).toBe('Hoje');
    expect(formatDayLabel('2026-11-08', now)).toBe('Ontem');
    expect(formatDayLabel('2026-11-02', now)).toBe('segunda, 2 de nov');
  });

  it('valida o mês vindo da URL', () => {
    expect(parseMonthParam('2026-03', now)).toBe('2026-03');
    expect(parseMonthParam('2026-13', now)).toBe('2026-11');
    expect(parseMonthParam(null, now)).toBe('2026-11');
  });
});
