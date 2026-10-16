#!/bin/sh
set -e

: "${DATABASE_PATH:?DATABASE_PATH nao definida}"

mkdir -p "$(dirname "$DATABASE_PATH")"

# Cria ou atualiza o schema no arquivo SQLite do volume.
./node_modules/.bin/prisma db push

exec ./node_modules/.bin/next start -p "${PORT:-3000}"
