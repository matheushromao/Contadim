import type {
  CreateGoalData,
  CreateGoalMovementData,
  Goal as GoalDto,
  GoalMovement as GoalMovementDto,
  ListGoalMovementsQuery,
  ListGoalsQuery,
  Paginated,
  UpdateGoalData,
} from '@contadim/contracts';
import { formatBRL, goalProgress, savingPlan, toYearMonth } from '@contadim/core';
import { Inject, Injectable } from '@nestjs/common';

import { CLOCK, type Clock } from '../../common/clock/clock.js';
import { ConflictError, NotFoundError, UnprocessableError } from '../../common/errors/app-error.js';
import { paginate, toSkipTake } from '../../common/pagination/pagination.js';
import type { Goal, GoalMovement } from '../../generated/prisma/client.js';
import { fromDbDate } from '../../infra/prisma/calendar-date.js';
import { AccountsService } from '../accounts/accounts.service.js';
import { type GoalTotals, GoalsRepository } from './goals.repository.js';

const NO_TOTALS: GoalTotals = { saved: 0, savedThisMonth: 0 };

export function toGoalMovementDto(movement: GoalMovement): GoalMovementDto {
  return {
    id: movement.id,
    goalId: movement.goalId,
    accountId: movement.accountId,
    type: movement.type,
    amount: movement.amount,
    date: fromDbDate(movement.date),
    note: movement.note,
    createdAt: movement.createdAt.toISOString(),
  };
}

/** Metas de economia: progresso, plano mensal e movimentações (guardar/resgatar). */
@Injectable()
export class GoalsService {
  constructor(
    private readonly goals: GoalsRepository,
    private readonly accounts: AccountsService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async list(userId: string, query: ListGoalsQuery): Promise<Paginated<GoalDto>> {
    const { items, total } = await this.goals.list(userId, toSkipTake(query));
    const totals = await this.goals.totals(
      userId,
      items.map((goal) => goal.id),
      this.currentMonth(),
    );
    return paginate(
      items.map((goal) => this.toDto(goal, totals.get(goal.id))),
      total,
      query,
    );
  }

  async get(userId: string, id: string): Promise<GoalDto> {
    return this.withTotals(userId, await this.findOwned(userId, id));
  }

  async create(userId: string, input: CreateGoalData): Promise<GoalDto> {
    const goal = await this.goals.create(userId, { ...input, deadline: input.deadline ?? null });
    return this.toDto(goal, NO_TOTALS);
  }

  async update(userId: string, id: string, input: UpdateGoalData): Promise<GoalDto> {
    await this.findOwned(userId, id);
    return this.withTotals(userId, await this.goals.update(id, input));
  }

  /** Só exclui metas sem dinheiro guardado: o valor precisa voltar para uma conta antes. */
  async delete(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    const { saved } = await this.totalsOf(userId, id);
    if (saved > 0) {
      throw new ConflictError(
        `Ainda há ${formatBRL(saved)} guardados nesta meta. Resgate o valor antes de excluí-la`,
      );
    }
    await this.goals.delete(id);
  }

  async listMovements(
    userId: string,
    goalId: string,
    query: ListGoalMovementsQuery,
  ): Promise<Paginated<GoalMovementDto>> {
    await this.findOwned(userId, goalId);
    const { items, total } = await this.goals.listMovements(userId, goalId, toSkipTake(query));
    return paginate(items.map(toGoalMovementDto), total, query);
  }

  /** Guarda (depósito) ou resgata dinheiro. O resgate não pode passar do que está guardado. */
  async addMovement(
    userId: string,
    goalId: string,
    input: CreateGoalMovementData,
  ): Promise<GoalDto> {
    const goal = await this.findOwned(userId, goalId);
    await this.accounts.findOwned(userId, input.accountId);

    if (input.type === 'WITHDRAWAL') {
      const { saved } = await this.totalsOf(userId, goalId);
      if (input.amount > saved) {
        throw new UnprocessableError(
          saved === 0
            ? 'Ainda não há dinheiro guardado nesta meta'
            : `Você só pode resgatar até ${formatBRL(saved)}`,
          [{ path: 'amount', message: `No máximo ${formatBRL(saved)}` }],
        );
      }
    }

    await this.goals.createMovement(userId, goalId, input);
    return this.withTotals(userId, goal);
  }

  /** Desfaz uma movimentação, desde que a meta não fique com saldo negativo. */
  async deleteMovement(userId: string, goalId: string, movementId: string): Promise<void> {
    await this.findOwned(userId, goalId);
    const movement = await this.goals.findMovement(userId, goalId, movementId);
    if (!movement) throw new NotFoundError('Movimentação não encontrada');

    if (movement.type === 'DEPOSIT') {
      const { saved } = await this.totalsOf(userId, goalId);
      if (saved - movement.amount < 0) {
        throw new UnprocessableError(
          'Esse dinheiro já foi resgatado. Desfaça o resgate antes de desfazer este depósito',
        );
      }
    }
    await this.goals.deleteMovement(movement.id);
  }

  /** Garante que a meta existe e pertence à pessoa. */
  async findOwned(userId: string, id: string): Promise<Goal> {
    const goal = await this.goals.findById(userId, id);
    if (!goal) throw new NotFoundError('Meta não encontrada');
    return goal;
  }

  private currentMonth() {
    return toYearMonth(this.clock.today());
  }

  private async totalsOf(userId: string, goalId: string): Promise<GoalTotals> {
    return (
      (await this.goals.totals(userId, [goalId], this.currentMonth())).get(goalId) ?? NO_TOTALS
    );
  }

  private async withTotals(userId: string, goal: Goal): Promise<GoalDto> {
    return this.toDto(goal, await this.totalsOf(userId, goal.id));
  }

  private toDto(goal: Goal, totals: GoalTotals = NO_TOTALS): GoalDto {
    const deadline = goal.deadline ? fromDbDate(goal.deadline) : null;
    const progress = goalProgress({ target: goal.targetAmount, saved: totals.saved });
    const plan = savingPlan({
      target: goal.targetAmount,
      saved: totals.saved,
      deadline,
      today: this.clock.today(),
      savedThisMonth: totals.savedThisMonth,
    });
    return {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      deadline,
      color: goal.color,
      icon: goal.icon,
      saved: totals.saved,
      remaining: progress.remaining,
      percent: progress.percent,
      status: plan.status,
      monthsLeft: plan.monthsLeft,
      monthlyAmount: plan.monthlyAmount,
      savedThisMonth: totals.savedThisMonth,
      archivedAt: goal.archivedAt?.toISOString() ?? null,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    };
  }
}
