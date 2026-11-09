/** Tipo de um lançamento ou categoria: entrada (receita) ou saída (despesa) de dinheiro. */
export const EntryType = {
  INCOME: 'INCOME',
  EXPENSE: 'EXPENSE',
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];

export const ENTRY_TYPES = [EntryType.INCOME, EntryType.EXPENSE] as const;

/** Tipos de conta suportados. */
export const AccountType = {
  CHECKING: 'CHECKING',
  SAVINGS: 'SAVINGS',
  WALLET: 'WALLET',
} as const;

export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const ACCOUNT_TYPES = [
  AccountType.CHECKING,
  AccountType.SAVINGS,
  AccountType.WALLET,
] as const;
