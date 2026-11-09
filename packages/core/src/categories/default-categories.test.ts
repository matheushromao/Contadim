import { describe, expect, it } from 'vitest';

import { DEFAULT_CATEGORIES } from './default-categories';

describe('DEFAULT_CATEGORIES', () => {
  it('não tem nomes repetidos dentro do mesmo tipo', () => {
    const keys = DEFAULT_CATEGORIES.map((category) => `${category.type}:${category.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('usa cores hexadecimais válidas', () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(category.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('tem categorias de receita e de despesa', () => {
    expect(DEFAULT_CATEGORIES.some((category) => category.type === 'INCOME')).toBe(true);
    expect(DEFAULT_CATEGORIES.some((category) => category.type === 'EXPENSE')).toBe(true);
  });
});
