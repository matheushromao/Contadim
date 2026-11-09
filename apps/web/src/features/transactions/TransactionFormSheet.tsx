import {
  type Account,
  type Category,
  createTransactionSchema,
  type Transaction,
} from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { ConfirmDelete } from '../../components/ConfirmDelete';
import { TypeToggle } from '../../components/TypeToggle';
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
import { useCategories } from '../categories/api';
import { CategoryIcon } from '../categories/CategoryIcon';
import { useDeleteTransaction, useSaveTransaction } from './api';

type Form = z.input<typeof createTransactionSchema>;

/**
 * Lançamento rápido (criação) e edição. Na criação, só valor e categoria dependem
 * da pessoa: tipo (despesa), data (hoje) e conta (a última usada) já vêm preenchidos.
 */
export function TransactionFormSheet({
  open,
  onClose,
  transaction,
}: {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | undefined;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={transaction ? 'Editar lançamento' : 'Novo lançamento'}
    >
      <TransactionFormLoader transaction={transaction} onDone={onClose} />
    </Sheet>
  );
}

function TransactionFormLoader({
  transaction,
  onDone,
}: {
  transaction?: Transaction | undefined;
  onDone: () => void;
}) {
  const accounts = useAccounts();
  const categories = useCategories();

  if (accounts.isPending || categories.isPending) return <LoadingState />;
  if (accounts.isError || categories.isError) {
    return <ErrorState error={accounts.error ?? categories.error} />;
  }
  if (accounts.data.length === 0) {
    return (
      <Alert tone="info">Crie uma conta em &quot;Contas&quot; para começar a lançar. 😉</Alert>
    );
  }
  return (
    <TransactionForm
      key={transaction?.id ?? 'new'}
      transaction={transaction}
      accounts={accounts.data}
      categories={categories.data}
      onDone={onDone}
    />
  );
}

function defaultAccountId(accounts: Account[]): string {
  const last = storage.get(LAST_ACCOUNT_KEY);
  return accounts.find((account) => account.id === last)?.id ?? accounts[0]!.id;
}

function TransactionForm({
  transaction,
  accounts,
  categories,
  onDone,
}: {
  transaction?: Transaction | undefined;
  accounts: Account[];
  categories: Category[];
  onDone: () => void;
}) {
  const toast = useToast();
  const save = useSaveTransaction();
  const remove = useDeleteTransaction();
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createTransactionSchema>>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: transaction
      ? {
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date,
          categoryId: transaction.categoryId,
          accountId: transaction.accountId ?? defaultAccountId(accounts),
          description: transaction.description ?? '',
        }
      : {
          amount: 0,
          type: 'EXPENSE',
          date: today(),
          categoryId: '',
          accountId: defaultAccountId(accounts),
          description: '',
        },
  });

  const type = useWatch({ control, name: 'type' });
  const visibleCategories = categories.filter((category) => category.type === type);

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      await save.mutateAsync(transaction ? { id: transaction.id, input } : { input });
      storage.set(LAST_ACCOUNT_KEY, input.accountId);
      toast.show(transaction ? 'Lançamento atualizado' : 'Anotado! 📝');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  const onDelete = async () => {
    if (!transaction) return;
    try {
      await remove.mutateAsync(transaction.id);
      toast.show('Lançamento excluído');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <TypeToggle
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              // Categoria de despesa não serve para receita (e vice-versa).
              setValue('categoryId', '');
            }}
          />
        )}
      />

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <MoneyInput
            label="Valor"
            size="lg"
            autoFocus={!transaction}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.amount?.message}
          />
        )}
      />

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Categoria</legend>
        <Controller
          control={control}
          name="categoryId"
          render={({ field }) => (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={field.value === category.id}
                  onClick={() => field.onChange(category.id)}
                  className={clsx(
                    'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-medium ring-1',
                    field.value === category.id
                      ? 'bg-brand-50 text-brand-900 ring-2 ring-brand-600'
                      : 'text-stone-700 ring-stone-200 hover:bg-stone-50',
                  )}
                >
                  <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                  <span className="line-clamp-1">{category.name}</span>
                </button>
              ))}
            </div>
          )}
        />
        {errors.categoryId && <p className="mt-1.5 text-sm text-rose-600">Escolha uma categoria</p>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <TextField label="Data" type="date" error={errors.date?.message} {...register('date')} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transaction-account" className="text-sm font-medium text-stone-700">
            Conta
          </label>
          <select
            id="transaction-account"
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
      </div>

      <TextField
        label="Descrição (opcional)"
        placeholder="Ex.: mercado, uber, aluguel"
        error={errors.description?.message}
        {...register('description')}
      />

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {transaction ? (
          <ConfirmDelete
            label="Excluir"
            loading={remove.isPending}
            onConfirm={() => void onDelete()}
          />
        ) : (
          <span />
        )}
        <Button type="submit" loading={save.isPending} className="sm:min-w-40">
          {transaction ? 'Salvar' : 'Lançar'}
        </Button>
      </div>
    </form>
  );
}
