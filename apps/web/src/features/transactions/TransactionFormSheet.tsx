import {
  type Account,
  type Category,
  createTransactionSchema,
  type CreditCard,
  installmentsSchema,
  type Transaction,
} from '@contadim/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

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
import { LAST_ACCOUNT_KEY, LAST_SOURCE_KEY, storage } from '../../lib/storage';
import { useAccounts } from '../accounts/api';
import { useCreateCardPurchase, useCards } from '../cards/api';
import { useCategories } from '../categories/api';
import { CategoryIcon } from '../categories/CategoryIcon';
import { useDeleteTransaction, useSaveTransaction } from './api';
import {
  decodeSource,
  defaultSource,
  encodeSource,
  INSTALLMENT_OPTIONS,
  installmentPreview,
} from './payment-source';

/**
 * Formulário do lançamento rápido. Reaproveita o contrato de lançamento e troca a conta
 * por "Pagar com" (conta ou cartão). No cartão, a compra pode ser parcelada.
 */
const quickEntrySchema = createTransactionSchema
  .omit({ accountId: true })
  .extend({
    source: z.string().refine((value) => decodeSource(value) !== null, {
      message: 'Escolha de onde sai o dinheiro',
    }),
    installments: installmentsSchema,
  })
  .superRefine((input, ctx) => {
    if (decodeSource(input.source)?.kind !== 'card') return;
    if (input.type !== 'EXPENSE') {
      ctx.addIssue({ code: 'custom', path: ['type'], message: 'Cartão só aceita despesa' });
    }
    if (input.amount < input.installments) {
      ctx.addIssue({
        code: 'custom',
        path: ['installments'],
        message: 'O valor é pequeno demais para esse número de parcelas',
      });
    }
  });

type Form = z.input<typeof quickEntrySchema>;

/**
 * Lançamento rápido (criação) e edição de lançamentos de conta. Na criação, só valor e
 * categoria dependem da pessoa: tipo (despesa), data (hoje) e "pagar com" (a última forma
 * usada) já vêm preenchidos. Compras no cartão são editadas pela fatura.
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
  const cards = useCards();

  if (accounts.isPending || categories.isPending || cards.isPending) return <LoadingState />;
  if (accounts.isError || categories.isError || cards.isError) {
    return <ErrorState error={accounts.error ?? categories.error ?? cards.error} />;
  }
  // Na edição de um lançamento de conta, o cartão não é uma opção.
  const usableCards = transaction ? [] : cards.data;
  if (accounts.data.length === 0 && usableCards.length === 0) {
    return (
      <Alert tone="info">
        Crie uma conta em &quot;Contas&quot; (ou um cartão em &quot;Cartões&quot;) para começar a
        lançar. 😉
      </Alert>
    );
  }
  return (
    <TransactionForm
      key={transaction?.id ?? 'new'}
      transaction={transaction}
      accounts={accounts.data}
      cards={usableCards}
      categories={categories.data}
      onDone={onDone}
    />
  );
}

function TransactionForm({
  transaction,
  accounts,
  cards,
  categories,
  onDone,
}: {
  transaction?: Transaction | undefined;
  accounts: Account[];
  cards: CreditCard[];
  categories: Category[];
  onDone: () => void;
}) {
  const toast = useToast();
  const save = useSaveTransaction();
  const createPurchase = useCreateCardPurchase();
  const remove = useDeleteTransaction();
  const [formError, setFormError] = useState('');
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<Form, unknown, z.output<typeof quickEntrySchema>>({
    resolver: zodResolver(quickEntrySchema),
    defaultValues: transaction
      ? {
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date,
          categoryId: transaction.categoryId,
          source: encodeSource({ kind: 'account', id: transaction.accountId ?? accounts[0]!.id }),
          installments: 1,
          description: transaction.description ?? '',
        }
      : {
          amount: 0,
          type: 'EXPENSE',
          date: today(),
          categoryId: '',
          source: defaultSource(accounts, cards),
          installments: 1,
          description: '',
        },
  });

  const [type, sourceValue, amount, installments, date] = useWatch({
    control,
    name: ['type', 'source', 'amount', 'installments', 'date'],
  });
  const source = decodeSource(sourceValue);
  const selectedCard =
    source?.kind === 'card' ? cards.find((card) => card.id === source.id) : undefined;
  const visibleCategories = categories.filter((category) => category.type === type);
  const preview = selectedCard
    ? installmentPreview({ card: selectedCard, amount, installments, date })
    : null;

  const onSubmit = handleSubmit(async ({ source: rawSource, installments: count, ...input }) => {
    setFormError('');
    const target = decodeSource(rawSource)!;
    try {
      if (target.kind === 'card') {
        await createPurchase.mutateAsync({
          cardId: target.id,
          input: {
            amount: input.amount,
            installments: count,
            date: input.date,
            categoryId: input.categoryId,
            description: input.description ?? null,
          },
        });
      } else {
        const data = { ...input, accountId: target.id };
        await save.mutateAsync(transaction ? { id: transaction.id, input: data } : { input: data });
        storage.set(LAST_ACCOUNT_KEY, target.id);
      }
      if (!transaction) storage.set(LAST_SOURCE_KEY, rawSource);
      toast.show(
        transaction
          ? 'Lançamento atualizado'
          : target.kind === 'card' && count > 1
            ? `Anotado em ${count}x! 💳`
            : 'Anotado! 📝',
      );
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
            disabledType={selectedCard ? 'INCOME' : undefined}
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
          <label htmlFor="transaction-source" className="text-sm font-medium text-stone-700">
            Pagar com
          </label>
          <select
            id="transaction-source"
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-3"
            {...register('source', {
              onChange: (event: React.ChangeEvent<HTMLSelectElement>) => {
                if (decodeSource(event.target.value)?.kind === 'card' && type !== 'EXPENSE') {
                  // Cartão só aceita despesa.
                  setValue('type', 'EXPENSE');
                  setValue('categoryId', '');
                }
              },
            })}
          >
            {cards.length > 0 ? (
              <>
                <optgroup label="Contas">
                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={encodeSource({ kind: 'account', id: account.id })}
                    >
                      {account.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Cartões de crédito">
                  {cards.map((card) => (
                    <option key={card.id} value={encodeSource({ kind: 'card', id: card.id })}>
                      {card.name}
                    </option>
                  ))}
                </optgroup>
              </>
            ) : (
              accounts.map((account) => (
                <option key={account.id} value={encodeSource({ kind: 'account', id: account.id })}>
                  {account.name}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {selectedCard && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="transaction-installments" className="text-sm font-medium text-stone-700">
            Parcelas
          </label>
          <select
            id="transaction-installments"
            className="min-h-11 rounded-xl border border-stone-300 bg-white px-3"
            {...register('installments', { valueAsNumber: true })}
          >
            {INSTALLMENT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count === 1 ? 'À vista' : `${count}x`}
              </option>
            ))}
          </select>
          {errors.installments ? (
            <p className="text-sm text-rose-600">{errors.installments.message}</p>
          ) : (
            preview && (
              <p className="tabular text-sm text-stone-600" aria-live="polite">
                {preview}
              </p>
            )
          )}
        </div>
      )}

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
        <Button
          type="submit"
          loading={save.isPending || createPurchase.isPending}
          className="sm:min-w-40"
        >
          {transaction ? 'Salvar' : 'Lançar'}
        </Button>
      </div>
    </form>
  );
}
