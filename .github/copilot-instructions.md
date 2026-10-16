# Copilot Instructions — whatsapp-gateway

Stack: **Node.js 20+**, **Next.js 16 (App Router)**, **React 19**, **TypeScript 5**, **Prisma 7** (generator `prisma-client` + `@prisma/adapter-better-sqlite3`), **SQLite**, **Tailwind CSS 4**, **jose** (JWT).

> Esta versão do Next.js tem breaking changes. Antes de escrever código Next, consulte `node_modules/next/dist/docs/` e respeite avisos de depreciação (ver `AGENTS.md`).

## Geral
- Responda e comente em português; nomes de código (variáveis, funções, tipos) em inglês, exceto campos já existentes no schema (`texto`, `dataInclusao`).
- TypeScript estrito: sem `any`; prefira `unknown` + narrowing. Use o alias `@/` para imports.
- ESM (`"type": "module"`). Use `async/await`, nunca callbacks.
- Mudanças mínimas e focadas; não crie abstrações para uso único.
- Rode `npm run lint` após alterações.

## Next.js (App Router)
- Server Components por padrão; use `"use client"` só quando houver estado, efeitos ou eventos do navegador.
- Nunca importe `app/lib/prisma.ts` ou código com segredos em Client Components.
- Route Handlers em `app/api/**/route.ts` exportando `GET`/`POST`/etc. Use `NextRequest`/`NextResponse`.
- `params` e `searchParams` são assíncronos: `const { id } = await params;`.
- Declare explicitamente o comportamento de cache/renderização dinâmica conforme a doc da versão instalada.
- Retorne status HTTP corretos (400 validação, 401 auth, 404 não encontrado, 500 erro interno) e corpo JSON consistente (`{ error: string }`).
- Não exponha stack traces nem mensagens internas na resposta; logue no servidor.

## Segurança
- Toda rota do gateway deve validar o token via `app/lib/gateway-auth.ts` (HS256, `issuer`, `audience`, expiração).
- Segredos apenas via variáveis de ambiente (`JWS_SECRET`, `DATABASE_PATH`); nunca hardcode nem logue.
- Valide e normalize toda entrada (`request.json()` dentro de `try/catch`, checar tipos, tamanho máximo de strings, IDs inteiros positivos).
- Use somente a API tipada do Prisma; evite `$queryRawUnsafe`. Se precisar de SQL cru, use `$queryRaw` com tagged template.

## Prisma 7 + SQLite
- Schema em `prisma/schema.prisma`; client gerado em `generated/prisma` — **não edite arquivos gerados**. Importe de `@/generated/prisma/client`.
- Use o singleton de `app/lib/prisma.ts` (reaproveitado via `globalThis` em dev). Não instancie `PrismaClient` em outros lugares.
- Após alterar o schema: `npx prisma generate` (e `prisma db push` ou `prisma migrate dev`, conforme o fluxo).
- Prefira migrations (`prisma migrate`) para mudanças versionadas em produção; `db push` só para protótipo.
- Crie `@@index` para colunas usadas em filtros/ordenação (ex.: `status`).
- Use `select` para trazer apenas os campos necessários e paginação (`take`/`cursor`) em listagens.
- Use `prisma.$transaction` para operações que precisam ser atômicas (ex.: ler pendentes e marcar como lidos).
- SQLite aceita um único escritor por vez: mantenha transações curtas; não há enums nativos; trate `DateTime` sempre em UTC.
- O arquivo do banco fica em `data/` (volume Docker); nunca versione arquivos `.db`.

## Node.js
- Leia `process.env` em um único ponto por módulo e falhe cedo se uma variável obrigatória estiver ausente.
- Não use APIs síncronas de I/O em handlers de requisição.
- Trate erros com classes específicas (ex.: `GatewayAuthError`) e mapeie para status HTTP no handler.

## Estilo / UI
- Tailwind CSS 4 utilitário; evite CSS customizado fora de `app/globals.css`.
- Componentes pequenos, funções puras, nomes descritivos.

## Docker
- Build multi-stage; rode `prisma generate` no build e garanta que `DATABASE_PATH` aponte para o volume persistente.
- Não copie `.env` para a imagem.