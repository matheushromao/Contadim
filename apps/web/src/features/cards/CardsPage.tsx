import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui/States';
import { useCards } from './api';
import { CardFormSheet } from './CardFormSheet';
import { CardVisual } from './CardVisual';
import { WalletTabs } from './WalletTabs';

export function CardsPage() {
  const cards = useCards();
  const [creating, setCreating] = useState(false);

  return (
    <section>
      <WalletTabs />
      <PageHeader
        title="Cartões"
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Novo
          </Button>
        }
      />

      {cards.isPending ? (
        <LoadingState />
      ) : cards.isError ? (
        <ErrorState error={cards.error} onRetry={() => void cards.refetch()} />
      ) : cards.data.length === 0 ? (
        <EmptyState emoji="💳" title="Nenhum cartão cadastrado">
          Cadastre seu cartão de crédito para acompanhar faturas, parcelas e limite.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {cards.data.map((card) => (
            <li key={card.id}>
              <Link
                to={`/cartoes/${card.id}`}
                aria-label={`Ver faturas do cartão ${card.name}`}
                className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                <CardVisual card={card} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CardFormSheet open={creating} onClose={() => setCreating(false)} />
    </section>
  );
}
