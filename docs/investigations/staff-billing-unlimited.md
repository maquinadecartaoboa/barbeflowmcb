# Investigação: cobrança fantasma de "profissional extra" em tenants ilimitado

**Data:** 2026-05-07
**Origem:** UI em `BillingTab.tsx:348-352` exibia "N profissional(is) adicional(is) — +R$ X/mês" para tenants no plano ilimitado.
**Status:** investigação concluída, **nenhuma alteração de código aplicada** além do fix cosmético já em PR (`fix/staff-billing-unlimited-plan`).

---

## TL;DR

1. **Apenas 1 tenant** se enquadra no caso (Adriano Alves, slug `adrianoalves`), com `additional_professionals=3` no banco.
2. **Stripe está OK**: a subscription `sub_1T0LOtCxw1gIFu9gELuEnV9d` tem **apenas 1 line_item** (Ilimitado R$ 109,90, qty=1). **Nenhum item de "Profissional Extra"**. Última cobrança = R$ 98,91 (Ilimitado com 10% off). **Nenhum dinheiro indevido foi cobrado.**
3. **Bug é dessincronia banco↔Stripe + UI**: o banco tem o valor 3, o Stripe tem 0. Nenhum impacto financeiro real.
4. **Causa-raiz no código:** `update-subscription-quantity` no plano ilimitado **grava o input no banco sem propagar pro Stripe** (e sem checar se faz sentido). `change-plan` também não toca o campo nem remove line_items extras (potencial bug futuro, não disparado nesse caso).
5. **Recomendação:** três fixes pequenos no backend + 1 backfill one-shot. Frontend já corrigido (PR `fix/staff-billing-unlimited-plan`).

---

## 1. SQL — tenants afetados

```sql
SELECT t.id, t.name, t.slug, ss.plan_name, ss.billing_interval,
       ss.additional_professionals, ss.status, ss.current_period_end,
       ss.stripe_subscription_id
FROM stripe_subscriptions ss
JOIN tenants t ON t.id = ss.tenant_id
WHERE ss.additional_professionals > 0
ORDER BY ss.plan_name DESC, t.name;
```

**Resultado: 1 linha.**

| tenant | slug | plan | interval | additional_professionals | status | sub_id |
|---|---|---|---|---|---|---|
| Adriano Alves | `adrianoalves` | ilimitado | month | **3** | active | `sub_1T0LOtCxw1gIFu9gELuEnV9d` |

> Nota: `adrianoalves` está em `EXEMPT_TENANT_SLUGS` (`useSubscription.ts:83`), então no frontend o plano é forçado a "ilimitado active" mesmo que a subscription Stripe falhasse. No caso real a subscription Stripe está ativa de verdade — não é só o force frontend.

---

## 2. Stripe — confirmação empírica

### Subscription `sub_1T0LOtCxw1gIFu9gELuEnV9d`

```
status: active
customer: cus_Ty2GAupOxXrZmY
currency: brl
items.total_count: 1   ← APENAS 1 ITEM
items.data[0]:
  - price: price_1T40Q1Cxw1gIFu9gQgXMbjrr (Ilimitado mensal R$ 109,90)
  - quantity: 1
  - product: prod_U24ZNzDkfp2fU5
current_period: 2026-04-07 → 2026-05-07
```

**Não existe item de "Profissional Extra"** (que usaria o price `STRIPE_PRICE_ADDITIONAL_PROFESSIONAL`). A subscription está limpa.

### Últimas 5 invoices do customer

| invoice | reason | amount_due | status |
|---|---|---|---|
| `in_1TK33I…` | subscription_cycle | R$ 98,91 | paid |
| `in_1T8nh8…` | subscription_cycle | R$ 98,91 | paid |
| `in_1T7iG2…` | subscription_update | R$ 0,00 | paid |
| `in_1T5Q5V…` | subscription_cycle | R$ 109,90 | **uncollectible** |
| `in_1T0LOr…` | subscription_create | R$ 0,00 | paid (trial) |

R$ 98,91 = R$ 109,90 com ~10% off (cupom ativo). **Sem nenhum line item adicional**. Confirma que o Stripe nunca cobrou "extras" desse tenant.

### Histórico do tenant

A primeira invoice (`in_1T0LOr…` — `subscription_create`) já foi do plano Ilimitado. **O Adriano nunca esteve no plano profissional** — não houve upgrade. Isso responde por que a hipótese "change-plan deixa item antigo no Stripe" não se aplicou aqui.

---

## 3. Análise do código

### `change-plan/index.ts` — bug latente, NÃO disparado nesse caso

```ts
// Linha 138-147
const updatedSub = await stripe.subscriptions.update(sub.id, {
  items: [
    {
      id: sub.items.data[0].id,  // ⚠️ APENAS o primeiro item
      price: priceId,
    },
  ],
  proration_behavior: "create_prorations",
});
```

Problemas:
- **Só atualiza `sub.items.data[0]`.** Se a subscription tiver um segundo line_item (price `STRIPE_PRICE_ADDITIONAL_PROFESSIONAL`), ele permanece intacto após o "upgrade" pra ilimitado → Stripe continuaria cobrando R$ 14,90 × N indefinidamente.
- **Não atualiza `additional_professionals` no banco** ao migrar pra ilimitado (deveria zerar).

**Não foi disparado pro Adriano** porque ele nunca passou pelo profissional. Mas é um bug real esperando o primeiro tenant que fizer upgrade com extras já configurados.

