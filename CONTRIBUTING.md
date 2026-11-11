# Contribuindo com o Contadim

Que bom que você quer ajudar! 💚 Este guia leva você do zero a um pull request.

## 1. Rodando o projeto em poucos minutos

**Você vai precisar de:** Node.js 24, Docker e Git. O pnpm vem pelo corepack, que já está incluído no Node.

```bash
# 1. Faça um fork no GitHub e clone o seu fork
git clone https://github.com/<seu-usuario>/Contadim.git contadim
cd contadim

# 2. Ative o pnpm na versão do projeto e instale as dependências
corepack enable
pnpm install

# 3. Configure o ambiente (os valores padrão funcionam para desenvolvimento)
cp .env.example .env

# 4. Suba o banco e aplique as migrations
pnpm db:up
pnpm db:migrate

# 5. Rode tudo
pnpm dev
```

Pronto: o app abre em http://localhost:5173 e a documentação da API em http://localhost:3000/api/docs.

Antes de abrir um PR, rode a mesma verificação do CI:

```bash
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

### Problemas comuns

| Sintoma                                                  | Solução                                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `port is already allocated` ao rodar `pnpm db:up`        | A porta 5432 está em uso. Mude `POSTGRES_PORT` no `.env` e a porta em `DATABASE_URL`/`DATABASE_URL_TEST` |
| A API não sobe e lista "Variáveis de ambiente inválidas" | Compare seu `.env` com o `.env.example` (pode ter variável nova)                                         |
| Testes da API falham com erro de conexão                 | O banco precisa estar de pé: `pnpm db:up`                                                                |
| Tipos do Prisma "sumiram"                                | `pnpm --filter @contadim/api generate`                                                                   |

## 2. Onde fica cada coisa

| Quero mexer em…                                                                         | Vá para                                                       |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Uma regra de negócio (cálculo, formatação de dinheiro, datas, faturas, parcelas, metas) | `packages/core`                                               |
| O formato de uma requisição/resposta da API                                             | `packages/contracts`                                          |
| Um endpoint, validação ou acesso ao banco                                               | `apps/api/src/modules/<domínio>`                              |
| O modelo de dados                                                                       | `apps/api/prisma/schema.prisma` + `pnpm db:migrate`           |
| Uma tela ou componente                                                                  | `apps/web/src/features/<domínio>` e `apps/web/src/components` |

As regras de arquitetura estão no [README](./README.md#princípios). As mais importantes:

- **Regra de negócio não vai em controller nem em componente.** Ela vai em `core`, como função pura com teste.
- **Dinheiro é sempre inteiro em centavos.** Nunca use `float`.
- **Toda consulta filtra pelo `userId` do token** (`@CurrentUser()`), nunca por um `userId` vindo do cliente.

### Adicionando uma funcionalidade nova

Funcionalidades novas entram como **módulos novos**, mexendo o mínimo possível no que já existe. Um roteiro típico:

1. **Contrato:** crie os schemas Zod em `packages/contracts/src/<domínio>.ts` e exporte no `index.ts`.
2. **Regras:** se houver cálculo, crie funções puras com testes em `packages/core`.
3. **Banco:** altere o `schema.prisma` e gere a migration com `pnpm db:migrate --name <descricao>`.
4. **API:** crie `apps/api/src/modules/<domínio>/` com `module`, `controller`, `service` e `repository`, e registre o módulo no `app.module.ts`.
   - Use `ZodBody`/`ZodQuery`/`IdParam` para validar.
   - Use `ApiZodBody`/`ApiZodResponse` para documentar.
   - Lance `NotFoundError`, `ConflictError` etc. para responder erros no formato padrão.
5. **Testes de integração:** crie `apps/api/test/<domínio>.e2e-spec.ts`, incluindo **um teste de isolamento entre usuários**.
6. **Front:** crie `apps/web/src/features/<domínio>/` com os hooks de dados (`api.ts`) e as telas, e adicione a rota em `app/router.tsx` (com `lazy`).

## 3. Padrão de código

- **TypeScript `strict`** em todo lugar. Evite `any`; se precisar, explique o porquê num comentário.
- **Formatação** com Prettier e **lint** com ESLint (type-aware). Rode `pnpm format` antes de commitar.
- **Textos da interface em português (pt-BR)**, com tom leve e próximo, sem exagero. Mensagens de erro devem dizer o que fazer ("Escolha uma categoria"), não só que algo deu errado.
- **Código e nomes técnicos em inglês**; comentários e documentação em português.
- Acessibilidade: use `label` nos campos, `aria-*` quando necessário e pense em quem navega pelo teclado.

## 4. Commits

Usamos [**Conventional Commits**](https://www.conventionalcommits.org/pt-br/). O hook do husky + commitlint valida a mensagem.

```
<tipo>(<escopo opcional>): <descrição no imperativo, em inglês>
```

| Tipo       | Quando usar                               |
| ---------- | ----------------------------------------- |
| `feat`     | Nova funcionalidade                       |
| `fix`      | Correção de bug                           |
| `refactor` | Mudança de código sem mudar comportamento |
| `test`     | Testes                                    |
| `docs`     | Documentação                              |
| `build`    | Build, dependências, Dockerfiles          |
| `ci`       | Pipeline de CI                            |
| `chore`    | Manutenção geral                          |
| `perf`     | Performance                               |

Escopos comuns: `core`, `contracts`, `api`, `web`, `auth`, `accounts`, `categories`, `transactions`, `summary`, `privacy`, `docker`.

Exemplos:

```
feat(transactions): add filter by account
fix(web): keep selected month after editing a transaction
test(summary): cover months without transactions
```

Prefira **commits pequenos**, que façam uma coisa só.

## 5. Fluxo de pull request

1. **Crie uma branch** a partir da `main` atualizada, no padrão `tipo/descricao-curta`, como `feat/credit-cards`, `fix/month-navigation` ou `docs/deploy-guide`.
2. **Implemente com testes.** Bug corrigido ganha um teste que falharia antes da correção.
3. **Rode a verificação completa** (`format:check`, `lint`, `typecheck`, `test`, `build`).
4. **Abra o PR para a `main`** e preencha o template:
   - o que foi feito;
   - por quê;
   - como testar;
   - pontos de atenção.
5. **O CI precisa estar verde.** Uma pessoa mantenedora vai revisar, comentar se necessário e fazer o merge.

Mudança grande ou que altera a arquitetura? **Abra uma issue antes** para conversarmos sobre a abordagem. Isso economiza o seu tempo.

## 6. Convivência

Seja gentil e paciente. Este é um projeto aberto a pessoas de todos os níveis de experiência, e perguntas são sempre bem-vindas. Críticas vão para o código, nunca para as pessoas.
