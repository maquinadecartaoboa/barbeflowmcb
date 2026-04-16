

# Plano: Proteção contra assinaturas duplicadas

## Problema identificado
A Edge Function `mp-create-subscription` não valida se o cliente já possui uma assinatura ativa/authorized no mesmo tenant antes de criar uma nova. Isso permitiu que Igor ficasse com 2+ assinaturas cobrando simultaneamente.

## Correções necessárias

### 1. Adicionar validação na Edge Function `mp-create-subscription`
Antes de criar o registro em `customer_subscriptions`, verificar:
```sql
SELECT id FROM customer_subscriptions 
WHERE customer_id = ? AND tenant_id = ? 
AND status IN ('active', 'authorized', 'pending')
```
Se existir, retornar erro `"Cliente já possui uma assinatura ativa"` em vez de criar duplicata.

### 2. Adicionar validação no frontend (`PublicSubscriptionPlans.tsx`)
Após identificar o cliente pelo telefone, verificar se já tem assinatura ativa antes de permitir prosseguir ao pagamento.

### 3. Adicionar validação no `AssignSubscriptionDialog.tsx`
Quando admin atribui assinatura manualmente, verificar duplicata antes de criar.

### 4. Corrigir os dados do Igor Andrade
Usar o painel do Mercado Pago para cancelar a preapproval duplicada (`4d17ee...` ou `ee17a0...`) e marcar o registro como `cancelled` no banco.

## Detalhes técnicos
- A validação principal fica no backend (Edge Function) como fonte da verdade
- Frontend exibe aviso amigável se detectar assinatura existente
- Validação cobre os status `active`, `authorized` e `pending` (evita duplicata mesmo durante checkout)

