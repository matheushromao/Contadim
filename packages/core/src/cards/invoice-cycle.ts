import {
  daysInMonth,
  type IsoDate,
  isValidIsoDate,
  shiftMonth,
  toYearMonth,
  type YearMonth,
} from '../dates/dates';

/**
 * Ciclo de fatura do cartão de crédito.
 *
 * - Cada fatura é identificada pelo **mês de vencimento** (`YYYY-MM`).
 * - O vencimento cai em `dueDay` do mês da fatura. O fechamento cai em `closingDay`
 *   do mesmo mês quando `closingDay < dueDay`; senão, no mês anterior.
 * - Compras feitas **a partir do dia do fechamento** (inclusive) vão para a fatura seguinte.
 * - Dias inexistentes no mês são ajustados para o último dia (31 em fevereiro → 28/29).
 */
export interface CardCycle {
  /** Dia do fechamento (1–31). */
  closingDay: number;
  /** Dia do vencimento (1–31). */
  dueDay: number;
}

export interface InvoiceDates {
  /** Primeiro dia de compras desta fatura (o fechamento anterior). */
  periodStart: IsoDate;
  /** Último dia de compras desta fatura (véspera do fechamento). */
  periodEnd: IsoDate;
  closingDate: IsoDate;
  dueDate: IsoDate;
}

const pad = (value: number) => String(value).padStart(2, '0');

function assertDay(name: string, day: number): void {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`${name} inválido: ${day} (esperado 1–31)`);
  }
}

function assertCycle({ closingDay, dueDay }: CardCycle): void {
  assertDay('Dia de fechamento', closingDay);
  assertDay('Dia de vencimento', dueDay);
}

/** Dia `day` do mês, limitado ao último dia existente. Ex.: (`"2026-02"`, 31) → `"2026-02-28"`. */
export function clampedDate(month: YearMonth, day: number): IsoDate {
  const [year, monthNumber] = month.split('-').map(Number) as [number, number];
  return `${month}-${pad(Math.min(day, daysInMonth(year, monthNumber)))}`;
}

function previousDay(date: IsoDate): IsoDate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const previous = new Date(Date.UTC(year, month - 1, day - 1));
  return previous.toISOString().slice(0, 10);
}

/** Em que mês fecha a fatura que vence em `invoiceMonth`. */
function closingMonthOf(invoiceMonth: YearMonth, { closingDay, dueDay }: CardCycle): YearMonth {
  return closingDay < dueDay ? invoiceMonth : shiftMonth(invoiceMonth, -1);
}

/** Datas de fechamento, vencimento e período de compras da fatura de `invoiceMonth`. */
export function invoiceDates(invoiceMonth: YearMonth, cycle: CardCycle): InvoiceDates {
  assertCycle(cycle);
  const closingMonth = closingMonthOf(invoiceMonth, cycle);
  const closingDate = clampedDate(closingMonth, cycle.closingDay);
  return {
    periodStart: clampedDate(shiftMonth(closingMonth, -1), cycle.closingDay),
    periodEnd: previousDay(closingDate),
    closingDate,
    dueDate: clampedDate(invoiceMonth, cycle.dueDay),
  };
}

/** Fatura (mês de vencimento) em que entra uma compra feita em `purchaseDate`. */
export function invoiceMonthFor(purchaseDate: IsoDate, cycle: CardCycle): YearMonth {
  assertCycle(cycle);
  if (!isValidIsoDate(purchaseDate)) {
    throw new RangeError(`Data inválida: "${purchaseDate}" (esperado YYYY-MM-DD)`);
  }
  const purchaseMonth = toYearMonth(purchaseDate);
  const closingThisMonth = clampedDate(purchaseMonth, cycle.closingDay);
  const closingMonth =
    purchaseDate < closingThisMonth ? purchaseMonth : shiftMonth(purchaseMonth, 1);
  return cycle.closingDay < cycle.dueDay ? closingMonth : shiftMonth(closingMonth, 1);
}
