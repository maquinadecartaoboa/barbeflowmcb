

# Notificacoes WhatsApp que estao faltando

## Situacao atual

Eventos que JA enviam notificacao WhatsApp:
- Agendamento confirmado (create-booking)
- Lembrete de agendamento (send-booking-reminders, cron)
- Agendamento cancelado (Bookings.tsx envia via send-whatsapp-notification)
- Agendamento expirado por falta de pagamento (expire-pending-bookings)
- Pagamento recebido (mp-webhook, pagamento avulso)
- Assinatura ativada via cartao (mp-create-subscription)

## Eventos que NAO notificam e podem ser adicionados

### 1. Assinatura cancelada
- **Onde**: `mp-cancel-subscription/index.ts`
- **Quando**: Admin cancela assinatura do cliente
- **Mensagem**: Informar que a assinatura foi cancelada e convidar a reagendar

### 2. Assinatura pausada
- **Onde**: `mp-pause-subscription/index.ts`
- **Quando**: Admin pausa a assinatura
- **Mensagem**: Informar que a assinatura foi pausada e que pode ser reativada

### 3. Assinatura renovada (pagamento recorrente aprovado)
- **Onde**: `mp-webhook/index.ts` dentro de `handleSubscriptionPayment`
- **Quando**: Mercado Pago cobra automaticamente e pagamento e aprovado
- **Mensagem**: Informar que a renovacao foi processada, valor pago e nova validade (30 dias)

### 4. Assinatura ativada via redirect (checkout externo)
- **Onde**: `mp-webhook/index.ts` dentro de `handleSubscriptionPreapproval`
- **Quando**: Cliente assina via link de checkout MP (fluxo sem cartao in-site) e MP notifica ativacao
- **Mensagem**: Mesma mensagem de ativacao que ja existe no fluxo de cartao

## Implementacao tecnica

Todos os 4 casos seguem o mesmo padrao que ja existe em `mp-create-subscription`:
1. Buscar dados do cliente e plano no banco
2. Buscar conexao WhatsApp ativa do tenant
3. Montar mensagem formatada
4. Enviar para o `N8N_WEBHOOK_URL` com o payload padrao (type, phone, message, evolution_instance)

Nenhuma alteracao no n8n e necessaria -- o workflow existente ja aceita qualquer `type` e simplesmente encaminha a `message` para a Evolution API.

### Arquivos que serao editados

| Arquivo | Notificacao adicionada |
|---------|----------------------|
| `supabase/functions/mp-cancel-subscription/index.ts` | Assinatura cancelada |
| `supabase/functions/mp-pause-subscription/index.ts` | Assinatura pausada |
| `supabase/functions/mp-webhook/index.ts` | Assinatura renovada + Assinatura ativada via redirect |

### Detalhes

- Cada funcao precisara buscar o `customer` (nome, telefone) e o `plan` (nome, preco) via join na subscription
- A notificacao sera enviada APOS a atualizacao do status no banco, para nao bloquear o fluxo principal
- Erros de notificacao serao logados mas nao impedirao o processamento (try/catch isolado, mesmo padrao atual)
- As mensagens serao em portugues com emojis, seguindo o estilo existente

