

## Plano: Corrigir bug de frequência quinzenal em agendamentos recorrentes

### O problema

O cálculo que determina se um agendamento recorrente (quinzenal, trissemanal, mensal) deve aparecer numa determinada data usa `Math.round` para converter milissegundos em dias. Quando a data de referência (`targetLocal`) inclui um componente de hora (ex: 15:00), a diferença em dias fica com decimal (ex: 13.5) e o `Math.round` arredonda para cima (14), fazendo o sistema pensar que estamos na semana correta quando não estamos.

Foi exatamente isso que aconteceu com o Pedro Vizinho: o sistema criou um agendamento quinzenal na semana errada, disparou lembrete via WhatsApp, e o barbeiro teve que cancelar manualmente.

### A correção

Substituir `Math.round` por `Math.floor` e normalizar ambas as datas para meia-noite (`T00:00:00`) antes de calcular a diferença. Isso garante que a divisão por dias sempre resulte em um número inteiro, eliminando o arredondamento incorreto.

### Arquivos afetados (4 no total)

1. **`supabase/functions/process-recurring-bookings/index.ts`** (linha 69-70)
   - `targetLocal` carrega hora do dia — trocar por `new Date(targetDate + 'T00:00:00')`
   - `Math.round` → `Math.floor`

2. **`src/hooks/useBookingsByDate.ts`** (linha 90)
   - Já usa `T00:00:00` em ambas datas, mas ainda tem `Math.round` → trocar por `Math.floor`

3. **`supabase/functions/get-available-slots/index.ts`** (linha 270)
   - Já normaliza, mas tem `Math.round` → `Math.floor`

4. **`supabase/functions/send-recurring-weekly-summaries/index.ts`** (linhas 136-141)
   - `targetDate` é calculado via `new Date(now)` com `setDate()`, carregando hora — normalizar para meia-noite
   - `Math.round` → `Math.floor`

### Mudança exata em cada arquivo

```text
// ANTES (todos os 4 arquivos):
const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

// DEPOIS:
const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
```

Adicionalmente no `process-recurring-bookings` (linha 69):
```text
// ANTES:
const diffMs = targetLocal.getTime() - slotStart.getTime();

// DEPOIS:
const targetMidnight = new Date(targetDate + 'T00:00:00');
const diffMs = targetMidnight.getTime() - slotStart.getTime();
```

E no `send-recurring-weekly-summaries` (linhas 136-140):
```text
// ANTES:
const targetDate = new Date(now);
targetDate.setDate(now.getDate() + diff);

// DEPOIS:
const targetDate = new Date(now);
targetDate.setDate(now.getDate() + diff);
targetDate.setHours(0, 0, 0, 0);
```

### Resultado

Após a correção, o cálculo de semanas será determinístico independente da hora do dia em que o cron roda, eliminando o cenário onde agendamentos quinzenais/trissemanais são criados na semana errada e disparam notificações indevidas.

