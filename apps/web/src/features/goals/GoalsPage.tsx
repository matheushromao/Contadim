import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui/States';
import { useGoals } from './api';
import { GoalCard } from './GoalCard';
import { GoalFormSheet } from './GoalFormSheet';

export function GoalsPage() {
  const goals = useGoals();
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <PageHeader
        title="Metas"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nova
          </Button>
        }
      />

      {goals.isPending ? (
        <LoadingState />
      ) : goals.isError ? (
        <ErrorState error={goals.error} onRetry={() => void goals.refetch()} />
      ) : goals.data.length === 0 ? (
        <EmptyState emoji="🐷" title="Nenhuma meta ainda">
          Que tal começar uma reserva de emergência? Defina quanto quer juntar e, se quiser, um
          prazo: a gente calcula quanto guardar por mês.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.data.map((goal) => (
            <li key={goal.id}>
              <Link
                to={`/metas/${goal.id}`}
                aria-label={`Ver a meta ${goal.name}`}
                className="block rounded-2xl hover:opacity-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <GoalCard goal={goal} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <GoalFormSheet open={creating} onClose={() => setCreating(false)} />
    </section>
  );
}
