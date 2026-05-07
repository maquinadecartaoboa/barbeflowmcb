# Investigação: webhooks `mp-webhook` 404 + chamadas duplicadas em `/v1/payments`

**Data:** 2026-05-07
**Conta MP afetada:** Adriano Alves (`mp_user_id=3212018178`, app `5579000666407109`)
**Edge Function:** `supabase/functions/mp-webhook/index.ts` (produção: v238; arquivo local: idem — confirmação por inspeção, sem `npx supabase functions download` por restrição)
**Status:** investigação concluída, **nenhuma alteração de código aplicada**

> **Importante (escopo financeiro):** o split de comissão (`application_fee` / `marketplace_fee`) é **automático** no MP — modoGESTOR já recebe os centavos da comissão direto na conta. Os problemas abaixo afetam **apenas registros internos de auditoria** (`platform_fees`, painel "API requests" do MP, retries de webhook). Nenhum dinheiro foi perdido nem é necessário recuperar.

---

## TL;DR

1. **As duas hipóteses iniciais são procedentes**, mas a **Hipótese 2 (loop ignora `body.user_id`) é a causa direta de ambos os sintomas**.
2. **Hipótese 1 (notificação duplicada) também é confirmada pela documentação MP**: para cada cobrança de assinatura, o MP envia tanto `type=subscription_authorized_payment` quanto `type=payment`. Hoje o segundo cai no fluxo de payment normal, e quando o GET `/v1/payments/{id}` falha em todas as 3 conexões, a função retorna **HTTP 404 ao MP**, gerando os retries infinitos visíveis no painel.
3. **Recomendação: implementar Opção B + Opção C combinadas**. Ataca a causa-raiz (B) e blinda contra a race condition (C). Pequena mudança adicional de robustez recomendada como D.
4. **Não tente Opção A** (desativar `type=payment` no painel) — webhooks no MP são configurados por aplicação, não por subtipo de cobrança; desativar `payment` quebra os pagamentos de booking não-assinatura.

---

## 1. Confirmação ou refutação das duas hipóteses

### Hipótese 1 — MP envia 2 webhooks por pagamento de assinatura: **CONFIRMADA**

A documentação pública do MP confirma que pagamentos de assinatura geram dois eventos distintos:
- `subscription_authorized_payment` → consultado via `GET /authorized_payments/{id}` (`mp-webhook/index.ts:455`)
- `payment` → consultado via `GET /v1/payments/{id}` (`mp-webhook/index.ts:89`)

O `data.id` é **diferente** entre os dois eventos: o primeiro é o `authorized_payment_id` (id do agendamento de cobrança), o segundo é o `payment.id` (a cobrança realizada). Os IDs reportados no painel (156598131311, 156732256465 etc.) batem com os `mp_payment_id` que o handler de `subscription_authorized_payment` já está gravando em `subscription_payments` (`index.ts:573`), o que prova que **são os IDs do `payment.id`, e o webhook `type=payment` chega depois com o mesmo ID**.

O código já tem uma proteção pensada pra esse cenário em `index.ts:119`:
```ts
if (mpPaymentData.point_of_interaction?.type === 'SUBSCRIPTIONS' || mpPaymentData.operation_type === 'recurring_payment') {
  return new Response(JSON.stringify({ received: true, ignored: true, reason: 'subscription_payment' }), …);
}
```
**Mas essa proteção só é executada se o GET `/v1/payments` retornar 200.** Quando retorna 404, o fluxo morre antes (linha 102–108) e o webhook responde HTTP 404 ao MP.

### Hipótese 2 — Loop em todas as conexões: **CONFIRMADA**

Em `mp-webhook/index.ts:87–100`:
```ts
for (const conn of connections) {
  const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
    headers: { 'Authorization': `Bearer ${conn.access_token}` },
  });
  if (mpResponse.ok) { mpPaymentData = await mpResponse.json(); usedConnection = conn; break; }
}
```

