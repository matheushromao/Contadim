import type { CreditCard } from '@contadim/contracts';
import { formatBRL } from '@contadim/core';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { InvoiceStatusBadge } from './InvoiceStatusBadge';

const shortDate = (date: string) => format(parseISO(date), "d 'de' MMM", { locale: ptBR });

/** O "cartãozinho": cor do cartão, fatura atual e limite disponível. */
export function CardVisual({ card }: { card: CreditCard }) {
  const used = Math.max(0, card.limit - card.availableLimit);
  const usedPercent = card.limit > 0 ? Math.min(100, Math.round((used / card.limit) * 100)) : 0;
  const { currentInvoice } = card;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-md"
      style={{ background: `linear-gradient(135deg, ${card.color}, ${card.color}cc 60%, #1c1917)` }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold">{card.name}</p>
        <span className="rounded-full bg-white/90 px-0.5">
          <InvoiceStatusBadge status={currentInvoice.status} />
        </span>
      </div>

      <p className="mt-4 text-sm text-white/80">Fatura atual</p>
      <p className="tabular text-2xl font-bold">{formatBRL(currentInvoice.total)}</p>
      <p className="text-sm text-white/80">
        Fecha em {shortDate(currentInvoice.closingDate)} · vence em{' '}
        {shortDate(currentInvoice.dueDate)}
      </p>

      <div className="mt-4">
        <div
          className="h-1.5 overflow-hidden rounded-full bg-white/25"
          role="progressbar"
          aria-label={`Limite usado: ${usedPercent}%`}
          aria-valuenow={usedPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full rounded-full bg-white" style={{ width: `${usedPercent}%` }} />
        </div>
        <p className="tabular mt-1.5 text-sm text-white/90">
          {card.availableLimit < 0 ? 'Limite estourado em ' : 'Disponível: '}
          <strong>{formatBRL(Math.abs(card.availableLimit))}</strong> de {formatBRL(card.limit)}
        </p>
      </div>
    </div>
  );
}
