import { describe, expect, it } from 'vitest';

import { fromDbDate, toDbDate } from './calendar-date.js';

describe('calendar-date', () => {
  it('faz ida e volta sem deslocar o dia', () => {
    for (const date of ['2026-01-01', '2026-11-09', '2024-02-29', '2026-12-31']) {
      expect(fromDbDate(toDbDate(date))).toBe(date);
    }
  });

  it('usa meia-noite UTC', () => {
    expect(toDbDate('2026-11-09').toISOString()).toBe('2026-11-09T00:00:00.000Z');
  });
});