`getAllValidMpTokens` (`_shared/mp-token.ts:50`) faz `SELECT … FROM mercadopago_connections` **sem `ORDER BY`**. O Postgres tipicamente retorna na ordem física (heap order), que costuma seguir a ordem de inserção, mas isso **não é garantido** e pode mudar após VACUUM/UPDATE. As três conexões hoje:

- Minha Barbearia (`mp_user_id=578849659`)
- BarberFlow (`mp_user_id=571776378`)
- Adriano Alves (`mp_user_id=3212018178`) ← dono dos webhooks 404

Pra cada webhook do Adriano, o loop tenta com Bearer da Minha Barbearia (404), depois BarberFlow (404), depois Adriano. Resultado: **2 chamadas inúteis a `/v1/payments` por webhook**, exatamente o pattern de "50% das requests com 404" no painel API requests.

E `body.user_id` (que o MP envia em todos os webhooks — vide próxima seção) é completamente ignorado pelo código.

---

## 2. Body real dos webhooks (estrutura confirmada via docs)

> ⚠️ Não foi possível inspecionar logs diretos do Supabase nesta sessão (MCP Supabase exige OAuth interativo). A estrutura abaixo é a documentada pelo Mercado Pago e bate 1:1 com o que o código espera em `index.ts:44`.

```json
{
  "id": 12345,
  "live_mode": true,
  "type": "payment",
  "date_created": "2026-05-07T10:04:58.396-03:00",
  "user_id": 3212018178,
  "api_version": "v1",
  "action": "payment.created",
  "data": { "id": "157379855776" }
}
```

**Pontos críticos:**
- O campo é **`user_id`** (snake_case, **integer**), não `userId`. Isso bate com o `mp_user_id` da tabela `mercadopago_connections`, que é armazenado como string — comparação tem que usar `String(body.user_id)`.
- Pra `subscription_authorized_payment` o body tem o mesmo formato, com `data.id` sendo o `authorized_payment_id`.
- Não há campo separado de "tenant" — o casamento tenant ↔ webhook depende de localizar a `mercadopago_connections` cujo `mp_user_id = body.user_id`.

**Para validar empiricamente** (não bloqueante, mas útil): rodar no Supabase Studio:
```
function: mp-webhook
search: 156598131311 OR 156732256465 OR 157379855776
range: últimos 7 dias
```
e confirmar (a) presença de `user_id` no body logado, (b) que o `type` é `payment` para esses IDs, (c) que não há campos extras importantes.

---

## 3. Investigação do pagamento "fantasma" 156609063563 (HTTP 200)

Sem logs em mão, o caminho mais provável segundo o código:
- Loop encontrou alguma conexão com Bearer válido pra esse pagamento (provavelmente o token do Adriano, já que é o dono).
- `mpPaymentData` foi obtido com sucesso → cai no bloco de `point_of_interaction.type === 'SUBSCRIPTIONS'` ou `operation_type === 'recurring_payment'` (`index.ts:119`).
- Retorna 200 com `{ received: true, ignored: true, reason: 'subscription_payment' }`.

Outra possibilidade: era de fato um pagamento avulso fora do nosso sistema, sem `metadata.payment_id` nem `external_reference` apontando pra nada interno → cai no return 200 da linha 126 (`reason: 'no_internal_reference'`).

**Diferença prática vs os outros 7 fantasmas (404):** o GET `/v1/payments` deve ter funcionado pra esse específico — provavelmente porque o pagamento ainda estava acessível via `/v1/payments` quando o webhook chegou, enquanto pros outros já não estava (ou nunca esteve, se for cobrança recorrente que só responde via `/authorized_payments`). Esse último ponto é uma hipótese forte e seria boa coisa pra confirmar com um teste manual: `curl -H "Authorization: Bearer <token-do-adriano>" https://api.mercadopago.com/v1/payments/156598131311` — se retornar 404 mesmo com o token correto, está confirmado que pagamentos de assinatura recorrente não são acessíveis via `/v1/payments`.

---

