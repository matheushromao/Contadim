import type { CreateGoalMovementData } from '@contadim/contracts';
import { type IsoDate, monthRange, type YearMonth } from '@contadim/core';
import { Injectable } from '@nestjs/common';

import type { Goal, GoalMovement } from '../../generated/prisma/client.js';
import { toDbDate } from '../../infra/prisma/calendar-date.js';
import { PrismaService } from '../../infra/prisma/prisma.service.js';

export interface GoalData {
  name: string;
  targetAmount: number;
  deadline: IsoDate | null;
  color: string;
  icon: string;
}

/** Totais de uma meta: tudo o que já foi guardado e o que foi guardado no mês atual. */
export interface GoalTotals {
  saved: number;
  savedThisMonth: number;
}

const signed = (type: string, amount: number) => (type === 'DEPOSIT' ? amount : -amount);

/** Acesso a dados de metas. Toda consulta é filtrada pelo `userId`. */
@Injectable()
export class GoalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, page: { skip: number; take: number }) {
    const where = { userId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.goal.findMany({ where, orderBy: { createdAt: 'asc' }, ...page }),
      this.prisma.goal.count({ where }),
    ]);
    return { items, total };
  }

  findById(userId: string, id: string): Promise<Goal | null> {
    return this.prisma.goal.findFirst({ where: { id, userId } });
  }

  create(userId: string, data: GoalData): Promise<Goal> {
    return this.prisma.goal.create({
      data: { ...data, userId, deadline: data.deadline ? toDbDate(data.deadline) : null },
    });
  }

  update(id: string, data: Partial<GoalData>): Promise<Goal> {
    const { deadline, ...rest } = data;
    return this.prisma.goal.update({
      where: { id },
      data: {
        ...rest,
        ...(deadline !== undefined && { deadline: deadline ? toDbDate(deadline) : null }),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.goal.delete({ where: { id } });
  }

  /** Saldo guardado (total e no mês) de cada meta, agregado no banco. */
  async totals(
    userId: string,
    goalIds: string[],
    month: YearMonth,
  ): Promise<Map<string, GoalTotals>> {
    const result = new Map<string, GoalTotals>(
      goalIds.map((id) => [id, { saved: 0, savedThisMonth: 0 }]),
    );
    if (goalIds.length === 0) return result;

    const { from, to } = monthRange(month);
    const where = { userId, goalId: { in: goalIds } };
    const [all, thisMonth] = await Promise.all([
      this.prisma.goalMovement.groupBy({ by: ['goalId', 'type'], where, _sum: { amount: true } }),
      this.prisma.goalMovement.groupBy({
        by: ['goalId', 'type'],
        where: { ...where, date: { gte: toDbDate(from), lte: toDbDate(to) } },
        _sum: { amount: true },
      }),
    ]);
    for (const row of all) {
      result.get(row.goalId)!.saved += signed(row.type, row._sum.amount ?? 0);
    }
    for (const row of thisMonth) {
      result.get(row.goalId)!.savedThisMonth += signed(row.type, row._sum.amount ?? 0);
    }
    return result;
  }

  async listMovements(userId: string, goalId: string, page: { skip: number; take: number }) {
    const where = { userId, goalId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.goalMovement.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        ...page,
      }),
      this.prisma.goalMovement.count({ where }),
    ]);
    return { items, total };
  }

  createMovement(
    userId: string,
    goalId: string,
    data: CreateGoalMovementData,
  ): Promise<GoalMovement> {
    return this.prisma.goalMovement.create({
      data: {
        userId,
        goalId,
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        date: toDbDate(data.date),
        note: data.note ?? null,
      },
    });
  }

  findMovement(userId: string, goalId: string, id: string): Promise<GoalMovement | null> {
    return this.prisma.goalMovement.findFirst({ where: { id, userId, goalId } });
  }

  async deleteMovement(id: string): Promise<void> {
    await this.prisma.goalMovement.delete({ where: { id } });
  }
}
