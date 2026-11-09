import { type Account, createAccountSchema } from '@contadim/contracts';
import { ACCOUNT_TYPES } from '@contadim/core';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';

import { ConfirmDelete } from '../../components/ConfirmDelete';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { Sheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/toast-context';
import { applyApiError } from '../../lib/form-errors';
import { ACCOUNT_TYPE_LABELS, useDeleteAccount, useSaveAccount } from './api';

type Form = z.input<typeof createAccountSchema>;

export function AccountFormSheet({
  open,
  onClose,
  account,
}: {
  open: boolean;
  onClose: () => void;
  account?: Account | undefined;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={account ? 'Editar conta' : 'Nova conta'}>
      <AccountForm key={account?.id ?? 'new'} account={account} onDone={onClose} />
    </Sheet>
  );
}

function AccountForm({ account, onDone }: { account?: Account | undefined; onDone: () => void }) {
  const toast = useToast();
  const save = useSaveAccount();
  const remove = useDeleteAccount();
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createAccountSchema>>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: account
      ? { name: account.name, type: account.type, initialBalance: account.initialBalance }
      : { name: '', type: 'CHECKING', initialBalance: 0 },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      await save.mutateAsync(account ? { id: account.id, input } : { input });
      toast.show(account ? 'Conta atualizada' : 'Conta criada! 🎉');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  const onDelete = async () => {
    if (!account) return;
    setFormError('');
    try {
      await remove.mutateAsync(account.id);
      toast.show('Conta excluída');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}
      <TextField
        label="Nome"
        placeholder="Ex.: Nubank, Caixa, Carteira"
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="account-type" className="text-sm font-medium text-stone-700">
          Tipo
        </label>
        <select
          id="account-type"
          className="min-h-11 rounded-xl border border-stone-300 bg-white px-3"
          {...register('type')}
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {ACCOUNT_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>
      <Controller
        control={control}
        name="initialBalance"
        render={({ field }) => (
          <MoneyInput
            label="Saldo inicial"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.initialBalance?.message}
          />
        )}
      />
      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {account ? (
          <ConfirmDelete
            label="Excluir conta"
            loading={remove.isPending}
            onConfirm={() => void onDelete()}
          />
        ) : (
          <span />
        )}
        <Button type="submit" loading={save.isPending}>
          Salvar
        </Button>
      </div>
    </form>
  );
}
