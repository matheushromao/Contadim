import type { Transaction } from '@contadim/contracts';

import { PurchaseSheet } from '../cards/PurchaseSheet';
import { TransactionFormSheet } from './TransactionFormSheet';

/** Abre a edição certa: parcela de cartão edita a compra inteira; o resto, o lançamento. */
export function EditTransactionSheet({
  transaction,
  onClose,
}: {
  transaction: Transaction | null;
  onClose: () => void;
}) {
  const isCardCharge = Boolean(transaction?.cardId);
  return (
    <>
      <TransactionFormSheet
        open={transaction !== null && !isCardCharge}
        onClose={onClose}
        transaction={isCardCharge ? undefined : (transaction ?? undefined)}
      />
      <PurchaseSheet
        open={transaction !== null && isCardCharge}
        onClose={onClose}
        installment={isCardCharge ? transaction : null}
      />
    </>
  );
}
