# Modo GESTOR

**Plataforma SaaS completa de gestão para barbearias, salões e profissionais de beleza.**

Modo GESTOR centraliza agenda, financeiro, clientes, comissões e marketing em um único sistema multi-tenant, com página pública de agendamento, pagamentos online (Mercado Pago) e automações via WhatsApp.

🌐 **Site oficial:** [modogestor.com.br](https://modogestor.com.br)

---

## ✨ Funcionalidades

### 📅 Agenda e Agendamentos
- Grade visual com detecção de conflitos e encaixe forçado (admin)
- Agendamentos recorrentes (semanais, quinzenais, mensais)
- Bloqueios de horário por padrão (regras) ou pontuais
- Página pública white-label com link próprio do estabelecimento
- Agendamento via WhatsApp (engine de conversação)

### 💰 Financeiro e Caixa
- Sessões diárias de caixa (abertura/fechamento)
- Comandas unificadas com múltiplos itens (serviços, produtos, pacotes)
- Despesas categorizadas e fluxo de caixa
- Conta corrente do cliente (débitos e créditos)
- Mais de 80 relatórios gerenciais (clientes, profissionais, serviços, produtos, agenda, caixa)

### 👥 Clientes e Fidelização
- Cadastro com aniversário, endereço e histórico completo
- Cartão Fidelidade digital com selos e recompensas
- Pacotes de serviços com sessões controladas
- Assinaturas recorrentes (mensalidades) via Mercado Pago
- Política de risco por cancelamentos consecutivos

### 👨‍💼 Profissionais e Comissões
- Comissões em dois pilares: itens pagos (snapshots) e fichas de assinatura
- Horários e folgas individuais
- Relatórios de produtividade, faturamento e workdays

### 🚀 Alta Performance (Crescimento)
- Desconto Garantia de Comparecimento (incentivo a pagamento online)
- Order Bump na finalização do agendamento
- Resumo semanal de performance via WhatsApp
- Conteúdo gerado por IA (descrições de serviços, produtos e planos)

### 🔔 Comunicação
- Notificações automáticas via WhatsApp (Evolution API)
- Push notifications (PWA)
- Lembretes de 24h e 1h antes do atendimento
- Mensagens de saudação e ausência configuráveis

### 💳 Pagamentos
- Integração Mercado Pago (PIX, cartão, assinaturas)
- Split de comissão da plataforma (marketplace)
- Reembolso parcial automático em No-Show
- Stripe para assinaturas dos estabelecimentos

### 🛡️ Administração da Plataforma
- Painel admin com KPIs SaaS (MRR, LTV, Churn)
- Gestão de tenants, planos e cobranças
- Domínio personalizado (white-label)
- Conformidade legal (LGPD) com aceite obrigatório de termos

---

## 🧱 Stack Técnica

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Edge Functions Deno + Auth + Storage + RLS)
- **Pagamentos:** Mercado Pago (clientes finais) + Stripe (assinaturas SaaS)
- **WhatsApp:** Evolution API
- **PWA:** Service Worker com push notifications
- **Hospedagem:** Lovable / Vercel

---

## 🚀 Desenvolvimento local

Pré-requisitos: Node.js 18+ e npm.

```sh
# Clone o repositório
git clone <URL_DO_REPO>
cd modo-gestor

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento
npm run dev
```

As variáveis de ambiente do Supabase já vêm configuradas em `.env`.

---

## 📂 Estrutura do projeto

```
src/
├── components/      # Componentes React (UI, modais, relatórios, settings)
├── pages/           # Páginas/rotas da aplicação
├── hooks/           # Custom hooks (auth, tenant, subscription, etc.)
├── providers/       # Context providers (Auth, Tenant, Theme)
├── integrations/    # Cliente Supabase
└── lib/             # Utilitários

supabase/
├── functions/       # Edge Functions (Mercado Pago, WhatsApp, IA, webhooks)
└── migrations/      # Migrations do banco de dados
```

---

## 📝 Licença

Software proprietário © Modo GESTOR. Todos os direitos reservados.
