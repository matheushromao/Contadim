import { ArrowLeftRight, ChartPie, Landmark, Settings, Tags, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior do celular (máx. 4 itens + botão de lançamento). */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Resumo', icon: ChartPie, mobile: true },
  { to: '/lancamentos', label: 'Lançamentos', icon: ArrowLeftRight, mobile: true },
  { to: '/contas', label: 'Contas', icon: Landmark, mobile: true },
  { to: '/categorias', label: 'Categorias', icon: Tags, mobile: false },
  { to: '/ajustes', label: 'Ajustes', icon: Settings, mobile: true },
];