### `update-subscription-quantity/index.ts` — disparado, dessincroniza banco

```ts
// Linha 77-87
// Plano Ilimitado não cobra por profissionais adicionais
if (subData.plan_name === "ilimitado") {
  logStep("Ilimitado plan - skipping Stripe quantity update");
  await supabaseAdmin
    .from("stripe_subscriptions")
    .update({ additional_professionals: additional_count, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
  return new Response(JSON.stringify({ success: true, additional_count, unlimited: true }), …);
}
```

O comentário diz "skipping Stripe quantity update" mas a função **ainda grava `additional_count` no banco**. Esse `additional_count` é arbitrário (vem do input do client em `Staff.tsx:432`, calculado como `getActiveStaffCount - 1`).

Resultado: para o plano ilimitado, o campo `additional_professionals` no banco **passa a refletir "staff ativos − 1"**, que não tem significado financeiro nenhum. Mas a UI lê esse campo e supõe que tem.

### `Staff.tsx` — quem dispara o problema

| Onde | Linha | Faz gate por plano? |
|---|---|---|
| `checkAndConfirmExtra` (ativar staff) | 197 | ✅ `if (features.unlimitedStaff) return false;` |
| `executeToggle` (desativar staff) | 430-438 | ❌ chama `updateSubscriptionQuantity(extras)` sem checar plano |

A entrada do problema é o desativar staff: roda mesmo no ilimitado, chama USQ, que grava o número no banco. A UI então mostra a string fantasma.

---

## 4. Propostas de fix (sem implementar)

### Fix 1 — `update-subscription-quantity` (mais defensivo)

Em vez de gravar o input recebido no banco quando plano é ilimitado, **forçar 0 ou pular o UPDATE inteiro**:

```ts
if (subData.plan_name === "ilimitado") {
  logStep("Ilimitado plan - no quantity tracking needed");
  // Garante valor consistente: ilimitado nunca tem extras
  await supabaseAdmin
    .from("stripe_subscriptions")
    .update({ additional_professionals: 0, updated_at: new Date().toISOString() })
    .eq("tenant_id", tenantId);
  return new Response(JSON.stringify({ success: true, additional_count: 0, unlimited: true }), …);
}
```

**Risco:** baixo. Idempotente. Faz o banco refletir o que já é verdade no Stripe.

### Fix 2 — `Staff.tsx:430` (não chamar USQ no plano ilimitado)

```ts
// Antes:
if (!willBeActive && hasActiveSubscription) {
  …
  await updateSubscriptionQuantity(extras);
}

// Depois:
if (!willBeActive && hasActiveSubscription && !features.unlimitedStaff) {
  …
  await updateSubscriptionQuantity(extras);
}
```

**Risco:** baixo. Evita chamada desnecessária pro backend. Frontend já tem `features.unlimitedStaff` no escopo (linha 79).

### Fix 3 — `change-plan` (preventivo, ainda não disparou em produção)

Ao migrar pra ilimitado, **remover** explicitamente line_items que não sejam o price base, e **zerar** o campo no banco:

```ts
// Após o stripe.subscriptions.update():
if (plan === "ilimitado") {
  const fullSub = await stripe.subscriptions.retrieve(updatedSub.id);
  const additionalPriceId = Deno.env.get("STRIPE_PRICE_ADDITIONAL_PROFESSIONAL");
  for (const item of fullSub.items.data) {
    if (item.price.id === additionalPriceId) {
      await stripe.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
    }
  }
  await supabaseAdmin
    .from("stripe_subscriptions")
    .update({ additional_professionals: 0, updated_at: new Date().toISOString() })
    .eq("tenant_id", ut.tenant_id);
}
```

**Risco:** médio. Toca Stripe (cancela line_item). Idempotente — se não houver item, loop não faz nada. Recomendo testar com um tenant de teste antes.

### Fix 4 — Backfill one-shot (1 linha afetada)

```sql
UPDATE stripe_subscriptions
SET additional_professionals = 0,
    updated_at = now()
WHERE plan_name = 'ilimitado' AND additional_professionals > 0;
```

Hoje: 1 linha (Adriano). Se aplicar Fix 1, não precisa correr de novo no futuro.

---

## 5. Recomendação final

**Aplicar Fix 1 + Fix 2 + Backfill (4)** como bundle pequeno de correção. Fix 3 (change-plan) pode ser separado, é preventivo. Frontend (BillingTab) já está coberto pelo PR `fix/staff-billing-unlimited-plan`.

Ordem sugerida:
1. Backfill (4) — corrige o caso atual imediatamente.
2. Fix 1 — evita reintrodução pelo USQ.
3. Fix 2 — economia: nem chama USQ no plano ilimitado.
4. (Opcional, separado) Fix 3 — blinda upgrades futuros.

Volume potencial reaberto sem Fix 3: cada novo tenant que upgrade com extras deixaria item ativo no Stripe — **isso seria cobrança indevida real**, diferente do caso atual.

---

## 6. Limitações desta investigação

- Verificado apenas o universo atual (snapshot 2026-05-07). Não há histórico de quantas vezes o USQ rodou pra cada tenant ilimitado.
- Não foi reproduzido o cenário de upgrade profissional→ilimitado com extras ativos. O bug em `change-plan` é deduzido por leitura do código.
- Stripe Customer Portal pode ter sido usado pelo Adriano pra remover algum item manualmente — não checado. Mas como nunca esteve no profissional (subscription_create já foi ilimitado), provavelmente nunca houve item pra remover.
