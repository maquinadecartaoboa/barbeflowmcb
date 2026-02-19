

## O que e o `FRONT_BASE_URL` e o plano de migracao para `modogestor.com.br`

### O que e `FRONT_BASE_URL`?

E um secret usado pelas Edge Functions para saber para onde redirecionar o usuario apos operacoes no backend (ex: apos conectar Mercado Pago, apos checkout do Stripe, etc). Atualmente esta apontando para um dominio antigo ou com barra extra, causando o erro de URL dupla (`//app/settings`).

O valor correto sera: `https://www.modogestor.com.br` (sem barra final).

---

### Problema atual

Existem **referencias hardcoded a `barberflow.store`** espalhadas pelo codigo (frontend e edge functions), alem de fallbacks inconsistentes. Precisamos padronizar tudo para `modogestor.com.br`.

---

### Plano de alteracoes

#### 1. Atualizar o secret `FRONT_BASE_URL`

Valor novo: `https://www.modogestor.com.br` (sem barra no final)

#### 2. Atualizar `src/lib/hostname.ts`

- Remover `barberflow.store` e `app.barberflow.store` dos arrays de hosts
- Manter apenas `modogestor.com.br` e `app.modogestor.com.br`

#### 3. Atualizar Edge Functions (fallbacks e hosts hardcoded)

| Arquivo | Alteracao |
|---|---|
| `mp-oauth-callback/index.ts` | Fallback `'https://lovable.dev'` -> `'https://www.modogestor.com.br'` |
| `mp-create-checkout/index.ts` | Fallback `'https://lovable.dev'` -> `'https://www.modogestor.com.br'` |
| `mp-create-subscription/index.ts` | Fallback `'https://www.barberflow.store'` -> `'https://www.modogestor.com.br'` |
| `create-checkout/index.ts` | Fallback `'https://barbeflowmcb.lovable.app'` -> `'https://www.modogestor.com.br'`; dashboardHosts `app.barberflow.store` -> `app.modogestor.com.br` |
| `customer-portal/index.ts` | Fallback `'https://barbeflowmcb.lovable.app'` -> `'https://www.modogestor.com.br'` |

#### 4. Atualizar Frontend (textos e emails)

| Arquivo | Alteracao |
|---|---|
| `src/pages/Settings.tsx` | Texto `barberflow.store/` -> `modogestor.com.br/` no input de slug |
| `src/pages/Landing.tsx` | URL mockup `app.barberflow.store/dashboard` -> `app.modogestor.com.br/dashboard`; email `contato@barberflow.store` -> `contato@modogestor.com.br` |
| `src/pages/Terms.tsx` | Email `contato@barberflow.store` -> `contato@modogestor.com.br` |
| `src/pages/Privacy.tsx` | Email `privacidade@barberflow.store` -> `privacidade@modogestor.com.br` |
| `src/App.tsx` | Comentario `barberflow.store` -> `modogestor.com.br` |

#### 5. Nao alterar

- `src/hooks/useSubscription.ts` - o slug `"barberflow"` e um slug de tenant no banco, nao um dominio
- `supabase/functions/test-all-notifications/index.ts` - dados de teste internos
- Migracoes SQL existentes - sao historicas e nao devem ser alteradas

---

### Secao tecnica

A correcao do bug do Mercado Pago (dupla barra `//app/settings`) sera resolvida pelo passo 1 (secret sem barra final). O `mp-oauth-callback` concatena `${frontBaseUrl}/app/settings`, entao o valor deve ser `https://www.modogestor.com.br` sem `/` no final.

Apos aprovacao, todas as edge functions alteradas serao redeployadas automaticamente.

