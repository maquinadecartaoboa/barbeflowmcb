
# Plano de Evolucao - BarberFlow

## Resumo Executivo

Reorganizar e expandir o BarberFlow com 9 recursos-chave, eliminando redundancias (ex: aba Calendario) e consolidando funcionalidades na Dashboard e nas abas corretas.

---

## O que ja existe vs. O que precisa ser construido

| Recurso | Status Atual |
|---------|-------------|
| Agendamento online (publico) | Funcional |
| Lembretes automaticos (WhatsApp) | Funcional (Edge Function + Cron) |
| Recorrencia de agendamento (Clientes Fixos) | Funcional |
| Produtos e vendas | Funcional |
| Relatorios basicos (Financeiro com graficos) | Parcial |
| Debito/credito de cliente | Nao existe |
| Pacotes com baixa automatica | Nao existe |
| Baixa de pagamento de profissionais | Nao existe |
| Comissoes para barbeiros (servicos + produtos) | Parcial (campo commission_percent em staff_services existe, mas sem calculo) |
| Assinaturas e gerenciamento de planos | Nao existe |

---

## Fase 1 - Reorganizacao e Limpeza

### 1.1 Remover aba "Calendario" e integrar na Dashboard

- Remover rota `/app/agenda` e pagina `Agenda.tsx`
- Remover do `navigationItems` e `bottomTabItems` no `AppShell.tsx`
- Mover a visualizacao semanal compacta para dentro da Dashboard, abaixo dos stats e ao lado dos "Proximos Agendamentos"
- No mobile bottom tab, substituir "Calendario" por "Agendamentos"

### 1.2 Reorganizar navegacao lateral

Nova estrutura proposta:
- Dashboard (com mini-calendario embutido)
- Agendamentos
- Clientes (absorve "Clientes Fixos" como sub-aba)
- Servicos
- Profissionais
- Financeiro (absorve "Produtos" como sub-aba)
- WhatsApp
- Configuracoes

Isso reduz de 11 itens para 8 no menu.

---

## Fase 2 - Debito e Credito de Cliente

### Objetivo
Permitir que o barbeiro registre saldo devedor ou credito para um cliente (ex: "ficou devendo R$20" ou "pagou adiantado R$50").

### Banco de Dados
Nova tabela `customer_balance_entries`:
- `id` (uuid, PK)
- `tenant_id` (uuid, NOT NULL)
- `customer_id` (uuid, NOT NULL, FK -> customers)
- `type` ("credit" | "debit")
- `amount_cents` (integer, NOT NULL)
- `description` (text)
- `staff_id` (uuid, nullable)
- `booking_id` (uuid, nullable)
- `created_at` (timestamptz)

RLS: `user_belongs_to_tenant(tenant_id)`

### Frontend
- Na pagina de detalhes do cliente (modal existente em Customers.tsx), adicionar aba "Saldo" com:
  - Saldo atual (soma de creditos - debitos)
  - Historico de lancamentos
  - Botao para adicionar credito ou debito
- Badge de saldo na lista de clientes (verde se credito, vermelho se debito)

---

## Fase 3 - Pacotes com Baixa Automatica

### Objetivo
Vender pacotes de servicos (ex: "10 cortes por R$250") e dar baixa automatica a cada agendamento concluido.

### Banco de Dados

Tabela `service_packages`:
- `id` (uuid, PK)
- `tenant_id` (uuid)
- `name` (text) - Ex: "Pacote 10 Cortes"
- `service_id` (uuid, FK -> services)
- `total_sessions` (integer) - Ex: 10
- `price_cents` (integer) - Ex: 25000
- `active` (boolean, default true)
- `created_at`, `updated_at`

Tabela `customer_packages`:
- `id` (uuid, PK)
- `tenant_id` (uuid)
- `customer_id` (uuid, FK -> customers)
- `package_id` (uuid, FK -> service_packages)
- `sessions_used` (integer, default 0)
- `sessions_total` (integer)
- `status` ("active" | "completed" | "cancelled")
- `purchased_at` (timestamptz)
- `expires_at` (timestamptz, nullable)
- `created_at`

RLS: `user_belongs_to_tenant(tenant_id)` em ambas.

### Logica de Baixa
- Ao completar um agendamento (`status -> completed`), verificar se o cliente tem pacote ativo para aquele servico
- Se sim, incrementar `sessions_used` e nao gerar cobranca adicional
- Se `sessions_used == sessions_total`, marcar pacote como `completed`
- Implementar via trigger no banco OU logica no frontend ao atualizar status do booking

### Frontend
- Nova sub-aba "Pacotes" dentro de Servicos
- No modal de detalhes do cliente, mostrar pacotes ativos e sessoes restantes
- Indicador visual no agendamento quando esta usando pacote

---

## Fase 4 - Baixa de Pagamento de Profissionais (Comissionamento)

### Objetivo
Registrar pagamentos feitos aos profissionais (comissoes, adiantamentos, acertos).

### Banco de Dados

Tabela `staff_payments`:
- `id` (uuid, PK)
- `tenant_id` (uuid)
- `staff_id` (uuid, FK -> staff)
- `type` ("commission" | "advance" | "bonus" | "deduction")
- `amount_cents` (integer)
- `reference_period_start` (date, nullable)
- `reference_period_end` (date, nullable)
- `notes` (text, nullable)
- `paid_at` (timestamptz, nullable)
- `status` ("pending" | "paid")
- `created_at`

RLS: `user_belongs_to_tenant(tenant_id)`

### Frontend
- Nova sub-aba "Pagamentos" dentro de Profissionais
- Resumo por profissional: comissao acumulada no periodo vs. ja pago
- Botao "Registrar Pagamento" com valor, tipo, e data
- Integrar com o filtro de data global

