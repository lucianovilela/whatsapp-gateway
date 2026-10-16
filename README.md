# WhatsApp Gateway

Gateway HTTP para persistir solicitações do WhatsApp em SQLite.

## Configuração local

Instale as dependências e copie `.env.example` para `.env`. Configure as variáveis abaixo com valores próprios:

- `DATABASE_PATH`: caminho do arquivo SQLite (ex.: `./data/gateway.db`), absoluto ou relativo ao diretório de execução.
- `JWS_SECRET`: segredo aleatório usado para assinar e validar o token do gateway.
- `ADMIN_SECRET`: segredo administrativo usado exclusivamente para emitir tokens.

Inicie o servidor com:

```bash
npm run dev
```

## Autenticação do gateway

Somente `POST /api/gateway` exige `Authorization: Bearer <token>`. Os tokens usam HS256, são emitidos para o subject `gateway` e expiram em 90 dias. `GET /api/gateway` e `PATCH /api/gateway/:id/read` permanecem públicos.

Emita um token usando o segredo administrativo:

```bash
curl -X POST http://localhost:3000/api/auth/token \
  -H "X-Admin-Secret: $ADMIN_SECRET"
```

Use o token retornado no POST protegido:

```bash
curl -X POST http://localhost:3000/api/gateway \
  -H "Authorization: Bearer $GATEWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"exemplo"}'
```

## Deploy

O SQLite grava em arquivo local, portanto o deploy exige um servidor com disco persistente (plataformas serverless como a Vercel não são suportadas).

1. Defina `DATABASE_PATH` apontando para um volume persistente, além de `JWS_SECRET` e `ADMIN_SECRET`.
2. Use segredos longos e aleatórios para `JWS_SECRET` e `ADMIN_SECRET`; não os inclua no repositório nem em logs.
3. Execute `npm run build` (cria/atualiza o schema do banco) e `npm start`.
