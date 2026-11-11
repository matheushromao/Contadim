import { createCreditCardSchema, type CreditCard } from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
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
import { CATEGORY_COLORS } from '../categories/category-icons';
import { useDeleteCard, useSaveCard } from './api';

type Form = z.input<typeof createCreditCardSchema>;

const DAYS = Array.from({ length: 31 }, (_, index) => index + 1);

export function CardFormSheet({
  open,
  onClose,
  card,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  card?: CreditCard | undefined;
  onDeleted?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={card ? 'Editar cartão' : 'Novo cartão'}>
      <CardForm
        key={card?.id ?? 'new'}
        card={card}
        onDone={onClose}
        onDeleted={onDeleted ?? onClose}
      />
    </Sheet>
  );
}

function DaySelect({
  id,
  label,
  error,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string;
  label: string;
  error?: string | undefined;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-stone-700">
        {label}
      </label>
      <select
        id={id}
        className="min-h-11 rounded-xl border border-stone-300 bg-white px-3"
        {...props}
      >
        {DAYS.map((day) => (
          <option key={day} value={day}>
            Dia {day}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

function CardForm({
  card,
  onDone,
  onDeleted,
}: {
  card?: CreditCard | undefined;
  onDone: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const save = useSaveCard();
  const remove = useDeleteCard();
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createCreditCardSchema>>({
    resolver: zodResolver(createCreditCardSchema),
    defaultValues: card
      ? {
          name: card.name,
          limit: card.limit,
          closingDay: card.closingDay,
          dueDay: card.dueDay,
          color: card.color,
        }
      : { name: '', limit: 0, closingDay: 3, dueDay: 10, color: '#8B5CF6' },
  });

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      await save.mutateAsync(card ? { id: card.id, input } : { input });
      toast.show(card ? 'Cartão atualizado' : 'Cartão cadastrado! 💳');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  const onDelete = async () => {
    if (!card) return;
    setFormError('');
    try {
      await remove.mutateAsync(card.id);
      toast.show('Cartão excluído');
      onDeleted();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-4">
      {formError && <Alert>{formError}</Alert>}
      <TextField
        label="Nome"
        placeholder="Ex.: Nubank, Inter, Itaú"
        error={errors.name?.message}
        {...register('name')}
      />
      <Controller
        control={control}
        name="limit"
        render={({ field }) => (
          <MoneyInput
            label="Limite"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.limit?.message}
          />
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <DaySelect
          id="card-closing-day"
          label="Fecha no"
          error={errors.closingDay?.message}
          {...register('closingDay', { valueAsNumber: true })}
        />
        <DaySelect
          id="card-due-day"
          label="Vence no"
          error={errors.dueDay?.message}
          {...register('dueDay', { valueAsNumber: true })}
        />
      </div>
      <p className="-mt-2 text-sm text-stone-500">
        Compras a partir do dia do fechamento entram na fatura seguinte.
        {card && ' Mudar as datas vale só para compras novas.'}
      </p>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Cor</legend>
        <Controller
          control={control}
          name="color"
          render={({ field }) => (
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-label={`Cor ${option}`}
                  aria-pressed={field.value === option}
                  onClick={() => field.onChange(option)}
                  className={clsx(
                    'size-9 rounded-full ring-offset-2',
                    field.value === option && 'ring-2 ring-stone-800',
                  )}
                  style={{ backgroundColor: option }}
                />
              ))}
            </div>
          )}
        />
      </fieldset>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {card ? (
          <ConfirmDelete
            label="Excluir cartão"
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