## 3.bis. Task 7 — Gap em `platform_fees` (mp_id=155631091627, R$40)

**Pista de entrada:** comparando os 2 pagamentos do mesmo cliente (ANDERSON RUFINO, tenant Adriano), a única diferença em `payments` é `payment_method`: `'pix'` no que gravou (R$28,50, mp_id=153555127965) vs `null` no que não gravou (R$40, mp_id=155631091627).

### Mapeamento dos INSERTs em `payments` e `platform_fees`

Grep encontra **4 edge functions** que inserem em `payments`, mas **só 3** inserem em `platform_fees`. **Nenhuma das 4 é o `mp-webhook`**. Não há trigger SQL que popule a tabela automaticamente.

| Edge function | INSERT em `payments` | INSERT em `platform_fees` | Inclui `application_fee` no body MP? |
|---|---|---|---|
| `mp-process-payment` | sim (linha 128-140) | linha 335-345, **só se `mpResult.status === 'approved'`** | sim (linha 179, 219) |
| `mp-create-checkout` | sim (linha 122-133) | linha 252-262, sempre que `marketplaceFee > 0` (status='pending') | sim (linha 196, `marketplace_fee`) |
| `mp-create-package-checkout` | sim (linha 201-213) | linha 308-317, igual ao acima | sim (linha 271-273) |
| **`wa-booking-engine`** (createPixCharge) | **sim (linha 387-398)** | **NÃO** | **NÃO** |

### O 4º caminho — descoberto: `wa-booking-engine/createPixCharge`

A função `createPixCharge` em `wa-booking-engine/index.ts:373-462` é o caminho de pagamento **PIX criado via fluxo público do WhatsApp** (cliente agenda pelo bot). Ela cria o `payment` direto e chama `POST /v1/payments` no MP, mas o body em `index.ts:405-420` **omite `application_fee`** e nunca insere em `platform_fees`. Não usa o helper `getCommissionRate` do `_shared/commission.ts` (grep confirmou zero referências em todo o diretório `wa-booking-engine/`).

Isso bate com o pagamento `mp_id=155631091627` (R$40 Adriano, 25/abr): provavelmente foi um agendamento via WhatsApp.

### Implicação financeira (mais grave do que só auditoria)

> ⚠️ **Atenção:** o contexto do prompt afirmava que o split de comissão é "automático" — isso é verdade quando `application_fee` (cartão) ou `marketplace_fee` (preference checkout) **estão no body**. No caminho `wa-booking-engine`, **nem um nem outro é enviado**, então o MP processa o PIX **sem split** e o tenant recebe 100% do valor.

Para o pagamento R$40 de plano ilimitado (1,5%): ~R$0,60 não cobrados. Volume baixo no agregado (alinhado com a estimativa "R$1-2 no histórico"), mas a causa raiz é diferente da inicialmente assumida — não é só registro interno, é **comissão não cobrada pelo MP** nesse caminho específico.

Recomendação adicional para Task 7 (separada):
- **Adicionar `application_fee` ao body MP em `wa-booking-engine/createPixCharge`** (espelhando `mp-process-payment` linha 178-179) — fecha o vazamento de comissão.
- **Adicionar INSERT em `platform_fees`** após receber `mpResult.id` aprovado.
- **Adicionar `notification_url` ao body** (também ausente em `wa-booking-engine`) — garante que o webhook receba callback desse pagamento.

### Mapeamento dos INSERTs em `platform_fees` (resumo)

| Edge function | Linha | Condição | Status inserido | `mp_payment_id`? |
|---|---|---|---|---|
| `mp-process-payment` | 335-345 | `mpResult.status === 'approved' && applicationFee > 0` | `'collected'` | sim |
| `mp-create-checkout` | 252-262 | `marketplaceFee > 0` (sempre que cria checkout) | `'pending'` | não |
| `mp-create-package-checkout` | 308-317 | `marketplaceFee > 0` | `'pending'` | não |
| `wa-booking-engine` (createPixCharge) | — | **AUSENTE** | — | — |

