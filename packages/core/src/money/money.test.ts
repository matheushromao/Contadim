import { describe, expect, it } from 'vitest';

import {
  assertCents,
  formatBRL,
  fromCents,
  InvalidMoneyError,
  isCents,
  parseMoney,
  sumCents,
  toCents,
} from './money';

/** Intl usa espaço não separável entre "R$" e o número. */
const normalizeSpaces = (text: string) => text.replace(/\s/g, ' ');

describe('parseMoney', () => {
  it.each([
    ['12,50', 1250],
    ['12,5', 1250],
    ['0,99', 99],
    [',99', 99],
    ['12', 1200],
    ['R$ 1.234,56', 123456],
    ['r$12,00', 1200],
    ['1.234', 123400],
    ['1.234.567,89', 123456789],
    ['12.5', 1250],
    ['12.50', 1250],
    ['  7,30  ', 730],
    ['-3,50', -350],
    ['-R$ 3,50', -350],
    ['0', 0],
    ['-0', 0],
  ])('converte "%s" em %i centavos', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(['', 'abc', '12,345', '1,2,3', '1.23.4', '12.345.6', '1.2,50', '--1', '12a', 'R$'])(
    'rejeita "%s"',
    (input) => {
      expect(parseMoney(input)).toBeNull();
    },
  );

  it('evita erros de ponto flutuante', () => {
    expect(parseMoney('0,29')).toBe(29);
    expect(parseMoney('19,99')).toBe(1999);
    expect(parseMoney('1,005')).toBeNull();
  });
});

describe('toCents', () => {
  it('converte texto válido', () => {
    expect(toCents('12,50')).toBe(1250);
  });

  it('lança erro em texto inválido', () => {
    expect(() => toCents('doze reais')).toThrow(InvalidMoneyError);
  });
});

describe('fromCents', () => {
  it('converte centavos em reais', () => {
    expect(fromCents(1250)).toBe(12.5);
    expect(fromCents(-1)).toBe(-0.01);
  });

  it('rejeita valores não inteiros', () => {
    expect(() => fromCents(12.5)).toThrow(InvalidMoneyError);
  });
});

describe('formatBRL', () => {
  it.each([
    [1250, 'R$ 12,50'],
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [123456789, 'R$ 1.234.567,89'],
    [-350, '-R$ 3,50'],
  ])('formata %i como "%s"', (cents, expected) => {
    expect(normalizeSpaces(formatBRL(cents))).toBe(expected);
  });

  it('rejeita floats', () => {
    expect(() => formatBRL(0.1)).toThrow(InvalidMoneyError);
  });
});

describe('isCents / assertCents', () => {
  it('aceita apenas inteiros seguros', () => {
    expect(isCents(10)).toBe(true);
    expect(isCents(-10)).toBe(true);
    expect(isCents(1.5)).toBe(false);
    expect(isCents(Number.NaN)).toBe(false);
    expect(isCents(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    expect(isCents('10')).toBe(false);
    expect(() => assertCents(1.1)).toThrow(InvalidMoneyError);
  });
});

describe('sumCents', () => {
  it('soma valores inteiros', () => {
    expect(sumCents([10, 20, 30])).toBe(60);
    expect(sumCents([])).toBe(0);
  });

  it('rejeita itens inválidos', () => {
    expect(() => sumCents([10, 0.5])).toThrow(InvalidMoneyError);
  });

  it('rejeita resultado fora do intervalo seguro', () => {
    expect(() => sumCents([Number.MAX_SAFE_INTEGER, 1])).toThrow(InvalidMoneyError);
  });
});
