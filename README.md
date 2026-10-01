# WhatsApp Gateway

Gateway HTTP para persistir solicitações do WhatsApp em PostgreSQL.

## Configuração local

Instale as dependências e copie `.env.example` para `.env`. Configure as variáveis abaixo com valores próprios:

- `DATABASE_URL`: string de conexão PostgreSQL.
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

## Deploy na Vercel

1. Importe o repositório na Vercel e configure a integração com o banco PostgreSQL.
2. Em **Settings > Environment Variables**, defina `DATABASE_URL`, `JWS_SECRET` e `ADMIN_SECRET` nos ambientes necessários.
3. Use segredos longos e aleatórios para `JWS_SECRET` e `ADMIN_SECRET`; não os inclua no repositório nem em logs.
4. Faça o deploy. A Vercel executará o build e disponibilizará as rotas da aplicação.