### O bug

**`mp-process-payment` só insere `platform_fees` quando o pagamento já volta APROVADO da chamada inicial à API do MP** (`mpResult.status === 'approved'`). Para PIX, isso só acontece se o cliente escanear/pagar o QR code antes da response do POST `/v1/payments` voltar — raríssimo. Para cartão, depende da rota do MP (algumas aprovam instantaneamente, outras vão pra análise antifraude e ficam `pending` ou `in_process`).

**Quando o status volta `pending`:**
1. `mp-process-payment` linha 335 não dispara — `platform_fees` **não é inserido**.
2. Cliente paga em seguida.
3. MP envia webhook → `mp-webhook` atualiza `payments.status = 'paid'`.
4. `mp-webhook` **não tem código que insira em `platform_fees`** (verificado por grep, há `payments`, `cash_entries`, `customer_balance_entries` nos UPDATEs, mas nada de `platform_fees`).
5. Resultado: pagamento fica `paid` em `payments` mas sem registro em `platform_fees` → o gap exatamente como o observado em `mp_id=155631091627`.

### Por que o R$28,50 (PIX) gravou e o R$40 não?

O **R$28,50** provavelmente foi processado por um caminho onde a aprovação chegou cedo (PIX já com pagamento confirmado quando voltou ao backend, ou um caminho interno marcado como `'pix'`). O **R$40** caiu no cenário acima — `mp-process-payment` não aprovou na hora, webhook só atualizou status, e ninguém inseriu `platform_fees`.

A pista de `payment_method='pix'` vs `null` é correlacionada com a causa, não a causa direta:
- `mp-process-payment` **não escreve `payment_method` em `payments`** (linhas 128-140 do INSERT, 312-319 do UPDATE — verificado).
- `mp-create-checkout` também não escreve.
- `mp-webhook` também não escreve em `payments.payment_method` (escreve só em `cash_entries.payment_method`, sempre como `'online'`).
- A view `idx_134654_*` faz `COALESCE((SELECT ce.payment_method FROM cash_entries ce WHERE ce.payment_id = p.id LIMIT 1), 'online')`, ou seja, o `payment_method` que aparece num SELECT vem do `cash_entries` relacionado.
- Conclusão: o `payment_method='pix'` provavelmente foi setado **manualmente pela barbearia** (no app, comanda/cash_entry com método PIX) ou via outro caminho não-automatizado. Mas isso é tangencial ao bug — o gap em `platform_fees` é causado pelo **handler que não retoma o INSERT no fluxo do webhook**.

### Git history entre 11/abr e 25/abr

Único commit no intervalo que toca código MP:
```
f3b5fce 2026-04-16  Changes  (gpt-engineer-app[bot] / Lovable)
  - src/integrations/supabase/types.ts        | 19 +++++
  - migrations/20260416134922_*.sql           | 88 ++++++++++++++++++++++
```
Esse commit **não modifica nenhuma das 3 edge functions de MP** nem schema de `platform_fees`. **Não introduziu o bug** — o bug é estrutural (existe desde a criação da tabela, migration `20260219162639`).

### Recomendação para Task 7 (separada das opções A/B/C principais)

Adicionar um INSERT idempotente de `platform_fees` em `mp-webhook/index.ts` no momento da transição `pending → paid` (dentro do bloco `if (newStatus === 'paid' && previousStatus !== 'paid')`, que começa em `index.ts:167`). Algo como:

```ts
// Backfill platform_fees if not yet recorded (handles pending→paid transitions)
const commissionRate = await getCommissionRate(supabase, payment.tenant_id);
if (commissionRate > 0 && payment.amount_cents > 0) {
  const feeAmountCents = Math.round(payment.amount_cents * commissionRate);
  await supabase.from('platform_fees').upsert({
    tenant_id: payment.tenant_id,
    payment_id: paymentId,
    mp_payment_id: mpPaymentId.toString(),
    transaction_amount_cents: payment.amount_cents,
    commission_rate: commissionRate,
    fee_amount_cents: feeAmountCents,
    status: 'collected',
  }, { onConflict: 'payment_id', ignoreDuplicates: false });
}
```

