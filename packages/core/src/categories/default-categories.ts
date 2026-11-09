import { EntryType } from '../domain/enums';

export interface DefaultCategory {
  name: string;
  type: EntryType;
  /** Cor em hexadecimal (#RRGGBB). */
  color: string;
  /** Nome do ícone (conjunto Lucide), resolvido pelo front-end. */
  icon: string;
}

/** Categorias criadas automaticamente para toda pessoa que se cadastra. */
export const DEFAULT_CATEGORIES: readonly DefaultCategory[] = [
  { name: 'Alimentação', type: EntryType.EXPENSE, color: '#F97316', icon: 'utensils' },
  { name: 'Moradia', type: EntryType.EXPENSE, color: '#8B5CF6', icon: 'house' },
  { name: 'Transporte', type: EntryType.EXPENSE, color: '#0EA5E9', icon: 'bus' },
  { name: 'Lazer', type: EntryType.EXPENSE, color: '#EC4899', icon: 'party-popper' },
  { name: 'Saúde', type: EntryType.EXPENSE, color: '#EF4444', icon: 'heart-pulse' },
  { name: 'Educação', type: EntryType.EXPENSE, color: '#6366F1', icon: 'graduation-cap' },
  { name: 'Assinaturas', type: EntryType.EXPENSE, color: '#14B8A6', icon: 'repeat' },
  { name: 'Compras', type: EntryType.EXPENSE, color: '#EAB308', icon: 'shopping-bag' },
  { name: 'Outros', type: EntryType.EXPENSE, color: '#64748B', icon: 'circle-ellipsis' },
  { name: 'Salário', type: EntryType.INCOME, color: '#22C55E', icon: 'wallet' },
  { name: 'Freelance', type: EntryType.INCOME, color: '#10B981', icon: 'briefcase' },
  { name: 'Rendimentos', type: EntryType.INCOME, color: '#84CC16', icon: 'trending-up' },
  { name: 'Outros', type: EntryType.INCOME, color: '#64748B', icon: 'circle-ellipsis' },
];

/** Nome da conta criada automaticamente no cadastro. */
export const DEFAULT_ACCOUNT_NAME = 'Carteira';
