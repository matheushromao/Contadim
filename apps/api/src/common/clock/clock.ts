import type { IsoDate } from '@contadim/core';

/**
 * Fonte de "hoje" da aplicação. Injetável para que regras dependentes de data
 * (fatura atual, vencimento) sejam testáveis com uma data fixa.
 */
export interface Clock {
  /** Data de hoje (`YYYY-MM-DD`) no fuso da aplicação. */
  today(): IsoDate;
}

export const CLOCK = Symbol('CLOCK');

/** "Hoje" em um fuso IANA, independente do fuso do servidor. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  // en-CA formata como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export class SystemClock implements Clock {
  constructor(private readonly timeZone: string) {}

  today(): IsoDate {
    return todayIn(this.timeZone);
  }
}

export class FixedClock implements Clock {
  constructor(private readonly date: IsoDate) {}

  today(): IsoDate {
    return this.date;
  }
}
