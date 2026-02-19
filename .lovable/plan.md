

## Melhorias para Score de Qualidade Mercado Pago: 38 -> 83+

### Contexto

O score atual de 38/100 foi medido em um pagamento de **assinatura recorrente** (gerado pelo scheduler interno do MP), que nao carrega os campos enriquecidos do nosso codigo. O codigo em `mp-process-payment` ja envia todos os campos obrigatorios (items, notification_url, statement_descriptor, etc.), mas **nenhum pagamento passou por esse fluxo em producao ainda**.

### O que ja esta pronto (sem alteracoes necessarias)

Os seguintes campos **ja estao implementados** em `mp-process-payment` e serao contabilizados assim que um pagamento real passar pelo fluxo:

- `items[].id`, `items[].title`, `items[].description`, `items[].quantity`, `items[].unit_price`, `items[].category_id` (+14 pts)
- `notification_url` via `MP_WEBHOOK_URL` (+11 pts)
- `statement_descriptor` (+10 pts ja contados)
- `application_fee` (marketplace fee) ja implementado
- `device_id` / `X-meli-session-id` ja implementado no ultimo deploy

### Melhorias adicionais propostas (boas praticas)

Embora nao impactem diretamente a pontuacao, o MP recomenda enviar dados completos do pagador. Atualmente, o frontend (`BookingPublic.tsx`) so envia `payer.email` -- mas ja possui `customerPhone` e `customerName` disponveis no estado.

#### 1. Frontend: Enviar telefone e CPF do cliente no `payer` (BookingPublic.tsx)

Atualmente na linha 1850-1852:
```typescript
payer={{
  email: customerEmail || 'cliente@email.com',
}}
```

Alterar para incluir o telefone (ja disponivel como `customerPhone` no componente):
```typescript
payer={{
  email: customerEmail || 'cliente@email.com',
  identification: customerCpf ? { type: 'CPF', number: customerCpf.replace(/\D/g, '') } : undefined,
}}
```

#### 2. Backend: Enviar telefone do cliente no payer (mp-process-payment)

O backend ja tem acesso ao `booking.customer.phone`. Adicionar `payer.phone` no body do MP:

```typescript
payer: {
  email: payer?.email || booking.customer?.email || 'cliente@example.com',
  first_name: customerFirstName,
  last_name: customerLastName,
  identification: payer?.identification || undefined,
  // NOVO: adicionar telefone do cliente
  phone: booking.customer?.phone ? {
    area_code: booking.customer.phone.substring(0, 2),
    number: booking.customer.phone.substring(2),
  } : undefined,
},
```

Isso se aplica a **ambos os blocos** (PIX e Card) no `mp-process-payment`.

#### 3. Frontend: Enviar CPF na interface do MercadoPagoCheckout

A interface `PayerInfo` ja suporta `identification`, mas o `BookingPublic` nao envia o CPF quando disponivel. A alteracao e simples: passar `customerCpf` no campo `payer.identification` se ele existir.

### Detalhamento tecnico

| Arquivo | Alteracao | Impacto |
|---|---|---|
| `src/pages/BookingPublic.tsx` (linha 1850) | Enviar CPF no payer.identification | Boa pratica MP |
| `supabase/functions/mp-process-payment/index.ts` (linhas 169-174, 197-202) | Adicionar `phone` ao payer em ambos os blocos | Boa pratica MP |

### Acao principal: Teste manual obrigatorio

**A acao mais importante nao e uma alteracao de codigo** — e fazer um pagamento real com CARTAO via frontend Bricks. Isso fara o MP medir o score em um pagamento que inclui:

- Todos os campos de items (+14 pts)
- notification_url (+11 pts)
- SDK frontend Bricks (+10 pts)
- PCI / Secure Fields (+8 pts)
- Device ID (+2 pts)

**Score esperado apos um pagamento com cartao: 83-99 pontos** (acima da meta de 73).

### Resumo das alteracoes

1. **`src/pages/BookingPublic.tsx`**: Enviar `payer.identification` com CPF quando disponivel
2. **`supabase/functions/mp-process-payment/index.ts`**: Adicionar `payer.phone` com DDD e numero do cliente nos blocos PIX e Card

Sao alteracoes pequenas (aproximadamente 10 linhas no total) que complementam o que ja esta implementado, focando em dados do pagador para boas praticas.

