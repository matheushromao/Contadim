import type { IsoDate } from '@contadim/core';

/**
 * Colunas `DATE` do Postgres chegam no Prisma como `Date` à meia-noite UTC.
 * Estas funções convertem de/para `YYYY-MM-DD` sem depender do fuso do servidor.
 */
export function toDbDate(date: IsoDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}
