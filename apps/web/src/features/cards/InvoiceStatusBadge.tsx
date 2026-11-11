import type { InvoiceStatus } from '@contadim/core';
import clsx from 'clsx';

const STATUS: Record<InvoiceStatus, { label: string; className: string }> = {
  OPEN: { label: 'Aberta', className: 'bg-sky-100 text-sky-800' },
  CLOSED: { label: 'Fechada', className: 'bg-amber-100 text-amber-800' },
  PARTIALLY_PAID: { label: 'Paga em parte', className: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Paga', className: 'bg-emerald-100 text-emerald-800' },
  OVERDUE: { label: 'Vencida', className: 'bg-rose-100 text-rose-800' },
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, className } = STATUS[status];
  return (
    <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}>
      {label}
    </span>
  );
}
