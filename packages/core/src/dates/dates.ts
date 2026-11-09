/**
 * Datas de lançamento são datas de calendário, sem horário nem fuso: `YYYY-MM-DD`.
 * Meses de referência usam o formato `YYYY-MM`.
 * Todas as funções trabalham com strings para evitar surpresas de fuso horário.
 */
export type IsoDate = string;
export type YearMonth = string;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEAR_MONTH = /^(\d{4})-(\d{2})$/;

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** Quantidade de dias de um mês (1–12), considerando anos bissextos. */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Verifica se o texto é uma data válida no formato `YYYY-MM-DD`. */
export function isValidIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

/** Verifica se o texto é um mês válido no formato `YYYY-MM`. */
export function isValidYearMonth(value: string): boolean {
  const match = YEAR_MONTH.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

function parseYearMonth(value: YearMonth): { year: number; month: number } {
  if (!isValidYearMonth(value)) {
    throw new RangeError(`Mês inválido: "${value}" (esperado YYYY-MM)`);
  }
  const [year, month] = value.split('-').map(Number) as [number, number];
  return { year, month };
}

/** Primeiro e último dia (inclusive) de um mês. Ex.: `"2026-02"` → `2026-02-01` a `2026-02-28`. */
export function monthRange(value: YearMonth): { from: IsoDate; to: IsoDate } {
  const { year, month } = parseYearMonth(value);
  return {
    from: `${pad(year, 4)}-${pad(month)}-01`,
    to: `${pad(year, 4)}-${pad(month)}-${pad(daysInMonth(year, month))}`,
  };
}

/** Avança ou volta meses. Ex.: `shiftMonth("2026-01", -1)` → `"2025-12"`. */
export function shiftMonth(value: YearMonth, delta: number): YearMonth {
  const { year, month } = parseYearMonth(value);
  const index = year * 12 + (month - 1) + delta;
  return `${pad(Math.floor(index / 12), 4)}-${pad((index % 12) + 1)}`;
}

/** Mês ao qual uma data pertence. Ex.: `"2026-11-09"` → `"2026-11"`. */
export function toYearMonth(date: IsoDate): YearMonth {
  if (!isValidIsoDate(date)) {
    throw new RangeError(`Data inválida: "${date}" (esperado YYYY-MM-DD)`);
  }
  return date.slice(0, 7);
}

/** Converte um `Date` em `YYYY-MM-DD` usando o calendário local de quem chama. */
export function toIsoDate(date: Date): IsoDate {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
