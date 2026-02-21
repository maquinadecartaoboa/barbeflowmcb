

## Edicao de horario e encaixe de servicos no painel administrativo

### Resumo

Duas melhorias no painel de agendamentos:

1. **Editar horario de inicio e termino** de agendamentos existentes, com validacao de conflitos antes de salvar
2. **Visualizacao de encaixe** no grid administrativo, mostrando intervalos livres entre agendamentos (ex: 08:15-08:30) que nao aparecem na pagina publica

---

### Detalhes tecnicos

#### 1. Edicao de horario inicio/fim com validacao de conflitos

**Arquivo: `src/pages/Bookings.tsx`**

- Adicionar campo `end_time` ao `editForm` (atualmente so tem `time` para inicio)
- Ao alterar `time` (inicio), auto-calcular `end_time` com base na duracao do servico selecionado
- Permitir alteracao manual do `end_time` para ajustar livremente
- Antes de salvar (`saveBookingEdit`):
  - Consultar agendamentos existentes do mesmo `staff_id` no mesmo dia que colidam com o novo intervalo (excluindo o proprio booking sendo editado e status `cancelled`)
  - Se houver conflito, exibir um `AlertDialog` listando os agendamentos conflitantes (nome do cliente, horario) e impedir a gravacao
  - Se nao houver conflito, salvar normalmente com o novo `starts_at` e `ends_at`
- A query de conflito sera:
  ```
  bookings onde staff_id = X
  AND id != bookingAtual
  AND status != 'cancelled'
  AND starts_at < novoEndsAt
  AND ends_at > novoStartsAt
  ```

#### 2. Grid administrativo com resolucao fina (encaixe)

**Arquivo: `src/components/calendar/ScheduleGrid.tsx`**

- Atualmente o grid usa `settings.slot_duration` (ex: 30min) para definir os intervalos visiveis
- Alterar para usar uma resolucao fixa de **15 minutos** no grid administrativo, independente do `slot_duration` configurado pelo tenant
- Isso faz com que gaps naturais (ex: 08:15-08:30 apos um servico de 15min) aparecam como slots clicaveis no painel
- Nenhuma alteracao na pagina publica (`BookingPublic.tsx`) -- ela continua usando o `slot_duration` configurado pelo tenant via a Edge Function `get-available-slots`

**Arquivo: `src/hooks/useBookingsByDate.ts`**

- Ajustar o calculo de `timeRange` para considerar a resolucao de 15min quando necessario (nenhuma mudanca necessaria, ja funciona com qualquer granularidade)

#### 3. Pagina publica inalterada

A pagina publica (`BookingPublic.tsx`) e a Edge Function `get-available-slots` continuam usando o `slot_duration` do tenant (ex: 30min). Nenhuma alteracao necessaria.

---

### Arquivos a modificar

1. **`src/pages/Bookings.tsx`** -- Adicionar campo end_time no formulario de edicao, validacao de conflitos antes de salvar
2. **`src/components/calendar/ScheduleGrid.tsx`** -- Usar resolucao fixa de 15min no grid administrativo

### Nenhuma migracao de banco necessaria

Todas as alteracoes sao apenas no frontend.

