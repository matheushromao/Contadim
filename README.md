# Contadim

[![CI](https://github.com/matheushromao/Contadim/actions/workflows/ci.yml/badge.svg)](https://github.com/matheushromao/Contadim/actions/workflows/ci.yml)
[![Licença: MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-teal.svg)](./LICENSE)

**Controle financeiro pessoal, simples e gratuito.** Anote os gastos do dia a dia em segundos, veja para onde o dinheiro foi no mês e, em breve, organize o cartão de crédito e suas metas de economia.

O Contadim é feito para quem **não entende de finanças e não quer planilha**: abriu, digitou o valor, escolheu a categoria, pronto. Em português, em reais, pensado primeiro para o celular.

> Projeto open source e em evolução. Contribuições são muito bem-vindas, e o [CONTRIBUTING.md](./CONTRIBUTING.md) mostra como começar em poucos minutos.

---

## Sumário

- [O que já dá para fazer](#o-que-já-dá-para-fazer-v01)
- [Como rodar](#como-rodar)
- [Arquitetura](#arquitetura)
- [API](#api)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy](#deploy)
- [Roadmap](#roadmap)
- [Como contribuir](#como-contribuir)

## O que já dá para fazer (v0.1)

- **Lançamento rápido:** só valor e categoria são obrigatórios. Data (hoje) e conta (a última usada) já vêm preenchidas.
- **Resumo do mês:** receitas, despesas, saldo e "para onde foi o dinheiro" (gastos por categoria), com navegação entre meses.
- **Lançamentos:** lista por mês agrupada por dia, com filtro por tipo, edição e exclusão.
- **Contas** (corrente, poupança, carteira) com saldo atual, e **categorias** personalizáveis (cor e ícone). Toda conta nova já começa com categorias padrão e uma "Carteira".
- **Conta de usuário** com e-mail e senha, e sessão segura que se renova sozinha.
- **Seus dados são seus (LGPD):** exportação completa em JSON e exclusão definitiva da conta.

## Como rodar

Há duas formas. Escolha a que fizer mais sentido para você.

### Opção A: tudo em container (só precisa de Docker)

Ideal para conhecer o projeto sem instalar Node nem pnpm.

```bash
git clone https://github.com/matheushromao/Contadim.git contadim
cd contadim
cp .env.example .env
docker compose --profile full up --build
```

Quando os três serviços estiverem saudáveis, acesse:

| O quê         | Onde                           |
| ------------- | ------------------------------ |
| App           | http://localhost:8080          |
| API (Swagger) | http://localhost:3000/api/docs |
| Health check  | http://localhost:3000/health   |

As migrations do banco rodam sozinhas quando a API sobe. Para parar: `Ctrl+C` e depois `docker compose --profile full down`. Os dados ficam no volume `pgdata`; para apagá-los, use `down -v`.

### Opção B: desenvolvimento (`pnpm dev` + banco no Docker)

O fluxo do dia a dia de quem vai mexer no código, com hot reload na API e no front.

**Pré-requisitos:** Node.js 24 (há um `.nvmrc`), [pnpm](https://pnpm.io) (via `corepack enable`) e Docker.

```bash
git clone https://github.com/matheushromao/Contadim.git contadim
cd contadim
corepack enable
cp .env.example .env
pnpm install
pnpm db:up        # PostgreSQL no Docker (cria também o banco de testes)
pnpm db:migrate   # aplica as migrations
pnpm dev          # API em :3000 e web em :5173
```

Acesse **http://localhost:5173**. Em dev, o Vite encaminha `/api` para a API, então front e API ficam na mesma origem e o cookie de sessão funciona sem configurar CORS.

> A porta 5432 já está em uso? Mude `POSTGRES_PORT` no `.env` e ajuste a porta em `DATABASE_URL` e `DATABASE_URL_TEST`.

### Scripts úteis (na raiz)

| Script                              | O que faz                                                         |
| ----------------------------------- | ----------------------------------------------------------------- |
| `pnpm dev`                          | Sobe API, web e o build em modo watch de `core`/`contracts`       |
| `pnpm build`                        | Build de todos os pacotes                                         |
| `pnpm test`                         | Testes unitários e de integração (precisa do banco: `pnpm db:up`) |
| `pnpm lint` / `pnpm typecheck`      | ESLint e TypeScript em todo o monorepo                            |
| `pnpm format` / `pnpm format:check` | Prettier                                                          |
| `pnpm db:up` / `pnpm db:down`       | Sobe/derruba o PostgreSQL                                         |
| `pnpm db:migrate`                   | Cria/aplica migrations em desenvolvimento                         |
| `pnpm db:studio`                    | Abre o Prisma Studio para ver os dados                            |
| `pnpm docker:full`                  | Sobe a stack completa em container                                |

Todas as variáveis de ambiente estão documentadas no [`.env.example`](./.env.example). Um único `.env` na raiz serve para API, front e Docker Compose.

## Arquitetura

Um **monólito modular** com front-end e back-end separados: simples de rodar e de entender, mas organizado para crescer. A API é **stateless** (sessão em JWT + refresh token no banco), então dá para escalar horizontalmente sem mudar o código.

```mermaid
flowchart LR
  subgraph Navegador
    W["apps/web<br/>React + Vite"]
  end
  subgraph Servidor
    A["apps/api<br/>NestJS"]
    DB[("PostgreSQL")]
  end
  C["packages/contracts<br/>schemas Zod"]
  K["packages/core<br/>regras de negócio puras"]

  W -- "HTTP /api/v1" --> A
  A -- Prisma --> DB
  W -. usa .-> C
  A -. usa .-> C
  W -. usa .-> K
  A -. usa .-> K
  C -. usa .-> K
```

### Estrutura do monorepo

```
apps/
  api/          → back-end NestJS (módulos por domínio)
  web/          → front-end React (features por domínio)
packages/
  core/         → regras de negócio puras: dinheiro, datas, resumo mensal
  contracts/    → schemas Zod e tipos compartilhados (os contratos da API)
  config/       → tsconfig, ESLint e Prettier compartilhados
docker/         → scripts de inicialização do PostgreSQL
```

Ferramentas: **pnpm workspaces** + **Turborepo** (cache e ordem de build), **TypeScript `strict`** em todos os pacotes.

### Princípios

- **Regras de negócio em `packages/core`**, como funções puras e testadas, sem dependência de framework, banco ou UI. Controllers e componentes não calculam nada de negócio.
- **Contratos únicos em `packages/contracts`:** o mesmo schema Zod valida o formulário no front e a requisição na API, e gera a documentação Swagger. Mudou o contrato? O TypeScript aponta tudo o que precisa ser ajustado nos dois lados.
- **Camadas na API:** `controller` (HTTP + documentação) → `service` (caso de uso e regras) → `repository` (acesso a dados com Prisma). Trocar a infraestrutura não mexe nas regras.
- **Multiusuário desde o início:** toda entidade tem `userId`, toda consulta é filtrada pelo usuário autenticado e o `userId` **sempre** vem do token, nunca do cliente. Recurso de outra pessoa responde 404.
- **Dinheiro sempre em centavos, como inteiro** (`R$ 12,50` = `1250`). Nunca `float`.
- **Datas de lançamento como data de calendário** (`YYYY-MM-DD`, sem fuso); timestamps de auditoria em UTC.
- **Cada funcionalidade é um módulo novo.** Cartão (v0.2) e metas (v0.3) entram como `modules/cards` e `modules/goals`, e o modelo de dados já está preparado para eles (lançamento com conta opcional, campos de parcelamento e recorrência).

### Stack

| Camada    | Tecnologias                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------- |
| Front-end | React 19, Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS, date-fns (pt-BR), lucide |
| Back-end  | NestJS 12, Prisma 7 + PostgreSQL 17, Zod, argon2, JWT, pino, Helmet, rate limiting, Swagger                 |
| Qualidade | Vitest, Testing Library, Supertest (integração com banco real), ESLint, Prettier, commitlint                |
| Infra     | Docker (multi-stage, usuário não-root), Docker Compose com perfis, GitHub Actions                           |

### Segurança, resumida

- Senhas com **argon2id**.
- **Access token** JWT de 15 minutos, só na memória do navegador.
- **Refresh token** opaco em cookie `httpOnly`, guardado como hash, com **rotação e detecção de reuso**: reutilizar um token já trocado encerra a sessão.
- **Proteção contra CSRF** nas rotas que usam cookie, **rate limit** mais rígido em login e cadastro, **Helmet** e **CORS** com allowlist.
- **Validação das variáveis de ambiente** na inicialização: a API se recusa a subir em produção com o segredo de exemplo.
- **Logs estruturados** com `x-request-id`, com tokens e cookies mascarados.

## API

REST versionada em `/api/v1`, documentada com **Swagger em `/api/docs`**.

| Recurso     | Rotas                                                                                                                            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Auth        | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`                                                            |
| Usuário     | `GET /users/me`, `GET /users/me/export`, `DELETE /users/me`                                                                      |
| Contas      | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/:id`                                                                           |
| Categorias  | `GET/POST /categories`, `GET/PATCH/DELETE /categories/:id`                                                                       |
| Lançamentos | `GET/POST /transactions` (filtros `month`, `from`/`to`, `type`, `categoryId`, `accountId`), `GET/PATCH/DELETE /transactions/:id` |
| Resumo      | `GET /summary/monthly?month=AAAA-MM`                                                                                             |
| Saúde       | `GET /health` (fora do prefixo)                                                                                                  |

**Listagens** são paginadas (`?page=1&pageSize=20`) e respondem `{ data, meta: { page, pageSize, total, totalPages } }`.

**Erros** têm sempre o mesmo formato:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Alguns dados enviados são inválidos",
    "details": [{ "path": "amount", "message": "O valor deve ser maior que zero" }],
    "requestId": "…"
  }
}
```

## Testes e qualidade

```bash
pnpm db:up   # os testes de integração usam um banco separado (contadim_test)
pnpm test
```

- **`core` e `contracts`:** testes unitários das regras e dos schemas.
- **`api`:** testes de integração que sobem a aplicação inteira (mesma configuração de produção) contra um PostgreSQL real. Cobrem fluxos de auth, CRUDs, filtros, resumo, LGPD e o **isolamento entre usuários**.
- **`web`:** testes de componente com Testing Library, como lançamento rápido, resumo, formulários e guards de rota.

O **CI** (GitHub Actions) roda formatação, lint, typecheck, testes e build em todo push e PR, e também builda as imagens Docker.

## Deploy

- **API:** a imagem `apps/api/Dockerfile` é independente de provedor (Fly.io, Render, Railway, ECS, uma VPS…). Ela aplica as migrations ao iniciar e expõe `/health` para o health check. Configure pelo menos `DATABASE_URL`, `JWT_ACCESS_SECRET` (`openssl rand -base64 48`) e `CORS_ORIGINS`.
- **Front-end:** é um site estático (`pnpm --filter @contadim/web build` gera `apps/web/dist`). Pode ir para Vercel, Netlify ou ser servido pela imagem `apps/web/Dockerfile` (Nginx).
  - **Mesmo domínio** (ex.: o Nginx fazendo proxy de `/api`): é a configuração mais simples, com `COOKIE_SAMESITE=lax`.
  - **Domínios diferentes:** defina `VITE_API_URL` com a URL completa da API no build do front, e `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` na API.

## Roadmap

- [x] **v0.1:** contas, categorias, lançamentos, resumo mensal, autenticação, LGPD, Docker e CI
- [ ] **v0.2:** cartão de crédito, com faturas por ciclo (compra depois do fechamento vai para a fatura seguinte) e parcelamentos distribuídos nos meses seguintes
- [ ] **v0.3:** metas de economia, com valor-alvo, prazo e quanto guardar por mês
- [ ] **Depois:** gráficos de evolução, comparação com meses anteriores, importação de extrato (OFX/CSV), PWA e login social

Tem uma ideia? Abra uma issue!

## Como contribuir

Leia o [CONTRIBUTING.md](./CONTRIBUTING.md): ele mostra o passo a passo para rodar o projeto, o padrão de commits e o fluxo de pull requests.

## Licença

[MIT](./LICENSE). Use, estude, modifique e compartilhe.
