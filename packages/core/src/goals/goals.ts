import { type IsoDate, monthDiff, toYearMonth } from '../dates/dates';
import { assertCents, type Cents, sumCents } from '../money/money';

/** Movimentação de uma meta: guardar (depósito) ou tirar (resgate) dinheiro. */
export const GoalMovementType = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
} as const;

export type GoalMovementType = (typeof GoalMovementType)[keyof typeof GoalMovementType];

export const GOAL_MOVEMENT_TYPES = [GoalMovementType.DEPOSIT, GoalMovementType.WITHDRAWAL] as const;

export const SavingPlanStatus = {
  /** Com prazo, ainda guardando. */
  IN_PROGRESS: 'IN_PROGRESS',
  /** Valor-alvo atingido. */
  ACHIEVED: 'ACHIEVED',
  /** O prazo passou e o valor-alvo não foi atingido. */
  OVERDUE: 'OVERDUE',
  /** Meta sem prazo: só acompanha o progresso. */
  NO_DEADLINE: 'NO_DEADLINE',
} as const;

export type SavingPlanStatus = (typeof SavingPlanStatus)[keyof typeof SavingPlanStatus];

export const SAVING_PLAN_STATUSES = Object.values(SavingPlanStatus) as [
  SavingPlanStatus,
  ...SavingPlanStatus[],
];

/** Saldo guardado na meta: depósitos − resgates. */
export function goalBalance(
  movements: readonly { type: GoalMovementType; amount: Cents }[],
): Cents {
  return sumCents(
    movements.map(({ type, amount }) => (type === GoalMovementType.DEPOSIT ? amount : -amount)),
  );
}

export interface GoalProgress {
  /** Quanto falta (nunca negativo). */
  remaining: Cents;
  /** Progresso de 0 a 100, com uma casa decimal (limitado a 100). */
  percent: number;
  achieved: boolean;
}

export function goalProgress({ target, saved }: { target: Cents; saved: Cents }): GoalProgress {
  assertCents(target);
  assertCents(saved);
  if (target <= 0) throw new RangeError('O valor-alvo deve ser maior que zero');
  const percent = Math.min(100, Math.max(0, Math.floor((saved * 1000) / target) / 10));
  return { remaining: Math.max(0, target - saved), percent, achieved: saved >= target };
}

export interface SavingPlan {
  status: SavingPlanStatus;
  /** Meses considerados no plano (`null` sem prazo). */
  monthsLeft: number | null;
  /** Quanto guardar por mês (`null` sem prazo). Arredondado para cima no centavo. */
  monthlyAmount: Cents | null;
}

/**
 * Quanto guardar por mês para atingir a meta no prazo.
 *
 * Os meses vão do mês atual até o mês do prazo (inclusive). Se já houve depósito no mês
 * atual, ele não conta mais: o plano começa no mês seguinte. Ex.: faltam R$ 1.200, prazo em
 * março e hoje é novembro → 5 meses de R$ 240 (ou 4 de R$ 300, se já guardou em novembro).
 */
export function savingPlan(input: {
  target: Cents;
  saved: Cents;
  deadline?: IsoDate | null;
  today: IsoDate;
  /** Depósitos − resgates feitos no mês atual. */
  savedThisMonth: Cents;
}): SavingPlan {
  const { remaining, achieved } = goalProgress(input);
  if (achieved) return { status: SavingPlanStatus.ACHIEVED, monthsLeft: 0, monthlyAmount: 0 };
  if (!input.deadline) {
    return { status: SavingPlanStatus.NO_DEADLINE, monthsLeft: null, monthlyAmount: null };
  }
  if (input.today > input.deadline) {
    return { status: SavingPlanStatus.OVERDUE, monthsLeft: 0, monthlyAmount: remaining };
  }

  const monthsUntilDeadline = monthDiff(toYearMonth(input.today), toYearMonth(input.deadline));
  const monthsLeft = Math.max(1, monthsUntilDeadline + (input.savedThisMonth > 0 ? 0 : 1));
  return {
    status: SavingPlanStatus.IN_PROGRESS,
    monthsLeft,
    monthlyAmount: Math.ceil(remaining / monthsLeft),
  };
}
