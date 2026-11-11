import { createGoalSchema, type Goal } from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import { CategoryIcon } from '../categories/CategoryIcon';
import { useDeleteGoal, useSaveGoal } from './api';

type Form = z.input<typeof createGoalSchema>;

/** Ícones que fazem sentido para metas (subconjunto dos ícones de categoria). */
const GOAL_ICONS = [
  'piggy-bank',
  'plane',
  'house',
  'car',
  'graduation-cap',
  'gift',
  'heart-pulse',
  'smartphone',
  'baby',
  'dog',
  'party-popper',
  'briefcase',
];

export function GoalFormSheet({
  open,
  onClose,
  goal,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  goal?: Goal | undefined;
  onDeleted?: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={goal ? 'Editar meta' : 'Nova meta'}>
      <GoalForm
        key={goal?.id ?? 'new'}
        goal={goal}
        onDone={onClose}
        onDeleted={onDeleted ?? onClose}
      />
    </Sheet>
  );
}

function GoalForm({
  goal,
  onDone,
  onDeleted,
}: {
  goal?: Goal | undefined;
  onDone: () => void;
  onDeleted: () => void;
}) {
  const toast = useToast();
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createGoalSchema>>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: goal
      ? {
          name: goal.name,
          targetAmount: goal.targetAmount,
          deadline: goal.deadline ?? '',
          color: goal.color,
          icon: goal.icon,
        }
      : { name: '', targetAmount: 0, deadline: '', color: '#14B8A6', icon: 'piggy-bank' },
  });
  const color = useWatch({ control, name: 'color' });

  const onSubmit = handleSubmit(async (input) => {
    setFormError('');
    try {
      await save.mutateAsync(goal ? { id: goal.id, input } : { input });
      toast.show(goal ? 'Meta atualizada' : 'Meta criada! Bora guardar 💪');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  const onDelete = async () => {
    if (!goal) return;
    setFormError('');
    try {
      await remove.mutateAsync(goal.id);
      toast.show('Meta excluída');
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
        placeholder="Ex.: Viagem, Reserva de emergência"
        error={errors.name?.message}
        {...register('name')}
      />
      <Controller
        control={control}
        name="targetAmount"
        render={({ field }) => (
          <MoneyInput
            label="Quanto você quer juntar?"
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={errors.targetAmount?.message}
          />
        )}
      />
      <TextField
        label="Prazo (opcional)"
        type="date"
        hint="Com prazo, mostramos quanto guardar por mês."
        error={errors.deadline?.message}
        {...register('deadline')}
      />

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

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-stone-700">Ícone</legend>
        <Controller
          control={control}
          name="icon"
          render={({ field }) => (
            <div className="grid grid-cols-6 gap-2">
              {GOAL_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  aria-label={`Ícone ${icon}`}
                  aria-pressed={field.value === icon}
                  onClick={() => field.onChange(icon)}
                  className={clsx(
                    'flex justify-center rounded-xl p-1',
                    field.value === icon && 'ring-2 ring-stone-800',
                  )}
                >
                  <CategoryIcon icon={icon} color={color} size="sm" />
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        {goal ? (
          <ConfirmDelete
            label="Excluir meta"
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
