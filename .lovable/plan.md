

# Corrigir fluxo de assinatura publica -- erro 401 ao criar cliente

## Problema

O componente `SubscriptionPurchaseFlow` tenta buscar e criar clientes diretamente pelo frontend usando o cliente Supabase com chave anon. A politica RLS da tabela `customers` so permite SELECT para usuarios autenticados do tenant (`user_belongs_to_tenant`), causando erro 401 para visitantes publicos.

## Solucao

Mover a logica de buscar/criar cliente para dentro da Edge Function `mp-create-subscription`, que ja usa `SUPABASE_SERVICE_ROLE_KEY` e tem acesso total.

## Mudancas

### 1. Edge Function `mp-create-subscription` (supabase/functions/mp-create-subscription/index.ts)

- Aceitar campos `customer_name`, `customer_phone`, `customer_email` e `tenant_id` no body, alem de `plan_id`
- Adicionar logica de find-or-create customer (mesma logica de `create-booking`: normalizar telefone, buscar existente, criar se nao existir)
- Criar o registro `customer_subscriptions` dentro da Edge Function (ao inves de no frontend)
- Manter o fluxo existente de criar preapproval no Mercado Pago

O body passara a ser:
```text
{
  tenant_id: string,
  plan_id: string,
  customer_name: string,
  customer_phone: string,
  customer_email: string
}
```

Ao inves do atual `{ subscription_id }`.

### 2. Frontend `SubscriptionPurchaseFlow` (src/components/public/SubscriptionPurchaseFlow.tsx)

- Remover toda a logica de buscar/criar cliente (queries diretas a `customers`)
- Remover a criacao de `customer_subscriptions` no frontend
- Chamar `mp-create-subscription` passando os dados do cliente e do plano diretamente
- A Edge Function retorna `checkout_url` e o frontend redireciona

O fluxo simplificado sera:
```text
1. Usuario preenche nome, telefone, email
2. Frontend chama mp-create-subscription com os dados
3. Edge Function cria/encontra cliente, cria subscription, cria preapproval no MP
4. Retorna checkout_url
5. Frontend redireciona para MP
```

### 3. Manter compatibilidade

- O `PackagePurchaseFlow` tem o mesmo problema (queries diretas a customers), mas como a tabela `customers` tem INSERT publico permitido (`Public insert customers` policy com `true`), o INSERT funciona. O SELECT que falha e o de busca. Porem, o escopo desta correcao e apenas o fluxo de assinatura conforme solicitado.

