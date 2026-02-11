
# Corrigir Fluxo de Pacotes + Integrar Assinaturas

## Resumo

Reestruturar o agendamento publico para que pacotes e assinaturas funcionem como beneficios reais: o cliente se identifica, ve seus creditos disponiveis e agenda sem cobranca. Mover a logica de decremento de sessoes para o backend (Edge Function) e separar a compra de pacote do agendamento.

## O que sera feito

### Fase 1 -- Backend: Logica de sessoes na Edge Function

**Arquivo:** `supabase/functions/create-booking/index.ts`

- Aceitar novos parametros opcionais: `customer_package_id` e `customer_subscription_id`
- Ao receber `customer_package_id`:
  - Validar pacote ativo + confirmado
  - Verificar sessoes disponiveis no `customer_package_services` para o servico
  - Incrementar `sessions_used` no servico e no pacote geral
  - Marcar pacote como `completed` se todas sessoes esgotadas
- Ao receber `customer_subscription_id`:
  - Validar assinatura ativa
  - Verificar/criar `subscription_usage` do ciclo atual
  - Validar limite de sessoes (NULL = ilimitado)
  - Incrementar uso e registrar booking_id

### Fase 2 -- Remover logica de pacote/assinatura do frontend

**Arquivo:** `src/pages/BookingPublic.tsx`

- Remover linhas 652-726 (updates diretos em `customer_package_services`, `customer_packages` e `subscription_usage`)
- Passar `customer_package_id` ou `customer_subscription_id` na chamada `create-booking`

### Fase 3 -- Separar compra de agendamento

**Novo arquivo:** `src/components/public/PackagePurchaseFlow.tsx`

- Ao clicar "Comprar" na aba Pacotes, o fluxo sera:
  1. Pedir dados do cliente (Nome, Telefone, Email)
  2. Criar `customer_packages` com status `active`, payment_status `pending`
  3. Se pagamento online habilitado, direcionar para MP
  4. Tela de sucesso com opcoes "Agendar agora" ou "Agendar depois"
- Remover `handlePackageSelect` que forca agendamento imediato

### Fase 4 -- Secao "Meus Pacotes" unificada

**Novo arquivo:** `src/components/public/MyPackagesSection.tsx`

- Botao "Meus Pacotes" abaixo de "Meus Agendamentos" no BookingPublic
- Fluxo: telefone -> lista unificada de pacotes + assinaturas ativos
- Para cada item, mostrar servicos com barras de progresso de uso
- Botao "Agendar Servico" que filtra apenas servicos com credito disponivel
- Ao confirmar, chama `create-booking` com o ID correspondente (pacote ou assinatura)

**Novo arquivo:** `src/components/public/PackageBookingFlow.tsx`

- Componente de agendamento simplificado (profissional -> data -> hora -> confirmar)
- Sem etapa de pagamento
- Recebe `customer_package_id` ou `customer_subscription_id` e `service_id`

### Fase 5 -- Banner + badges na aba Servicos

**Novo arquivo:** `src/components/public/PackageBanner.tsx`

- Quando cliente identificado (apos Step 5 telefone), verificar pacotes e assinaturas
- Se tiver beneficios ativos, mostrar banner informativo com botao "Usar meus beneficios"
- Badges nos cards de servicos: "Incluso no pacote (2 restantes)" ou "Incluso no plano (ilimitado)"
- Servicos continuam todos visiveis, badges sao apenas informativos
- Se selecionar servico coberto, pular etapa de pagamento automaticamente

**Novo arquivo:** `src/components/public/BenefitBadge.tsx`

- Badge reutilizavel que mostra origem (pacote/assinatura) e sessoes restantes

### Fase 6 -- Admin: Gestao no perfil do cliente

**Arquivo:** `src/components/CustomerPackagesTab.tsx` (renomear para `CustomerBenefitsTab.tsx`)

- Adicionar secao "Assinaturas Ativas" com uso do ciclo atual por servico
- Botao "Agendar" em pacotes e assinaturas que abre BookingModal com:
  - Cliente pre-selecionado
  - Servicos filtrados pelos disponiveis no pacote/assinatura
  - Sem etapa de pagamento

**Arquivo:** `src/hooks/useBookingModal.ts`

- Adicionar campos: `customer_package_id`, `customer_subscription_id`, `allowedServiceIds`, `preselectedCustomerId`

**Arquivo:** `src/components/modals/BookingModal.tsx`

- Se `customer_package_id` ou `customer_subscription_id` estiver setado:
  - Filtrar servicos por `allowedServiceIds`
  - Pre-preencher cliente
  - Passar IDs na chamada create-booking

### Fase 7 -- Aba "Assinaturas" publica

**Novo arquivo:** `src/components/public/SubscriptionPurchaseFlow.tsx`

- Aba ao lado de "Servicos" e "Pacotes" no BookingPublic
- Cards dos planos ativos com servicos inclusos e preco
- Fluxo: dados do cliente -> criar `customer_subscriptions` pending -> chamar `mp-create-subscription` -> redirecionar para MP

## Estrutura de arquivos novos

```text
src/components/public/
  MyPackagesSection.tsx         -- secao "Meus Pacotes" (pacotes + assinaturas)
  PackagePurchaseFlow.tsx       -- compra de pacote avulso
  SubscriptionPurchaseFlow.tsx  -- compra de assinatura
  PackageBookingFlow.tsx        -- agendamento usando pacote/assinatura
  PackageBanner.tsx             -- banner na aba servicos
  BenefitBadge.tsx              -- badge nos cards de servicos
```

## Detalhes tecnicos

### Edge Function create-booking -- novos parametros

```text
Interface CreateBookingRequest (adicionar):
  customer_package_id?: string
  customer_subscription_id?: string
```

A logica de decremento roda APOS a criacao do booking, usando `service_role` para bypass de RLS. Validacoes de sessoes disponiveis sao feitas antes de criar o booking para evitar uso indevido.

### Zustand store useBookingModal -- novos campos

```text
customer_package_id?: string | null
customer_subscription_id?: string | null
allowedServiceIds?: string[] | null
preselectedCustomerId?: string | null
```

### Ordem de implementacao

1. Edge Function (backend seguro)
2. Remover logica frontend
3. Separar compra de agendamento
4. Secao "Meus Pacotes"
5. Banner + badges
6. Admin: botao agendar + assinaturas
7. Aba "Assinaturas" publica

As fases 1-6 usam apenas tabelas e funcoes ja existentes. A fase 7 depende das tabelas de assinatura que ja estao criadas.
