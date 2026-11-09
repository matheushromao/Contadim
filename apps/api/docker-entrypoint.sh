#!/bin/sh
set -eu

if [ -z "${JWT_ACCESS_SECRET:-}" ]; then
  # Conveniência para rodar localmente (docker compose --profile full).
  # Os refresh tokens ficam no banco, então reiniciar o container só obriga
  # o navegador a renovar o access token. Em produção, defina o seu próprio segredo.
  JWT_ACCESS_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  export JWT_ACCESS_SECRET
  echo "[contadim] JWT_ACCESS_SECRET não definido: usando um segredo aleatório temporário." >&2
fi

echo "[contadim] Aplicando migrations do banco..."
./node_modules/.bin/prisma migrate deploy

echo "[contadim] Iniciando a API..."
exec node dist/main.js
