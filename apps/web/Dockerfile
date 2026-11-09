# syntax=docker/dockerfile:1.7
# Front-end do Contadim servido por Nginx. Build a partir da RAIZ do repositório:
#   docker build -f apps/web/Dockerfile -t contadim-web .
# Opcional para produção: o build estático também pode ir para Vercel, Netlify etc.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-alpine AS build
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    HUSKY=0 \
    TURBO_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm fetch
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --offline --frozen-lockfile
# URL da API vista pelo navegador. O padrão (/api/v1) usa o proxy do Nginx abaixo.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm turbo run build --filter=@contadim/web...

# Nginx sem root, escutando na 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine AS runtime
# Para onde o Nginx encaminha /api (no compose, o serviço "api").
ENV API_UPSTREAM=http://api:3000
COPY apps/web/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ > /dev/null || exit 1
