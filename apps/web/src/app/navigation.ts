import {
  ArrowLeftRight,
  ChartPie,
  CreditCard,
  Landmark,
  PiggyBank,
  Settings,
  Tags,
  type LucideIcon,
  Wallet,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Outras rotas em que o item também aparece como ativo. */
  alsoActiveOn?: string[];
}

/** Barra lateral (desktop). */
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Resumo', icon: ChartPie },
  { to: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { to: '/contas', label: 'Contas', icon: Landmark },
  { to: '/cartoes', label: 'Cartões', icon: CreditCard },
  { to: '/metas', label: 'Metas', icon: PiggyBank },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
];

/**
 * Barra inferior (celular): 4 itens + o botão de lançamento. Contas e cartões dividem
 * "Carteira"; Ajustes fica no ícone de engrenagem do cabeçalho.
 */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Resumo', icon: ChartPie },
  { to: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight },
  { to: '/contas', label: 'Carteira', icon: Wallet, alsoActiveOn: ['/cartoes'] },
  { to: '/metas', label: 'Metas', icon: PiggyBank },
];
