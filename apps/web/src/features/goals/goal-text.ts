import type { Goal } from '@contadim/contracts';
import { formatBRL, type SavingPlanStatus } from '@contadim/core';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const STATUS_LABELS: Record<SavingPlanStatus, string> = {
  IN_PROGRESS: 'Em andamento',
  ACHIEVED: 'Atingida 🎉',
  OVERDUE: 'Prazo passou',
  NO_DEADLINE: 'Sem prazo',
};

const deadlineLabel = (deadline: string) =>
  format(parseISO(deadline), "MMMM 'de' yyyy", { locale: ptBR });

/** Frase do plano: "Guarde R$ 240,00/mês até março de 2027", "Meta atingida!" etc. */
export function planText(goal: Goal): string {
  switch (goal.status) {
    case 'ACHIEVED':
      return 'Meta atingida! Parabéns 🎉';
    case 'OVERDUE':
      return `O prazo passou. Faltam ${formatBRL(goal.remaining)}`;
    case 'NO_DEADLINE':
      return `Faltam ${formatBRL(goal.remaining)} · sem prazo definido`;
    case 'IN_PROGRESS':
      return goal.monthsLeft === 1
        ? `Guarde ${formatBRL(goal.monthlyAmount ?? 0)} até ${deadlineLabel(goal.deadline!)}`
        : `Guarde ${formatBRL(goal.monthlyAmount ?? 0)}/mês até ${deadlineLabel(goal.deadline!)}`;
  }
}
