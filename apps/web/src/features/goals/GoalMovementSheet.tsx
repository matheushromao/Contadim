import { createGoalMovementSchema, type Goal } from '@contadim/contracts';
import { formatBRL, type GoalMovementType } from '@contadim/core';
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
import { useAddGoalMovement } from './api';

type Form = z.input<typeof createGoalMovementSchema>;

const COPY = {
  DEPOSIT: { title: 'Guardar dinheiro', account: 'Sai da conta', submit: 'Guardar' },
  WITHDRAWAL: { title: 'Resgatar dinheiro', account: 'Volta para a conta', submit: 'Resgatar' },
} as const;

/** Guardar (depósito) ou resgatar dinheiro de uma meta, sempre a partir de uma conta. */
export function GoalMovementSheet({
  goal,
  type,
  onClose,
}: {
  goal: Goal;
  type: GoalMovementType | null;
  onClose: () => void;
}) {
  return (
    <Sheet open={type !== null} onClose={onClose} title={type ? COPY[type].title : ''}>
      {type && <MovementLoader key={type} goal={goal} type={type} onDone={onClose} />}
    </Sheet>
  );
}

function MovementLoader({
  goal,
  type,
  onDone,
}: {
  goal: Goal;
  type: GoalMovementType;
  onDone: () => void;
}) {
  const accounts = useAccounts();
  if (accounts.isPending) return <LoadingState />;
  if (accounts.isError) return <ErrorState error={accounts.error} />;
  if (accounts.data.length === 0) {
    return (
      <Alert tone="info">Cadastre uma conta em &quot;Contas&quot; para movimentar a meta.</Alert>
    );
  }
  const last = storage.get(LAST_ACCOUNT_KEY);
  const accountId =
    accounts.data.find((account) => account.id === last)?.id ?? accounts.data[0]!.id;
  return (
    <MovementForm
      goal={goal}
      type={type}
      accounts={accounts.data}
      defaultAccountId={accountId}
      onDone={onDone}
    />
  );
}

function MovementForm({
  goal,
  type,
  accounts,
  defaultAccountId,
  onDone,
}: {
  goal: Goal;
  type: GoalMovementType;
  accounts: { id: string; name: string }[];
  defaultAccountId: string;
  onDone: () => void;
}) {
  const toast = useToast();
  const add = useAddGoalMovement(goal.id);
  const [formError, setFormError] = useState('');
  const isWithdrawal = type === 'WITHDRAWAL';
  // O resgate nunca passa do que está guardado (a API também valida).
  const schema = isWithdrawal
    ? createGoalMovementSchema.refine((input) => input.amount <= goal.saved, {
        message: `Você só pode resgatar até ${formatBRL(goal.saved)}`,
        path: ['amount'],
      })
    : createGoalMovementSchema;
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createGoalMovementSchema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type,
      accountId: defaultAccountId,
      amount: isWithdrawal ? goal.saved : (goal.monthlyAmount ?? 0),
      date: today(),
      note: '',
    },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      const updated = await add.mutateAsync(input);
      storage.set(LAST_ACCOUNT_KEY, input.accountId);
      toast.show(
        isWithdrawal
          ? 'Resgate registrado'
          : updated.status === 'ACHIEVED'
            ? 'Meta atingida! 🎉'
            : 'Guardado! 💪',
      );
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      {isWithdrawal && (
        <p className="text-sm text-stone-600">
          Guardado nesta meta: <strong className="tabular">{formatBRL(goal.saved)}</strong>.
        </p>
      )}
      {formError && <Alert>{formError}</Alert>}
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <MoneyInput
            label="Valor"
            size="lg"
            autoFocus
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.amount?.message}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="movement-account" className="text-sm font-medium text-stone-700">
            {COPY[type].account}
          </label>
          <select
            id="movement-account"
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
      <TextField
        label="Observação (opcional)"
        placeholder={isWithdrawal ? 'Ex.: imprevisto com o carro' : 'Ex.: sobrou do 13º'}
        error={errors.note?.message}
        {...register('note')}
      />
      <Button type="submit" loading={add.isPending}>
        {COPY[type].submit}
      </Button>
    </form>
  );
}
