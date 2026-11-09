/**
 * Valores monetários são SEMPRE representados em centavos, como inteiros.
 * Ex.: R$ 12,50 → 1250. Nunca use float para guardar ou somar dinheiro.
 */
export type Cents = number;

export class InvalidMoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMoneyError';
  }
}

/** Indica se o valor é um inteiro seguro (válido como centavos). */
export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Lança `InvalidMoneyError` se o valor não for um inteiro seguro. */
export function assertCents(value: unknown): asserts value is Cents {
  if (!isCents(value)) {
    throw new InvalidMoneyError(`Valor em centavos inválido: ${String(value)}`);
  }
}

/** "1.234" ou "1.234.567": pontos usados apenas como separador de milhar. */
const THOUSANDS_ONLY = /^\d{1,3}(\.\d{3})+$/;
const CURRENCY_PREFIX = /^R\$/i;

/**
 * Converte um texto digitado por uma pessoa em centavos, sem passar por float.
 *
 * Aceita formatos comuns no Brasil: `"12,50"`, `"R$ 1.234,56"`, `"1234"`, `"-3,5"`.
 * Também aceita ponto como separador decimal quando não há ambiguidade (`"12.5"`).
 * Um ponto seguido de exatamente três dígitos é tratado como milhar (`"1.234"` → 123400).
 *
 * @returns os centavos, ou `null` se o texto não representar um valor válido.
 */
export function parseMoney(input: string): Cents | null {
  let text = input.replace(/\s/g, '').replace(CURRENCY_PREFIX, '');
  let negative = false;
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).replace(CURRENCY_PREFIX, '');
  }
  if (text === '') return null;

  let integerPart: string;
  let decimalPart = '';

  if (text.includes(',')) {
    const pieces = text.split(',');
    if (pieces.length !== 2) return null;
    const [intRaw = '', dec = ''] = pieces;
    if (intRaw.includes('.') && !THOUSANDS_ONLY.test(intRaw)) return null;
    integerPart = intRaw.replace(/\./g, '');
    decimalPart = dec;
  } else if (THOUSANDS_ONLY.test(text)) {
    integerPart = text.replace(/\./g, '');
  } else if (text.includes('.')) {
    const pieces = text.split('.');
    if (pieces.length !== 2) return null;
    integerPart = pieces[0] ?? '';
    decimalPart = pieces[1] ?? '';
  } else {
    integerPart = text;
  }

  if (integerPart === '') integerPart = '0';
  if (!/^\d+$/.test(integerPart) || !/^\d{0,2}$/.test(decimalPart)) return null;

  const cents = Number(integerPart) * 100 + Number(decimalPart.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return negative && cents !== 0 ? -cents : cents;
}

/** Igual a `parseMoney`, mas lança `InvalidMoneyError` em vez de retornar `null`. */
export function toCents(input: string): Cents {
  const cents = parseMoney(input);
  if (cents === null) {
    throw new InvalidMoneyError(`Não foi possível entender o valor "${input}"`);
  }
  return cents;
}

/** Converte centavos em reais (apenas para exibição ou integração; não use para somar). */
export function fromCents(cents: Cents): number {
  assertCents(cents);
  return cents / 100;
}

const brlFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Formata centavos como moeda brasileira. Ex.: `formatBRL(1250)` → `"R$ 12,50"`. */
export function formatBRL(cents: Cents): string {
  assertCents(cents);
  return brlFormatter.format(cents / 100);
}

/** Soma uma lista de valores em centavos, validando cada item e o resultado. */
export function sumCents(values: Iterable<Cents>): Cents {
  let total = 0;
  for (const value of values) {
    assertCents(value);
    total += value;
  }
  assertCents(total);
  return total;
}
