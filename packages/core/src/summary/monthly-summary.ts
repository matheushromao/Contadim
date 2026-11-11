import { EntryType } from '../domain/enums';
import { assertCents, type Cents, sumCents } from '../money/money';

/** Total já agregado (normalmente pelo banco) de um tipo + categoria em um período. */
export interface CategoryTotalRow {
  type: EntryType;
  categoryId: string;
  total: Cents;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  total: Cents;
  /** Participação no total do tipo, em %, com uma casa decimal. A soma dá exatamente 100. */
  percent: number;
}

export interface MonthlySummary {
  totalIncome: Cents;
  totalExpense: Cents;
  /** Receitas menos despesas. Pode ser negativo. */
  balance: Cents;
  expensesByCategory: CategoryBreakdownItem[];
  incomesByCategory: CategoryBreakdownItem[];
}

/**
 * Distribui 100% (em décimos: 1000) proporcionalmente aos valores, usando o método
 * do maior resto, para que a soma dos percentuais arredondados seja exatamente 100.
 */
export function distributePercentages(values: readonly Cents[]): number[] {
  const total = sumCents(values);
  if (total <= 0) return values.map(() => 0);

  const SCALE = 1000;
  const exact = values.map((value) => (value * SCALE) / total);
  const floors = exact.map(Math.floor);
  let remaining = SCALE - floors.reduce((acc, value) => acc + value, 0);

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);

  for (const { index } of byRemainder) {
    if (remaining <= 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    remaining -= 1;
  }

  return floors.map((tenths) => tenths / 10);
}

function breakdown(rows: CategoryTotalRow[]): CategoryBreakdownItem[] {
  const totals = new Map<string, Cents>();
  for (const row of rows) {
    totals.set(row.categoryId, (totals.get(row.categoryId) ?? 0) + row.total);
  }

  const entries = [...totals.entries()]
    .filter(([, total]) => total > 0)
    .sort(([idA, a], [idB, b]) => b - a || idA.localeCompare(idB));
  const percents = distributePercentages(entries.map(([, total]) => total));

  return entries.map(([categoryId, total], index) => ({
    categoryId,
    total,
    percent: percents[index] ?? 0,
  }));
}

/**
 * Monta o resumo do mês a partir dos totais agregados por tipo e categoria.
 * As categorias de cada tipo saem ordenadas do maior para o menor total.
 */
export function buildMonthlySummary(rows: readonly CategoryTotalRow[]): MonthlySummary {
  for (const row of rows) {
    assertCents(row.total);
    if (row.total < 0) {
      throw new RangeError(`Total negativo para a categoria ${row.categoryId}`);
    }
  }

  const expenses = rows.filter((row) => row.type === EntryType.EXPENSE);
  const incomes = rows.filter((row) => row.type === EntryType.INCOME);
  const totalIncome = sumCents(incomes.map((row) => row.total));
  const totalExpense = sumCents(expenses.map((row) => row.total));

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    expensesByCategory: breakdown(expenses),
    incomesByCategory: breakdown(incomes),
  };
}

/**
 * Saldo atual de uma conta:
 * saldo inicial + receitas − despesas − pagamentos de fatura − depósitos em metas + resgates.
 * Pagamentos de fatura e dinheiro guardado em metas reduzem o saldo, mas não são despesa.
 */
export function computeAccountBalance(input: {
  initialBalance: Cents;
  totalIncome: Cents;
  totalExpense: Cents;
  totalInvoicePayments?: Cents;
  totalGoalDeposits?: Cents;
  totalGoalWithdrawals?: Cents;
}): Cents {
  return sumCents([
    input.initialBalance,
    input.totalIncome,
    -input.totalExpense,
    -(input.totalInvoicePayments ?? 0),
    -(input.totalGoalDeposits ?? 0),
    input.totalGoalWithdrawals ?? 0,
  ]);
}
