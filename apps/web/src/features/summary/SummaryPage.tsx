import type { MonthlySummary, Transaction } from '@contadim/contracts';
import clsx from 'clsx';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link } from 'react-router';

import { Money } from '../../components/Money';
import { MonthNavigator } from '../../components/MonthNavigator';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useMonthParam } from '../../lib/use-month-param';
import { useAuth } from '../auth/auth-context';
import { CategoryIcon } from '../categories/CategoryIcon';
import { useMonthTransactions } from '../transactions/api';
import { MonthInvoices } from './MonthInvoices';
import { EditTransactionSheet } from '../transactions/EditTransactionSheet';
import { TransactionList } from '../transactions/TransactionList';
import { useMonthlySummary } from './api';

const RECENT_LIMIT = 5;

export function SummaryPage() {
  const { user } = useAuth();
  const [month, setMonth] = useMonthParam();
  const summary = useMonthlySummary(month);
  const transactions = useMonthTransactions(month);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const firstName = user?.name.split(' ')[0];

  return (
    <section className="flex flex-col gap-5">
      <div>
        <p className="text-stone-600">Oi{firstName ? `, ${firstName}` : ''}! 👋</p>
        <h1 className="text-2xl font-bold tracking-tight">Seu mês</h1>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      {summary.isPending ? (
        <LoadingState />
      ) : summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <>
          <Totals summary={summary.data} />
          <ExpensesByCategory summary={summary.data} />
          <MonthInvoices month={month} transactions={transactions.data ?? []} />
          {summary.data.savedInMonth > 0 && (
            <Link
              to="/metas"
              className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-900 ring-1 ring-emerald-100 hover:bg-emerald-100/60"
            >
              <span>
                Você guardou <Money cents={summary.data.savedInMonth} className="font-bold" /> em
                metas neste mês 💪
              </span>
              <span className="shrink-0 text-sm font-semibold">Ver metas</span>
            </Link>
          )}
        </>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Últimos lançamentos</h2>
          {(transactions.data?.length ?? 0) > RECENT_LIMIT && (
            <Link
              to={`/lancamentos?mes=${month}`}
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Ver todos
            </Link>
          )}
        </div>
        {transactions.isPending ? (
          <LoadingState />
        ) : transactions.isError ? (
          <ErrorState error={transactions.error} />
        ) : transactions.data.length === 0 ? (
          <EmptyState emoji="✍️" title="Nenhum lançamento neste mês">
            Toque no <strong>+</strong> e anote seu primeiro gasto. É rapidinho!
          </EmptyState>
        ) : (
          <TransactionList
            transactions={transactions.data.slice(0, RECENT_LIMIT)}
            onSelect={setEditing}
          />
        )}
      </div>

      <EditTransactionSheet transaction={editing} onClose={() => setEditing(null)} />
    </section>
  );
}

function Totals({ summary }: { summary: MonthlySummary }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="col-span-2 rounded-2xl bg-brand-700 px-5 py-4 text-white">
        <p className="text-sm text-brand-100">Saldo do mês</p>
        <Money cents={summary.balance} className="text-3xl font-bold" />
        <p className="mt-1 text-sm text-brand-100">
          {summary.balance > 0
            ? 'Sobrou dinheiro. Mandou bem! 🎉'
            : summary.balance < 0
              ? 'Gastou mais do que entrou. Bora ajustar? 💪'
              : summary.totalIncome === 0
                ? 'Comece anotando o que entrou e o que saiu.'
                : 'Zerado: entrou e saiu a mesma coisa.'}
        </p>
      </div>
      <TotalCard
        label="Receitas"
        cents={summary.totalIncome}
        icon={<ArrowUpRight className="size-4" aria-hidden="true" />}
        tone="income"
      />
      <TotalCard
        label="Despesas"
        cents={summary.totalExpense}
        icon={<ArrowDownRight className="size-4" aria-hidden="true" />}
        tone="expense"
      />
    </div>
  );
}

function TotalCard({
  label,
  cents,
  icon,
  tone,
}: {
  label: string;
  cents: number;
  icon: ReactNode;
  tone: 'income' | 'expense';
}) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200">
      <p
        className={clsx(
          'flex items-center gap-1 text-sm font-medium',
          tone === 'income' ? 'text-income' : 'text-expense',
        )}
      >
        {icon}
        {label}
      </p>
      <Money cents={cents} className="text-lg font-bold" />
    </div>
  );
}

function ExpensesByCategory({ summary }: { summary: MonthlySummary }) {
  if (summary.expensesByCategory.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
      <h2 className="mb-3 font-semibold">Para onde foi o dinheiro</h2>
      <ul className="flex flex-col gap-3">
        {summary.expensesByCategory.map(({ category, total, percent }) => (
          <li key={category.id} className="flex items-center gap-3">
            <CategoryIcon icon={category.icon} color={category.color} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{category.name}</span>
                <span className="shrink-0">
                  <Money cents={total} className="font-semibold" />
                  <span className="tabular ml-2 text-stone-500">
                    {percent.toLocaleString('pt-BR')}%
                  </span>
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100"
                role="progressbar"
                aria-label={`${category.name}: ${percent}% das despesas`}
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${percent}%`, backgroundColor: category.color }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
