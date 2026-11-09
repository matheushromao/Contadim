import type { Category } from '@contadim/contracts';
import type { EntryType } from '@contadim/core';
import { ChevronRight, Plus } from 'lucide-react';
import { useState } from 'react';

import { TypeToggle } from '../../components/TypeToggle';
import { Button } from '../../components/ui/Button';
import { ErrorState, LoadingState, PageHeader } from '../../components/ui/States';
import { useCategories } from './api';
import { CategoryFormSheet } from './CategoryFormSheet';
import { CategoryIcon } from './CategoryIcon';

export function CategoriesPage() {
  const categories = useCategories();
  const [type, setType] = useState<EntryType>('EXPENSE');
  const [editing, setEditing] = useState<Category | 'new' | null>(null);

  const visible = (categories.data ?? []).filter((category) => category.type === type);

  return (
    <section>
      <PageHeader
        title="Categorias"
        action={
          <Button onClick={() => setEditing('new')}>
            <Plus className="size-4" aria-hidden="true" />
            Nova
          </Button>
        }
      />
      <TypeToggle
        value={type}
        onChange={setType}
        labels={{ EXPENSE: 'Despesas', INCOME: 'Receitas' }}
      />

      <div className="mt-4">
        {categories.isPending ? (
          <LoadingState />
        ) : categories.isError ? (
          <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />
        ) : (
          <ul className="divide-y divide-stone-100 rounded-2xl bg-white ring-1 ring-stone-200">
            {visible.map((category) => (
              <li key={category.id}>
                <button
                  type="button"
                  onClick={() => setEditing(category)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-stone-50"
                >
                  <CategoryIcon icon={category.icon} color={category.color} />
                  <span className="flex-1 font-medium">{category.name}</span>
                  <ChevronRight className="size-4 text-stone-400" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <CategoryFormSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        category={editing === 'new' || editing === null ? undefined : editing}
        type={type}
      />
    </section>
  );
}
