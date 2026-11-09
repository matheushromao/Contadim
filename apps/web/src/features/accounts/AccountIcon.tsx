import type { Account } from '@contadim/contracts';
import { Landmark, PiggyBank, Wallet } from 'lucide-react';

const ICONS = { CHECKING: Landmark, SAVINGS: PiggyBank, WALLET: Wallet } as const;

export function AccountIcon({ type }: { type: Account['type'] }) {
  const Icon = ICONS[type];
  return (
    <span
      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"
      aria-hidden="true"
    >
      <Icon className="size-5" />
    </span>
  );
}
