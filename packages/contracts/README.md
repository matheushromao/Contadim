# @contadim/contracts

Contratos da API: **schemas Zod e tipos TypeScript compartilhados entre `apps/api` e `apps/web`**.

- A API usa os schemas para validar entradas e gerar o Swagger.
- O front usa os mesmos schemas nos formulários (React Hook Form + `zodResolver`) e para tipar as respostas.

Ao mudar um contrato, o TypeScript aponta tudo o que precisa ser ajustado nos dois lados.

| Arquivo                                             | Conteúdo                                    |
| --------------------------------------------------- | ------------------------------------------- |
| `common.ts`                                         | centavos, datas, paginação, formato de erro |
| `auth.ts` / `users.ts`                              | cadastro, login, usuário, exclusão de conta |
| `accounts.ts` / `categories.ts` / `transactions.ts` | CRUDs                                       |
| `summary.ts`                                        | resumo mensal                               |
| `export.ts`                                         | exportação de dados (LGPD)                  |
