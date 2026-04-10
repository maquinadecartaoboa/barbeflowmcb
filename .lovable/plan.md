

## Problema identificado

Há **dois problemas** no fluxo de edição de agendamentos:

### 1. Bug de timezone na construção das datas
Na função `saveBookingEdit` (linha 385-386), as datas são construídas assim:
```js
const startsAt = new Date(`${editForm.date}T${editForm.time}`);
```
Isso cria a data no timezone **local do browser**, mas o hook `useBookingsByDate` busca dados com offset `-03:00` (America/Bahia). Se o browser do usuário estiver em timezone diferente, o horário salvo no banco ficará errado — e mesmo se estiver no mesmo timezone, a falta de offset explícito pode causar inconsistências.

**Correção**: Usar `fromZonedTime` do `date-fns-tz` para construir a data no timezone correto (America/Bahia), garantindo que o horário editado seja salvo exatamente como o usuário vê.

### 2. A duração pode ser editada livremente (já funciona)
O campo "Término" já é editável independentemente (linha 873). O usuário **pode** alongar ou encurtar manualmente. Porém, isso pode não estar claro na UI.

**Melhoria**: Adicionar uma indicação visual da duração calculada (ex: "90min") ao lado dos campos de horário para dar feedback imediato ao admin.

---

## Plano de implementação

### Arquivo: `src/pages/Bookings.tsx`

**A) Corrigir construção de datas com timezone explícito**
- Importar `fromZonedTime` de `date-fns-tz`
- Na `saveBookingEdit`, substituir:
  ```js
  const startsAt = new Date(`${editForm.date}T${editForm.time}`);
  const endsAt = new Date(`${editForm.date}T${editForm.end_time}`);
  ```
  Por:
  ```js
  const startsAt = fromZonedTime(`${editForm.date}T${editForm.time}`, "America/Bahia");
  const endsAt = fromZonedTime(`${editForm.date}T${editForm.end_time}`, "America/Bahia");
  ```

**B) Adicionar indicador de duração no formulário de edição**
- Abaixo dos campos de horário, mostrar um texto calculado como:
  ```
  Duração: 90min
  ```
- Calcular a diferença entre `end_time` e `time` em minutos e exibir.

**C) Garantir refetch robusto após salvar**
- Após o `await refetch()`, também atualizar o `selectedBooking` local com os novos horários para que, caso o modal permaneça aberto, os dados estejam corretos.

---

## Resumo técnico

| O quê | Onde |
|---|---|
| Fix timezone na edição | `saveBookingEdit()` linhas 385-386 |
| Indicador de duração | UI do formulário, após linha 875 |
| Import `fromZonedTime` | Topo do arquivo |

Apenas `src/pages/Bookings.tsx` será alterado. Nenhuma mudança no backend.