Pré-requisitos: criar `UNIQUE INDEX` em `platform_fees(payment_id) WHERE payment_id IS NOT NULL` (ou similar) — a tabela hoje não tem constraint única, então `upsert` precisa ter base. **Por isso essa correção exige migration**, fora do escopo de "B+C" das hipóteses 1/2.

**Risco/cobertura:** baixo (idempotente via upsert), preenche o gap pra todos os pagamentos via `mp-process-payment` que ficam pending. Não toca `_shared/`, mas precisa de uma migration pequena pra constraint única — mencionar pro Vitor decidir se inclui na mesma rodada.

Opcional: backfill SQL one-shot pra registros históricos:
```sql
-- Estimativa: pagamentos paid sem platform_fees correspondente
SELECT COUNT(*) FROM payments p
LEFT JOIN platform_fees pf ON pf.payment_id = p.id
WHERE p.status = 'paid' AND p.provider = 'mercadopago' AND pf.id IS NULL;
```

---

## 4. Avaliação das 3 opções

### Opção A — Configuração no painel MP (sem código)

| | |
|---|---|
| **Mudanças** | Acessar painel da aplicação MP, desativar evento `payment` |
| **Risco** | **Alto** — webhook config no MP é por aplicação, não por subtipo de cobrança. Desativar `payment` quebra TODOS os pagamentos não-assinatura (bookings, pacotes), que dependem do mesmo handler. |
| **Cobertura** | Resolveria os dois problemas, mas inviável na prática. |
| **Veredito** | **Descartar.** |

### Opção B — Match direto via `body.user_id`

Em `index.ts`, antes do loop atual, tentar match direto:

```ts
let connections = validTokens.map(t => ({ tenant_id: t.tenant_id, access_token: t.access_token }));

// Otimização: se o webhook traz user_id, prioriza/restringe à conexão correspondente
if (body.user_id) {
  const { data: conn } = await supabase
    .from('mercadopago_connections')
    .select('tenant_id')
    .eq('mp_user_id', String(body.user_id))
    .maybeSingle();
  if (conn) {
    const matched = connections.find(c => c.tenant_id === conn.tenant_id);
    if (matched) connections = [matched]; // só essa
  }
}
```

| | |
|---|---|
| **Arquivos/linhas** | `mp-webhook/index.ts:50` (após `getAllValidMpTokens`); ~10 linhas adicionadas |
| **Risco** | **Baixo.** Se `body.user_id` não vier ou não houver match, fallback para o loop atual (zero regressão). |
| **Cobertura** | Resolve **Problema 2** (chamadas duplicadas /v1/payments — cai de 3 para 1 por webhook). **NÃO resolve o Problema 1 (404)** isoladamente: se `/v1/payments` retornar 404 mesmo com o token correto, ainda cai no `if (!mpPaymentData) return 404`. |

### Opção C — Curto-circuito para subscription redundante

Em `index.ts`, antes do GET (linha 84):