---

## Fase 5 - Sistema de Comissoes (Servicos + Produtos)

### Objetivo
Calcular comissoes automaticamente para barbeiros sobre servicos e vendas de produtos.

### Banco de Dados
- Utilizar campo existente `staff_services.commission_percent` (ja existe mas nao esta sendo usado)
- Adicionar coluna `staff_id` na tabela `product_sales` (para saber quem vendeu)
- Adicionar tabela ou campo de comissao padrao em `staff` (`default_commission_percent`)

### Logica
- Comissao de servico: `booking.service.price_cents * staff_services.commission_percent / 100`
- Comissao de produto: `product_sale.sale_price_snapshot_cents * staff.default_commission_percent / 100` (ou percentual especifico por produto)
- Calcular automaticamente no painel Financeiro, filtrado por periodo e profissional

### Frontend
- No cadastro de profissional, campo para definir percentual de comissao por servico (ja tem o campo no banco, falta UI)
- Na pagina Financeiro, nova secao "Comissoes" com:
  - Tabela: Profissional | Servicos (R$) | Produtos (R$) | Total Comissao | Status Pagamento
  - Botao para gerar baixa de pagamento (integra com Fase 4)

---

## Fase 6 - Relatorios Avancados

### Objetivo
Expandir os relatorios existentes no Financeiro.

### Novos Relatorios
- **Relatorio de Comissoes**: detalhado por profissional e periodo
- **Relatorio de Pacotes**: vendas, baixas, pacotes ativos
- **Relatorio de Clientes**: frequencia, ticket medio, debitos pendentes
- **Relatorio de Produtos**: vendas por periodo, margem de lucro, ranking

### Frontend
- Nova sub-aba "Relatorios" no Financeiro com cards clicaveis para cada tipo
- Manter exportacao CSV existente e expandir para cada relatorio
- Graficos com Recharts (ja instalado)

---

## Fase 7 - Assinaturas e Planos (SaaS)

### Objetivo
Gerenciar planos de assinatura dos parceiros (barbearias) que usam o BarberFlow.

### Banco de Dados

Tabela `plans`:
- `id` (uuid, PK)
- `name` (text) - "Basico", "Pro", "Premium"
- `price_cents` (integer)
- `billing_cycle` ("monthly" | "yearly")
- `features` (jsonb) - lista de features habilitadas
- `max_staff` (integer, nullable)
- `max_bookings_month` (integer, nullable)
- `active` (boolean)

Tabela `subscriptions`:
- `id` (uuid, PK)
- `tenant_id` (uuid, FK -> tenants)
- `plan_id` (uuid, FK -> plans)
- `status` ("active" | "past_due" | "cancelled" | "trial")
- `current_period_start` (timestamptz)
- `current_period_end` (timestamptz)
- `trial_ends_at` (timestamptz, nullable)
- `cancelled_at` (timestamptz, nullable)
- `external_subscription_id` (text, nullable) - Ref MP/Stripe
- `created_at`

### Frontend
- Pagina "Planos" acessivel em Configuracoes (sub-aba)
- Cards com planos disponiveis, plano atual destacado
- Botao para upgrade/downgrade
- Historico de faturas
- Banner de aviso quando plano esta vencendo ou em atraso

### Nota
A integracao de pagamento de assinaturas pode usar o Mercado Pago ja conectado ou Stripe. A implementacao completa do gateway de pagamento recorrente sera feita como etapa posterior.

---

## Detalhes Tecnicos

### Migracao de Banco (ordem)
1. `customer_balance_entries` (Fase 2)
2. `service_packages` + `customer_packages` (Fase 3)
3. `staff_payments` (Fase 4)
4. ALTER `product_sales` ADD `staff_id` uuid + ALTER `staff` ADD `default_commission_percent` numeric (Fase 5)
5. `plans` + `subscriptions` (Fase 7)

### Ajustes no Frontend (ordem)
1. Reorganizacao de navegacao e remocao do Calendario (Fase 1)
2. Tela de debito/credito no modal de clientes (Fase 2)
3. Sub-aba Pacotes em Servicos + logica de baixa (Fase 3)
4. Sub-aba Pagamentos em Profissionais (Fase 4)
5. UI de comissoes no Financeiro + cadastro no Staff (Fase 5)
6. Relatorios expandidos (Fase 6)
7. Planos e assinaturas em Configuracoes (Fase 7)

### Edge Functions novas
- Nenhuma nova obrigatoria nas Fases 1-6 (tudo pode ser feito client-side com RLS)
- Fase 7 pode precisar de edge function para processar webhooks de pagamento recorrente

### Impacto em funcionalidades existentes
- A pagina `Bookings.tsx` ganha logica de verificacao de pacotes ao completar agendamento
- A pagina `Finance.tsx` ganha secao de comissoes
- `Staff.tsx` ganha campo de comissao e sub-aba de pagamentos
- `Customers.tsx` ganha aba de saldo e pacotes
- `Products.tsx` ganha campo de vendedor (staff_id)

---

## Ordem de Implementacao Sugerida

1. **Fase 1** - Reorganizacao (rapido, sem banco)
2. **Fase 5** - Comissoes (aproveita campo existente, alto valor)
3. **Fase 2** - Debito/Credito de cliente
4. **Fase 4** - Baixa de pagamento de profissionais
5. **Fase 3** - Pacotes (mais complexo)
6. **Fase 6** - Relatorios
7. **Fase 7** - Assinaturas (mais estrategico, pode ser feito por ultimo)

Cada fase sera implementada de forma independente para permitir testes incrementais.
