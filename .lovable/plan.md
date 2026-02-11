

# Plano: Sistema de Assinaturas Recorrentes via Mercado Pago

## Resumo

Implementar um sistema completo de assinaturas mensais onde a barbearia cria planos (ex: "Plano Premium R$129,90/mes") e clientes assinam com cobranca automatica via API de Preapproval do Mercado Pago. O sistema funciona em paralelo aos pacotes avulsos existentes, sem quebra-los.

---

## Fase 1 -- Banco de Dados (5 tabelas + RLS)

### Novas tabelas

1. **subscription_plans** -- Planos criados pela barbearia
   - id, tenant_id, name, description, price_cents, billing_cycle, sessions_limit, active, created_at, updated_at

2. **subscription_plan_services** -- Servicos inclusos em cada plano
   - id, plan_id (FK subscription_plans), service_id (FK services), sessions_per_cycle, UNIQUE(plan_id, service_id)

3. **customer_subscriptions** -- Assinatura ativa do cliente
   - id, tenant_id, customer_id, plan_id, status (pending/authorized/active/paused/cancelled/expired), mp_preapproval_id, mp_payer_id, checkout_url, current_period_start/end, next_payment_date, started_at, cancelled_at, cancellation_reason, created_at, updated_at

4. **subscription_usage** -- Controle de uso por ciclo
   - id, subscription_id, service_id, period_start, period_end, sessions_used, sessions_limit, booking_ids (uuid[]), UNIQUE(subscription_id, service_id, period_start)

5. **subscription_payments** -- Historico de cobrancas
   - id, subscription_id, tenant_id, amount_cents, status, mp_payment_id, period_start, period_end, paid_at, created_at

### RLS

Todas as tabelas seguem o padrao existente:
- SELECT publico para `subscription_plans` e `subscription_plan_services` (planos ativos)
- ALL com `user_belongs_to_tenant(tenant_id)` para tabelas de gestao
- SELECT publico para `customer_subscriptions` (para verificacao no agendamento publico)

### Trigger

- `update_updated_at_column` nas tabelas subscription_plans e customer_subscriptions

---

## Fase 2 -- Edge Functions (Backend)

### 2.1 -- mp-create-subscription (NOVA)

Arquivo: `supabase/functions/mp-create-subscription/index.ts`

- Recebe `subscription_id` (customer_subscriptions ja criado com status pending)
- Busca subscription + plan + tenant + customer + mercadopago_connections
- Valida que o cliente tem email preenchido
- Chama `POST https://api.mercadopago.com/preapproval` com auto_recurring (monthly, BRL, valor do plano)
- Salva `mp_preapproval_id` e `checkout_url` (init_point) no customer_subscriptions
- Retorna `checkout_url` para o frontend redirecionar

Config: `verify_jwt = false` no config.toml

### 2.2 -- mp-cancel-subscription (NOVA)

Arquivo: `supabase/functions/mp-cancel-subscription/index.ts`

- Recebe `subscription_id`
- Busca mp_preapproval_id e access_token
- Chama `PUT https://api.mercadopago.com/preapproval/{id}` com `{ status: "cancelled" }`
- Atualiza customer_subscriptions: status=cancelled, cancelled_at=now()

### 2.3 -- mp-pause-subscription (NOVA)

Arquivo: `supabase/functions/mp-pause-subscription/index.ts`

- Igual ao cancel, mas envia `{ status: "paused" }`

### 2.4 -- Modificar mp-webhook (EXISTENTE)

Arquivo: `supabase/functions/mp-webhook/index.ts`

Refatoracao:
- Mover busca de `mercadopago_connections` para ANTES dos checks de type (compartilhada)
- Adicionar tratamento de `type === 'subscription_preapproval'`:
  - Buscar detalhes da preapproval no MP
  - Encontrar customer_subscriptions por mp_preapproval_id ou external_reference
  - Mapear status MP -> status interno (authorized->active, paused, cancelled)
  - Ao ativar: setar period dates e inicializar subscription_usage
- Adicionar tratamento de `type === 'subscription_authorized_payment'`:
  - Registrar em subscription_payments
  - Criar cash_entry
  - Resetar subscription_usage para novo ciclo
  - Atualizar datas de periodo

### 2.5 -- Modificar create-booking (EXISTENTE)

Arquivo: `supabase/functions/create-booking/index.ts`

- Adicionar verificacao de assinatura ativa do cliente antes de processar pagamento
- Se servico incluso no plano e sessoes disponiveis: criar booking sem cobranca
- Incrementar subscription_usage.sessions_used
- Se limite atingido: retornar flag para frontend oferecer pagamento avulso