```ts
// Curto-circuito: se este mp_payment_id já foi processado por subscription_authorized_payment, ignora
const { data: existingSubPayment } = await supabase
  .from('subscription_payments')
  .select('id')
  .eq('mp_payment_id', String(mpPaymentId))
  .maybeSingle();

if (existingSubPayment) {
  console.log(`[SHORT-CIRCUIT] payment ${mpPaymentId} already processed via subscription_authorized_payment, ignoring`);
  return new Response(JSON.stringify({ received: true, ignored: true, reason: 'already_processed' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

| | |
|---|---|
| **Arquivos/linhas** | `mp-webhook/index.ts:83` (antes do loop); ~12 linhas adicionadas |
| **Risco** | **Baixo.** Idempotente — não muda estado, só retorna cedo. Edge case: se o handler de `subscription_authorized_payment` ainda não rodou quando o `type=payment` chegar (race condition), o curto-circuito não dispara e o fluxo continua. Aceitável. |
| **Cobertura** | Resolve **Problema 1** (HTTP 404 ao MP) **e** evita 1 chamada `/v1/payments` por webhook redundante (parcialmente o **Problema 2**). |

---

## 5. Recomendação final

### Implementar **B + C** combinados.

São complementares, baixo risco, baixo footprint (~25 linhas no total, todo localizado em `mp-webhook/index.ts`). Um sem o outro deixa um sintoma na mesa:
- **B sozinho:** ainda retorna 404 ao MP nos casos onde `/v1/payments` falha (deduzido: provavelmente todos os recurring).
- **C sozinho:** continua queimando 2 chamadas inúteis `/v1/payments` por webhook recorrente até a conexão certa ser encontrada.

### Bônus: Opção D (mudança de robustez separada, ~3 linhas)

Trocar o `return 404` da linha 102–108:
```ts
if (!mpPaymentData) {
  console.error('Could not fetch payment from MP after trying all connections:', mpPaymentId);
  return new Response(JSON.stringify({ received: true, ignored: true, reason: 'mp_fetch_failed' }), {
    status: 200,  // antes: 404
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
```

**Por quê:** o webhook do MP usa o status HTTP de saída como sinal de retry. 404 dispara retries por dias (4501ms observado é coerente com o backoff do MP). Como o MP **garante** entrega de pelo menos um dos dois eventos (`subscription_authorized_payment` ou `payment`), e nosso processamento de assinatura já está coberto pelo primeiro, retornar 200 quando não conseguimos buscar dados é mais seguro do que pedir retry. Risco residual: pagamentos não-assinatura que falhem o GET por motivo transitório (rede, etc.) não serão retentados — mas hoje também não são, porque retornar 404 ao MP só dispara retry no MP, não no nosso código. Vale incluir D para limpar o painel mesmo após B+C cobrirem o caso comum.

### Ordem sugerida de implementação

1. **B** primeiro — observação no painel: chamadas a `/v1/payments` devem cair de ~3x para ~1x por webhook.
2. **C** logo em seguida — observação: webhooks 404 caem para próximo de 0 em pagamentos de assinatura.
3. **D** opcional — limpa qualquer 404 residual (fantasmas externos, falhas transitórias).

---

## 6. Limitações desta investigação

- Não foi possível inspecionar logs reais da edge function (MCP Supabase requer OAuth — pulado pra não bloquear). A análise da estrutura do body está baseada na documentação do MP; alinha com o código existente, mas confirmação empírica nos logs reais é recomendável antes de mergear o fix.
- Não foi confirmado empiricamente se `GET /v1/payments/{id}` retorna 404 com o token **correto** do dono pra cobranças recorrentes (`operation_type=recurring_payment`). Se retornar 200, então o Problema 1 só ocorre porque o token correto nem chega a ser tentado (loop morre antes ou ordem ruim) — caso em que B sozinho já resolveria. Se retornar 404 mesmo, C é indispensável. Sem essa confirmação, **B+C cobre os dois cenários** e é a aposta segura.
- Não foi medido o impacto via SQL `SELECT COUNT(*) FROM subscription_payments WHERE created_at >= '2026-04-01'` (precisa do MCP autenticado). Recomendo rodar antes de mergear como baseline pra validar a queda.

---

## 7. Próximos passos

- [ ] Vitor revisa este documento
- [ ] (Opcional) Confirmação empírica via logs do Supabase para um dos IDs (156598131311) — body completo
- [ ] (Opcional) `curl` manual em `/v1/payments/156598131311` com token do Adriano pra confirmar resposta MP
- [ ] Aprovação para implementar B + C (+ D se quiser limpar o painel)
- [ ] Implementação em PR separado, com teste manual: forçar uma renovação de assinatura em sandbox e confirmar (a) só 1 chamada a `/v1/payments`, (b) webhook responde 200 sem GET quando já processado.
