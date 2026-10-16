FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Toolchain para compilar o better-sqlite3 caso nao haja binario pre-compilado.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY . .
# Os modulos de rota leem DATABASE_PATH ao serem carregados durante o build.
RUN DATABASE_PATH=/tmp/build.db npx next build

FROM node:22-bookworm-slim AS runner
WORKDIR /app

# OpenSSL e usado pelo Prisma CLI no db push da inicializacao.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/app/data/gateway.db

COPY --from=builder --chown=node:node /app/package.json /app/next.config.ts /app/prisma.config.ts ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/generated ./generated
COPY --chown=node:node docker-entrypoint.sh ./

RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh \
    && mkdir -p /app/data && chown node:node /app/data

USER node
VOLUME ["/app/data"]
EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
