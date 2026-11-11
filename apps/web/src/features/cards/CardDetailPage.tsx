import type { InvoiceDetail, Transaction } from '@contadim/contracts';
import { isValidYearMonth, shiftMonth, type YearMonth } from '@contadim/core';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Undo2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { Money } from '../../components/Money';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { formatDayLabel, formatMonthLabel } from '../../lib/dates';
import { useAccounts } from '../accounts/api';
import { useCategories } from '../categories/api';
import { CategoryIcon } from '../categories/CategoryIcon';
import { useCard, useDeleteInvoicePayment, useInvoice } from './api';
import { CardFormSheet } from './CardFormSheet';
import { CardVisual } from './CardVisual';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { PayInvoiceSheet } from './PayInvoiceSheet';
import { PurchaseSheet } from './PurchaseSheet';

const fullDate = (date: string) => format(parseISO(date), "d 'de' MMMM", { locale: ptBR });

export function CardDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const card = useCard(id);
  const [editing, setEditing] = useState(false);

  if (card.isPending) return <LoadingState />;
  if (card.isError) return <ErrorState error={card.error} onRetry={() => void card.refetch()} />;

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <Link
          to="/cartoes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Cartões
        </Link>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="size-4" aria-hidden="true" />
          Editar
        </Button>
      </div>

      <CardVisual card={card.data} />
      <InvoiceSection cardId={card.data.id} currentMonth={card.data.currentInvoice.month} />

      <CardFormSheet
        open={editing}
        onClose={() => setEditing(false)}
        card={card.data}
        onDeleted={() => void navigate('/cartoes', { replace: true })}
      />
    </section>
  );
}

function InvoiceSection({ cardId, currentMonth }: { cardId: string; currentMonth: YearMonth }) {
  const [params, setParams] = useSearchParams();
  const param = params.get('fatura');
  const month = param && isValidYearMonth(param) ? param : currentMonth;
  const invoice = useInvoice(cardId, month);

  const setMonth = (next: YearMonth) =>
    setParams(next === currentMonth ? {} : { fatura: next }, { replace: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl bg-white px-2 py-1.5 ring-1 ring-stone-200">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          aria-label="Fatura anterior"
          className="rounded-full p-2 text-stone-600 hover:bg-stone-100"
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="text-center">
          <p className="font-semibold" aria-live="polite">
            Fatura de {formatMonthLabel(month)}
          </p>
          {month !== currentMonth && (
            <button
              type="button"
              onClick={() => setMonth(currentMonth)}
              className="text-xs font-medium text-brand-700 hover:underline"
            >
              Voltar para a fatura atual
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          aria-label="Próxima fatura"
          className="rounded-full p-2 text-stone-600 hover:bg-stone-100"
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>

      {invoice.isPending ? (
        <LoadingState />
      ) : invoice.isError ? (
        <ErrorState error={invoice.error} onRetry={() => void invoice.refetch()} />
      ) : (
        <InvoiceBody invoice={invoice.data} />
      )}
    </div>
  );
}

function InvoiceBody({ invoice }: { invoice: InvoiceDetail }) {
  const [paying, setPaying] = useState(false);
  const [selected, setSelected] = useState<Transaction | null>(null);

  return (
    <>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200">
        <div className="flex items-center justify-between gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          <p className="text-sm text-stone-500">
            Fecha em {fullDate(invoice.closingDate)} · vence em {fullDate(invoice.dueDate)}
          </p>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <dt className="text-xs text-stone-500">Total</dt>
            <dd>
              <Money cents={invoice.total} className="font-bold" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Pago</dt>
            <dd>
              <Money cents={invoice.paid} className="font-bold text-income" />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-stone-500">Falta</dt>
            <dd>
              <Money cents={invoice.remaining} className="font-bold" />
            </dd>
          </div>
        </dl>
        {invoice.remaining > 0 && (
          <Button fullWidth className="mt-4" onClick={() => setPaying(true)}>
            Pagar fatura
          </Button>
        )}
      </div>

      {invoice.payments.length > 0 && <Payments invoice={invoice} />}

      <div>
        <h2 className="mb-2 font-semibold">Compras nesta fatura</h2>
        {invoice.transactions.length === 0 ? (
          <EmptyState emoji="🧾" title="Nenhuma compra nesta fatura">
            Toque no <strong>+</strong> e escolha este cartão em &quot;Pagar com&quot;.
          </EmptyState>
        ) : (
          <ChargeList charges={invoice.transactions} onSelect={setSelected} />
        )}
      </div>

      <PayInvoiceSheet open={paying} onClose={() => setPaying(false)} invoice={invoice} />
      <PurchaseSheet
        open={selected !== null}
        onClose={() => setSelected(null)}
        installment={selected}
      />
    </>
  );
}

function Payments({ invoice }: { invoice: InvoiceDetail }) {
  const toast = useToast();
  const { data: accounts = [] } = useAccounts();
  const remove = useDeleteInvoicePayment(invoice.cardId, invoice.month);
  const accountName = (id: string) => accounts.find((account) => account.id === id)?.name ?? '';

  return (
    <div>
      <h2 className="mb-2 font-semibold">Pagamentos</h2>
      <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
        {invoice.payments.map((payment) => (
          <li key={payment.id} className="flex items-center gap-3 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{formatDayLabel(payment.date)}</span>
              <span className="block text-sm text-stone-500">{accountName(payment.accountId)}</span>
            </span>
            <Money cents={payment.amount} className="font-semibold text-income" />
            <button
              type="button"
              aria-label="Desfazer pagamento"
              disabled={remove.isPending}
              onClick={() =>
                remove.mutate(payment.id, { onSuccess: () => toast.show('Pagamento desfeito') })
              }
              className="rounded-full p-2 text-stone-500 hover:bg-stone-100"
            >
              <Undo2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChargeList({
  charges,
  onSelect,
}: {
  charges: Transaction[];
  onSelect: (charge: Transaction) => void;
}) {
  const { data: categories = [] } = useCategories();
  const categoryOf = (id: string) => categories.find((category) => category.id === id);

  return (
    <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
      {charges.map((charge) => {
        const category = categoryOf(charge.categoryId);
        const isInstallment = (charge.installmentTotal ?? 1) > 1;
        return (
          <li key={charge.id}>
            <button
              type="button"
              onClick={() => onSelect(charge)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
            >
              <CategoryIcon
                icon={category?.icon ?? 'circle-ellipsis'}
                color={category?.color ?? '#64748B'}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">
                  {charge.description ?? category?.name ?? 'Compra'}
                </span>
                <span className="block truncate text-sm text-stone-500">
                  {formatDayLabel(charge.date)}
                  {isInstallment &&
                    ` · parcela ${charge.installmentNumber}/${charge.installmentTotal}`}
                </span>
              </span>
              <Money cents={charge.amount} className="font-semibold" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
