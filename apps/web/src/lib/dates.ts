import {
  type IsoDate,
  isValidYearMonth,
  toIsoDate,
  toYearMonth,
  type YearMonth,
} from '@contadim/core';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** Mês atual (`YYYY-MM`) no calendário local. */
export function currentYearMonth(now: Date = new Date()): YearMonth {
  return toYearMonth(toIsoDate(now));
}

/** Hoje (`YYYY-MM-DD`) no calendário local. */
export function today(now: Date = new Date()): IsoDate {
  return toIsoDate(now);
}

/** `"2026-11"` → `"novembro de 2026"`. */
export function formatMonthLabel(month: YearMonth): string {
  return format(parseISO(`${month}-01`), "MMMM 'de' yyyy", { locale: ptBR });
}

/** `"2026-11-09"` → `"Hoje"`, `"Ontem"` ou `"segunda, 9 de nov"`. */
export function formatDayLabel(date: IsoDate, now: Date = new Date()): string {
  if (date === toIsoDate(now)) return 'Hoje';
  if (date === toIsoDate(subDays(now, 1))) return 'Ontem';
  return format(parseISO(date), "EEE, d 'de' MMM", { locale: ptBR });
}

/** Lê o mês da URL (`?mes=2026-11`), caindo no mês atual se inválido. */
export function parseMonthParam(value: string | null, now: Date = new Date()): YearMonth {
  return value && isValidYearMonth(value) ? value : currentYearMonth(now);
}
