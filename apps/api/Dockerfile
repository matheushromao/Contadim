# syntax=docker/dockerfile:1.7
# Imagem da API do Contadim. Build a partir da RAIZ do repositório:
#   docker build -f apps/api/Dockerfile -t contadim-api .

ARG NODE_VERSION=24

# ---------- base: Node + pnpm (via corepack) ----------
FROM node:${NODE_VERSION}-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0 \
    TURBO_TELEMETRY_DISABLED=1
# openssl é usado pelo schema engine do Prisma (migrations).
RUN apk add --no-cache openssl && corepack enable
WORKDIR /repo

# ---------- build: instala, gera o Prisma Client e compila ----------
FROM base AS build
# Só o lockfile primeiro: a camada de download das dependências fica em cache
# enquanto o lockfile não mudar.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile
RUN pnpm turbo run build --filter=@contadim/api...
# Pasta enxuta só com a API e as dependências de produção.
RUN pnpm --filter=@contadim/api deploy --prod --legacy /out

# ---------- runtime: imagem final, sem ferramentas de build ----------
FROM node:${NODE_VERSION}-alpine AS runtime
RUN apk add --no-cache openssl
ENV NODE_ENV=production \
    PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" > /dev/null || exit 1
# Aplica as migrations pendentes e só então inicia a API.
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]
