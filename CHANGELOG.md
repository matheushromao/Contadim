# Changelog

Todas as mudanças relevantes do Contadim ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), e as versões seguem o [SemVer](https://semver.org/lang/pt-BR/).

## [0.3.0]: metas de economia

### Adicionado

- **Metas de economia** com nome, valor-alvo, prazo opcional, cor e ícone.
- **Plano mensal**: quanto guardar por mês até o prazo, com o valor arredondado para cima no centavo. O mês atual conta enquanto não houver depósito nele.
- **Situação da meta**: em andamento, atingida, prazo passou ou sem prazo.
- **Guardar e resgatar** a partir de uma conta, com histórico e opção de desfazer:
  - o resgate nunca passa do que está guardado;
  - desfazer um depósito que já foi resgatado é bloqueado.
- **Telas** de metas e de detalhe da meta. O botão "Guardar" já sugere o valor mensal do plano.
- **Resumo do mês** com "Você guardou R$ X em metas neste mês" (campo `savedInMonth` na API).

### Alterado

- **Saldo das contas** considera depósitos (−) e resgates (+) em metas. Isso não entra em receitas nem em despesas.
- **Contas usadas em metas** não podem ser excluídas, e **metas com dinheiro guardado** também não.
- **Exportação de dados (LGPD)** passou para a `version: 3`, com metas e movimentações. A exclusão de conta também apaga esses dados.
- **No celular**, "Metas" entrou na barra inferior, e "Ajustes" foi para o ícone de engrenagem no cabeçalho.

### Banco de dados

- Migration `goals`: tabelas `goals` e `goal_movements` (com o enum `GoalMovementType`) e CHECKs de valores positivos.

## [0.2.0]: cartão de crédito

### Adicionado

- **Cartões de crédito:** cadastro com limite, dia de fechamento, dia de vencimento e cor, além do **limite disponível** calculado na hora (inclui parcelas futuras e desconta pagamentos).
- **Faturas por ciclo**, identificadas pelo mês de vencimento:
  - compra feita a partir do dia do fechamento vai para a fatura seguinte;
  - dias inexistentes são ajustados para o último dia do mês;
  - status: aberta, fechada, paga em parte, paga ou vencida.
- **Compras parceladas** em até 24x:
  - os centavos que sobram ficam na 1ª parcela;
  - cada parcela entra na fatura de um mês;
  - editar categoria ou descrição vale para todas as parcelas, e excluir apaga a compra inteira.
- **Pagamento de fatura** a partir de uma conta, total ou parcial (sem rotativo), com opção de desfazer:
  - o saldo da conta diminui;
  - o pagamento não conta como despesa no resumo.
- **Lançamento rápido** com "Pagar com" (conta ou cartão), escolha de parcelas e prévia ("12x de R$ 100,00 · 1ª na fatura de dezembro").
- **Telas** de cartões e de fatura (navegação entre faturas, compras com o selo "2/3" e pagamentos).
- **Resumo do mês** com o bloco "Faturas do mês".
- Variável **`APP_TIMEZONE`** (padrão `America/Sao_Paulo`), usada para saber "que dia é hoje" na fatura atual.

### Alterado

- **Resumo e lista de lançamentos por mês** usam o **mês efetivo**: lançamento de conta conta pela data, e parcela de cartão pelo mês da fatura.
- **Saldo das contas** desconta os pagamentos de fatura. Contas usadas em pagamentos não podem ser excluídas.
- **Exportação de dados (LGPD)** passou para a `version: 2`, com cartões e pagamentos de fatura. A exclusão de conta também apaga esses dados.
- **Lançamentos** devolvem `cardId`, `invoiceMonth` e os campos de parcelamento. Parcelas de cartão não podem ser editadas nem excluídas por `/transactions/:id`.
- No celular, **"Contas" e "Cartões"** ficam juntos na aba "Carteira".

### Banco de dados

- Migration `credit_cards`: tabelas `credit_cards` e `invoice_payments`, e as colunas `card_id` e `invoice_month` em `transactions`. Os CHECKs garantem que:
  - cada lançamento vem de uma conta **ou** de um cartão;
  - compra no cartão é sempre despesa e sempre tem grupo de parcelamento.

## [0.1.0]: primeira versão

### Adicionado

- **Monorepo:** pnpm + Turborepo, com TypeScript `strict`, ESLint, Prettier e commitlint.
- **`@contadim/core`:** dinheiro em centavos, datas de calendário e resumo mensal.
- **`@contadim/contracts`:** schemas Zod compartilhados entre API e front.
- **API NestJS** com:
  - autenticação (argon2id, JWT de curta duração, refresh token em cookie httpOnly com rotação e detecção de reuso);
  - CRUD de contas, categorias (com padrões no cadastro) e lançamentos;
  - resumo mensal;
  - exportação e exclusão de dados (LGPD);
  - Swagger, logs estruturados, Helmet, CORS e rate limit.
- **Front React:**
  - lançamento rápido;
  - resumo com navegação entre meses;
  - lista de lançamentos, contas, categorias e ajustes;
  - layout mobile first.
- **Docker:** imagens multi-stage (sem root), compose com perfil `full` e CI no GitHub Actions.
