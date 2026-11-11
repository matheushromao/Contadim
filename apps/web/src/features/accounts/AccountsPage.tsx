import type { Account } from '@contadim/contracts';
import { sumCents } from '@contadim/core';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Money } from '../../components/Money';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState, PageHeader } from '../../components/ui/States';
import { WalletTabs } from '../cards/WalletTabs';
import { AccountFormSheet } from './AccountFormSheet';
import { AccountIcon } from './AccountIcon';
import { ACCOUNT_TYPE_LABELS, useAccounts } from './api';

export function AccountsPage() {
  const accounts = useAccounts();
  const [editing, setEditing] = useState<Account | 'new' | null>(null);

  return (
    <section>
      <WalletTabs />
      <PageHeader
        title="Contas"
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Nova
          </Button>
        }
      />

      {accounts.isPending ? (
        <LoadingState />
      ) : accounts.isError ? (
        <ErrorState error={accounts.error} onRetry={() => void accounts.refetch()} />
      ) : accounts.data.length === 0 ? (
        <EmptyState emoji="🏦" title="Nenhuma conta ainda">
          Crie uma conta para começar a anotar seus gastos.
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 rounded-2xl bg-brand-700 px-5 py-4 text-white">
            <p className="text-sm text-brand-100">Saldo total</p>
            <Money
              cents={sumCents(accounts.data.map((account) => account.currentBalance))}
              className="text-2xl font-bold"
            />
          </div>
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
            {accounts.data.map((account) => (
              <li key={account.id}>
                <button
                  type="button"
                  onClick={() => setEditing(account)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                >
                  <AccountIcon type={account.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{account.name}</span>
                    <span className="block text-sm text-stone-500">
                      {ACCOUNT_TYPE_LABELS[account.type]}
                    </span>
                  </span>
                  <Money
                    cents={account.currentBalance}
                    className={
                      account.currentBalance < 0 ? 'font-semibold text-expense' : 'font-semibold'
                    }
                  />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <AccountFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        account={editing === 'new' || editing === null ? undefined : editing}
      />
    </section>
  );
}
