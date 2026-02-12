
# Correções na Integracão Mercado Pago -- Assinaturas

## Diagnostico

- Os tokens MP estao validos (nao expirados) para todos os tenants
- Existem 2 subscriptions "pending" sem `checkout_url` nem `mp_preapproval_id` -- a chamada ao MP falhou
- Nao ha logs da Edge Function `mp-create-subscription` -- possivelmente a funcao nao foi deployada ou o erro ocorre no invoke do frontend (ex: FunctionsHttpError tratado incorretamente)
- A rota `/:slug/subscription/callback` e o componente `SubscriptionCallback.tsx` ja existem no codigo
- O secret `FRONT_BASE_URL` ja esta configurado

## Plano de Correcoes

### 1. Edge Function `mp-create-subscription` -- Melhorar diagnostico e robustez

**Arquivo:** `supabase/functions/mp-create-subscription/index.ts`

Alteracoes:
- Substituir validacao generica por validacao campo a campo com log dos campos faltantes
- Na busca da conexao MP: incluir `token_expires_at` no select, validar token nao-vazio e nao-expirado, com mensagens de erro claras em portugues
- Apos chamada ao MP: tratar status 401 separadamente (token expirado/invalido)
- Alterar fallback do `FRONT_BASE_URL` para `https://www.barberflow.store`

### 2. Frontend `SubscriptionPurchaseFlow` -- Extrair mensagem real do erro

**Arquivo:** `src/components/public/SubscriptionPurchaseFlow.tsx`

Alteracoes:
- No catch do `handleSubscribe`: extrair a mensagem do `data?.error` quando `supabase.functions.invoke` retorna erro HTTP (o body com a mensagem real fica em `data`)
- Adicionar `console.error` para debug
- Melhorar texto do toast de erro

### 3. Edge Function `mp-webhook` -- Melhorar busca de subscription no pagamento recorrente

**Arquivo:** `supabase/functions/mp-webhook/index.ts`

Alteracoes:
- Na funcao `handleSubscriptionPayment` (linha 403): adicionar `mpPaymentData.preapproval_id` como fallback para encontrar o `preapproval_id`
- Adicionar log do campo encontrado

### 4. Deploy das Edge Functions

Deployar `mp-create-subscription` e `mp-webhook` apos as correcoes.

### 5. Instrucao manual para o usuario

Informar sobre a necessidade de configurar os topicos de webhook no painel do Mercado Pago:
- URL: `https://iagzodcwctvydmgrwjsy.supabase.co/functions/v1/mp-webhook`
- Eventos: `subscription_preapproval` e `subscription_authorized_payment`

---

## Detalhes Tecnicos

### mp-create-subscription -- Validacao detalhada
```text
- Listar campos faltantes individualmente
- Logar tenant_id na busca da conexao MP
- Verificar access_token nao-vazio
- Verificar token_expires_at nao expirado
- Tratar mpResponse.status === 401
- Fallback FRONT_BASE_URL -> https://www.barberflow.store
```

### SubscriptionPurchaseFlow -- Tratamento de erro
```text
- Quando supabase.functions.invoke retorna error (FunctionsHttpError),
  o body da resposta com a mensagem real pode estar em data?.error
- Extrair: data?.error || error.message
- Logar erro completo no console
```

### mp-webhook -- Fallback preapproval_id
```text
Linha 403: adicionar || mpPaymentData.preapproval_id ao chain de resolucao
```

### Arquivos alterados
1. `supabase/functions/mp-create-subscription/index.ts`
2. `src/components/public/SubscriptionPurchaseFlow.tsx`
3. `supabase/functions/mp-webhook/index.ts`

Nenhuma migration necessaria. Nenhum componente novo.
