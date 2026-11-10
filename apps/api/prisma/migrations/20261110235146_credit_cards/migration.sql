-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "card_id" UUID,
ADD COLUMN     "invoice_month" DATE;

-- CreateTable
CREATE TABLE "credit_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "limit" INTEGER NOT NULL,
    "closing_day" INTEGER NOT NULL,
    "due_day" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "credit_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "invoice_month" DATE NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "credit_cards_user_id_idx" ON "credit_cards"("user_id");

-- CreateIndex
CREATE INDEX "invoice_payments_user_id_card_id_invoice_month_idx" ON "invoice_payments"("user_id", "card_id", "invoice_month");

-- CreateIndex
CREATE INDEX "invoice_payments_account_id_idx" ON "invoice_payments"("account_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_invoice_month_idx" ON "transactions"("user_id", "invoice_month");

-- CreateIndex
CREATE INDEX "transactions_user_id_card_id_invoice_month_idx" ON "transactions"("user_id", "card_id", "invoice_month");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "credit_cards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "credit_cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Regras de integridade que o Prisma não expressa no schema.
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_days_valid"
  CHECK ("closing_day" BETWEEN 1 AND 31 AND "due_day" BETWEEN 1 AND 31);
ALTER TABLE "credit_cards" ADD CONSTRAINT "credit_cards_limit_non_negative" CHECK ("limit" >= 0);

ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "invoice_payments" ADD CONSTRAINT "invoice_payments_month_first_day"
  CHECK (EXTRACT(DAY FROM "invoice_month") = 1);

-- Todo lançamento sai de uma conta OU de um cartão (nunca os dois, nunca nenhum).
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_source_exactly_one"
  CHECK (("account_id" IS NULL) <> ("card_id" IS NULL));
-- Compra no cartão: sempre despesa, com fatura e grupo de parcelamento (mesmo à vista, 1/1).
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_card_purchase_valid"
  CHECK (
    "card_id" IS NULL
    OR ("type" = 'EXPENSE' AND "invoice_month" IS NOT NULL AND "installment_group_id" IS NOT NULL)
  );
-- A fatura só existe para compras no cartão e é sempre o dia 1 do mês.
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_month_valid"
  CHECK (
    ("card_id" IS NULL AND "invoice_month" IS NULL)
    OR ("card_id" IS NOT NULL AND EXTRACT(DAY FROM "invoice_month") = 1)
  );
