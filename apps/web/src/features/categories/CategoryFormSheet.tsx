import { type Category, createCategorySchema } from '@contadim/contracts';
import { type EntryType } from '@contadim/core';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { ConfirmDelete } from '../../components/ConfirmDelete';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/Field';
import { Sheet } from '../../components/ui/Sheet';
import { useToast } from '../../components/ui/toast-context';
import { applyApiError } from '../../lib/form-errors';
import { useDeleteCategory, useSaveCategory } from './api';
import { CATEGORY_COLORS, CATEGORY_ICONS } from './category-icons';
import { CategoryIcon } from './CategoryIcon';

type Form = z.input<typeof createCategorySchema>;

export function CategoryFormSheet({
  open,
  onClose,
  category,
  type,
}: {
  open: boolean;
  onClose: () => void;
  category?: Category | undefined;
  type: EntryType;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={category ? 'Editar categoria' : 'Nova categoria'}>
      <CategoryForm key={category?.id ?? 'new'} category={category} type={type} onDone={onClose} />
    </Sheet>
  );
}

function CategoryForm({
  category,
  type,
  onDone,
}: {
  category?: Category | undefined;
  type: EntryType;
  onDone: () => void;
}) {
  const toast = useToast();
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof createCategorySchema>>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: category
      ? { name: category.name, type: category.type, color: category.color, icon: category.icon }
      : { name: '', type, color: CATEGORY_COLORS[0], icon: 'circle-ellipsis' },
  });
  const color = useWatch({ control, name: 'color' });

  const onSubmit = handleSubmit(async ({ type: _type, ...rest }) => {
    setFormError('');
    try {
      await save.mutateAsync(
        category ? { id: category.id, input: rest } : { input: { type: _type, ...rest } },
      );
      toast.show(category ? 'Categoria atualizada' : 'Categoria criada! 🎉');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  });

  const onDelete = async () => {
    if (!category) return;
    setFormError('');
    try {
      await remove.mutateAsync(category.id);
      toast.show('Categoria excluída');
      onDone();
    } catch (error) {
      setFormError(applyApiError(error, setError));
    }
  };

  return (
    <form onSubmit={(event) => void onSubmit(event)} noValidate className="flex flex-col gap-5">
      {formError && <Alert>{formError}</Alert>}
      <TextField label="Nome" error={errors.name?.message} {...register('name')} />

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
              {Object.keys(CATEGORY_ICONS).map((icon) => (
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
        {category ? (
          <ConfirmDelete
            label="Excluir categoria"
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
