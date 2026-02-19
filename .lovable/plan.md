

## Adequacao Mercado Pago — Atingir 73+ pontos

Baseado na sua analise de qualidade (28/100 atual), este plano implementa todas as correcoes necessarias em 3 edge functions para atingir a meta de 73+ pontos.

---

### Sprint 1 — Obrigatorios

#### 1. `mp-process-payment/index.ts` — Adicionar `notification_url`
- Ler `MP_WEBHOOK_URL` do env
- Adicionar `notification_url: webhookUrl` no body do pagamento (tanto PIX quanto cartao)

#### 2. `mp-create-subscription/index.ts` — Adicionar `notification_url`
- Ler `MP_WEBHOOK_URL` do env
- Adicionar `notification_url: webhookUrl` no body do `/preapproval`

---

### Sprint 2 — Recomendados

#### 3. `mp-process-payment/index.ts` — Adicionar `statement_descriptor`
- Usar `booking.tenant?.name?.substring(0, 22)` no body do pagamento

#### 4. `mp-process-payment/index.ts` — Adicionar array `items[]`
- Montar array items com `id`, `title`, `description`, `quantity`, `unit_price`, `category_id`
- Usar dados do `booking.service`

#### 5. `mp-process-payment/index.ts` — Payer completo para cartao
- Adicionar `first_name` e `last_name` no payer de pagamentos por cartao (igual ja faz no PIX)

#### 6. `mp-create-checkout/index.ts` — Adicionar `category_id` nos items
- Adicionar `category_id: "services"` no item da preference

#### 7. `mp-create-subscription/index.ts` — Adicionar `notification_url`
- Ja coberto no item 2

---

### Resumo de alteracoes por arquivo

**`supabase/functions/mp-process-payment/index.ts`** (4 alteracoes):
- `notification_url` no body (PIX e cartao)
- `statement_descriptor` no body
- Array `items[]` completo com `category_id`
- `first_name`/`last_name` no payer de cartao

**`supabase/functions/mp-create-checkout/index.ts`** (1 alteracao):
- `category_id: "services"` no item existente

**`supabase/functions/mp-create-subscription/index.ts`** (1 alteracao):
- `notification_url` no body do preapproval

---

### Projecao de pontuacao

| Fase | Pontos |
|------|--------|
| Atual | 28 pts |
| + notification_url (3 fluxos) | ~39 pts |
| + SSL/TLS (ja ok na infra) | ~55 pts |
| + statement_descriptor | ~65 pts |
| + items[] + category_id | ~78 pts |
| + payer completo | ~84 pts |

### Secao tecnica

Todas as alteracoes sao aditivas (novos campos nos payloads JSON). Nenhuma mudanca de banco, nenhuma dependencia nova. As 3 edge functions serao redeployadas automaticamente apos as alteracoes.

O secret `MP_WEBHOOK_URL` ja existe e esta configurado. Nenhum secret novo e necessario.

