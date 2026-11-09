# @contadim/core

Regras de negócio puras do Contadim, **sem dependência de framework, banco ou UI**. Tudo aqui é função pura e testada.

| Módulo       | O que tem                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------- |
| `money`      | `parseMoney`, `toCents`, `fromCents`, `formatBRL`, `sumCents`, `assertCents`                   |
| `dates`      | `monthRange`, `shiftMonth`, `toYearMonth`, `toIsoDate`, validações de `YYYY-MM-DD` e `YYYY-MM` |
| `summary`    | `buildMonthlySummary`, `computeAccountBalance`, `distributePercentages`                        |
| `categories` | `DEFAULT_CATEGORIES` criadas no cadastro                                                       |
| `domain`     | `EntryType` e `AccountType`                                                                    |

## Regras

- **Dinheiro é sempre inteiro em centavos** (`R$ 12,50` → `1250`). Nunca use float para somar.
- **Datas de lançamento são strings `YYYY-MM-DD`**, sem horário e sem fuso.

```bash
pnpm --filter @contadim/core test
```