---

## Fase 3 -- Frontend Admin

### 3.1 -- Pagina de Planos de Assinatura

Arquivo: `src/pages/SubscriptionPlansPage.tsx`
Rota: `/app/subscription-plans`

- Layout inspirado no ServicePackagesTab existente
- Formulario: nome, descricao, valor mensal, limite de sessoes (toggle ilimitado), servicos inclusos com limite por ciclo
- Grid de cards com: nome, preco, servicos, quantidade de assinantes ativos, switch ativo/inativo, botoes editar/excluir

### 3.2 -- Gestao de Assinantes

Arquivo: `src/components/subscriptions/SubscribersList.tsx`

- Tab dentro da pagina de planos (abas "Planos" | "Assinantes")
- Tabela: nome do cliente, plano, status (badge), data inicio, proxima cobranca, uso no ciclo
- Filtros por plano e status
- Acoes: ver detalhes, pausar, cancelar, atribuir manualmente

### 3.3 -- Dialog de Atribuir Assinatura

- Select de cliente (busca por nome/telefone)
- Select de plano
- Opcao: "Cobrar via Mercado Pago" (gera link) ou "Registrar manualmente" (ativa direto)

### 3.4 -- Indicador no Perfil do Cliente

Dentro da pagina de Clientes, exibir info de assinatura ativa: plano, status, proxima cobranca, barra de uso por servico

### 3.5 -- Navegacao

No menu lateral, dentro do grupo "Financeiro":
- Adicionar item "Assinaturas" -> `/app/subscription-plans`

### Componentes a criar:
- `src/components/subscriptions/SubscriptionPlanForm.tsx`
- `src/components/subscriptions/SubscriptionPlanCard.tsx`
- `src/components/subscriptions/SubscribersList.tsx`
- `src/components/subscriptions/CustomerSubscriptionInfo.tsx`
- `src/components/subscriptions/AssignSubscriptionDialog.tsx`
- `src/components/subscriptions/PublicSubscriptionPlans.tsx`

---

## Fase 4 -- Frontend Publico

### 4.1 -- Aba de Assinaturas no BookingPublic

No `BookingPublic.tsx`, adicionar terceira aba "Assinaturas" ao lado de "Servicos" e "Pacotes":
- Cards dos planos ativos do tenant
- Botao "Assinar" que pede email, cria customer_subscriptions (pending), chama mp-create-subscription, redireciona ao init_point do MP

### 4.2 -- Pagina de Callback

Arquivo: `src/pages/SubscriptionCallback.tsx`
Rota: `/:slug/subscription/callback`

- Recebe retorno do MP
- Mostra status da assinatura
- Botao para voltar ao agendamento

### 4.3 -- Verificacao no Fluxo de Agendamento

Ao identificar cliente por telefone:
- Verificar se tem assinatura ativa
- Mostrar badge "Assinante -- Plano [nome]"
- Se servico incluso: "Incluso no seu plano (2/4 sessoes)"
- Se limite atingido: "Sera cobrado valor avulso"
- Ao confirmar: pular pagamento se coberto

---

## Fase 5 -- Config e Deploy

### config.toml

Adicionar:
```
[functions.mp-create-subscription]
verify_jwt = false

[functions.mp-cancel-subscription]
verify_jwt = false

[functions.mp-pause-subscription]
verify_jwt = false
```

### Rota no App.tsx

Adicionar:
- `/app/subscription-plans` -> SubscriptionPlansPage
- `/:slug/subscription/callback` -> SubscriptionCallback

---

## Detalhes Tecnicos

### Sequencia de implementacao

1. Migracoes de banco (5 tabelas + RLS + triggers + indices)
2. Edge Functions novas (create, cancel, pause)
3. Modificar mp-webhook para tratar subscription_preapproval e subscription_authorized_payment
4. Modificar create-booking para verificar assinatura
5. Componentes admin (planos + assinantes)
6. Pagina publica (aba assinaturas + callback)
7. Verificacao de assinatura no fluxo de agendamento

### Pontos de atencao

- Email do cliente e obrigatorio para o MP Preapproval. Validar antes de prosseguir
- Pacotes avulsos (service_packages/customer_packages) continuam funcionando normalmente
- Usar timezone do tenant (America/Bahia) para calculos de periodo
- A refatoracao do mp-webhook deve mover a busca de connections para antes dos checks de type, garantindo que payment e subscription usem o mesmo bloco
- O campo `checkout_url` no customer_subscriptions armazena o init_point do MP para reenvio

