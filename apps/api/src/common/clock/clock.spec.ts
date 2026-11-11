import { describe, expect, it } from 'vitest';

import { todayIn } from './clock.js';

describe('todayIn', () => {
  it('usa o fuso informado, não o do servidor', () => {
    // 02:30 UTC de 10/11 ainda é 09/11 em São Paulo (UTC−3).
    const instant = new Date('2026-11-10T02:30:00Z');
    expect(todayIn('America/Sao_Paulo', instant)).toBe('2026-11-09');
    expect(todayIn('UTC', instant)).toBe('2026-11-10');
  });
});
