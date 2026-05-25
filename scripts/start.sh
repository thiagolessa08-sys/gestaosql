#!/bin/sh
set -e

echo "=== Verificando variáveis de ambiente ==="

if [ -z "$DATABASE_URL" ]; then
  echo "ERRO FATAL: DATABASE_URL não está definida."
  echo "Configure DATABASE_URL nas variáveis do Railway antes de fazer o deploy."
  exit 1
fi

if [ -z "$NEXTAUTH_SECRET" ]; then
  echo "ERRO FATAL: NEXTAUTH_SECRET não está definida."
  echo "Configure NEXTAUTH_SECRET nas variáveis do Railway antes de fazer o deploy."
  exit 1
fi

echo "DATABASE_URL: definida (${#DATABASE_URL} chars)"
echo "NEXTAUTH_SECRET: definida"

echo ""
echo "=== Executando migrações do banco de dados ==="
npx prisma migrate deploy

echo ""
echo "=== Iniciando aplicação ==="
exec npm start
