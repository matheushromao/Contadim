## O que foi feito

<!-- Resumo das mudanças. -->

## Por quê

<!-- Qual problema isso resolve? Link para a issue, se houver (ex.: Closes #12). -->

## Como testar

<!-- Passo a passo para validar localmente. -->

```bash
pnpm install
pnpm db:up
pnpm test
```

## Pontos de atenção

<!-- Decisões que merecem revisão, riscos, migrações de banco, mudanças no .env etc. -->

## Checklist

- [ ] `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` passam
- [ ] Regras de negócio novas estão em `packages/core`, com testes
- [ ] Consultas novas filtram pelo usuário autenticado (com teste de isolamento)
- [ ] Textos da interface em pt-BR
- [ ] `.env.example` e documentação atualizados (se aplicável)
