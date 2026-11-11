import { createInvoicePaymentSchema, type InvoiceDetail } from '@contadim/contracts';
import { formatBRL } from '@contadim/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Sheet } from '../../components/ui/Sheet';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { useToast } from '../../components/ui/toast-context';
import { today } from '../../lib/dates';
import { applyApiError } from '../../lib/form-errors';
import { LAST_ACCOUNT_KEY, storage } from '../../lib/storage';
import { useAccounts } from '../accounts/api';
import { usePayInvoice } from './api';

type Form = z.input<typeof createInvoicePaymentSchema>;

/** Pagamento total ou parcial da fatura, saindo de uma conta. */
export function PayInvoiceSheet({
  open,
  onClose,
  invoice,
}: {
  open: boolean;
  onClose: () => void;
  invoice: InvoiceDetail;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Pagar fatura">
      <PayInvoiceLoader
        key={`${invoice.month}-${invoice.remaining}`}
        invoice={invoice}
        onDone={onClose}
      />
    </Sheet>
  );
}

function PayInvoiceLoader({ invoice, onDone }: { invoice: InvoiceDetail; onDone: () => void }) {
  const accounts = useAccounts();
  if (accounts.isPending) return <LoadingState />;
  if (accounts.isError) return <ErrorState error={accounts.error} />;
  if (accounts.data.length === 0) {
    return <Alert tone="info">Cadastre uma conta para registrar o pagamento.</Alert>;
  }
  const last = storage.get(LAST_ACCOUNT_KEY);
  const defaultAccountId =
    accounts.data.find((account) => account.id === last)?.id ?? accounts.data[0]!.id;
  return (
    <PayInvoiceForm
      invoice={invoice}
      accounts={accounts.data}
      defaultAccountId={defaultAccountId}
      onDone={onDone}
    />
  );
}

function PayInvoiceForm({
  invoice,
  accounts,
  defaultAccountId,
  onDone,
}: {
  invoice: InvoiceDetail;
  accounts: { id: string; name: string }[];
  defaultAccountId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const pay = usePayInvoice(invoice.cardId, invoice.month);
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createInvoicePaymentSchema>>({
    resolver: zodResolver(createInvoicePaymentSchema),
    defaultValues: { accountId: defaultAccountId, amount: invoice.remaining, date: today() },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      await pay.mutateAsync(input);
      toast.show(input.amount === invoice.remaining ? 'Fatura paga! 🎉' : 'Pagamento registrado');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-stone-600">
        Falta pagar <strong className="tabular">{formatBRL(invoice.remaining)}</strong>. Pode pagar
        tudo ou só uma parte: o que faltar continua nesta fatura.
      </p>
      {formError && <Alert>{formError}</Alert>}
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <MoneyInput
            label="Valor do pagamento"
            size="lg"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.amount?.message}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="payment-account" className="text-sm font-medium text-stone-700">
            Pagar com
          </label>
          <select
            id="payment-account"
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-3"
            {...register('accountId')}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <TextField label="Data" type="date" error={errors.date?.message} {...register('date')} />
      </div>
      <Button type="submit" loading={pay.isPending}>
        Registrar pagamento
      </Button>
    </form>
  );
}
