# Multi-user Staff (Profissionais com login próprio)

**Data inicial:** 2026-05-07
**Status:** entregue (Fase 3 + 4) — falta deploy da edge function `invite-staff-user`.

## Visão geral

Cada `staff` (profissional) pode ter um **login próprio** vinculado por
`staff.user_id` → `auth.users.id`. Quando logado, esse user tem `role='staff'`
em `users_tenant` e enxerga apenas:

- a própria agenda (próprios `bookings`),
- os próprios snapshots de comissão,
- a lista de clientes/serviços do tenant (read-only para o fluxo de criar agendamento).

Tudo o que envolve dinheiro, integrações, pacotes/assinaturas, equipe ou
configurações continua restrito ao admin (roles `owner`/`admin`/`manager`).

## Arquitetura

### 1. Banco (já em produção, fora deste PR)

- **`staff.user_id`**: `uuid NULL`, FK pra `auth.users` `ON DELETE SET NULL`,
  com índice único parcial `WHERE user_id IS NOT NULL` (1 user = 1 staff record).
- **`users_tenant.role`**: aceita `owner | admin | manager | staff`.
- **Helpers SQL**:
  - `current_user_is_staff_only(p_tenant_id uuid) → boolean` — TRUE se
    user logado tem role='staff' (e não admin) no tenant.
  - `current_user_staff_id(p_tenant_id uuid) → uuid` — staff.id do user logado.
- **23 policies RESTRICTIVE** já criadas:
  - Acesso restrito por staff: `bookings`, `booking_items`, `commission_snapshots`.
  - Acesso bloqueado completamente: `payments`, `cash_*`, `platform_fees`,
    `mercadopago_connections`, `whatsapp_*`, `stripe_*`, `subscription_payments`,
    `staff_payments`, `product_sales`, `expense_categories`, `meta_events_log`,
    `visitor_sessions`, `notification_log`, `subscription_commission_*`,
    `onboarding_progress`.
  - Acesso sem restrição adicional (mantém `user_belongs_to_tenant`):
    `customers`, `services`, `staff` (lista), `schedules`, `blocks`,
    `customer_packages`, `customer_subscriptions`, `subscription_plans`,
    `package_services`.

### 2. Edge function `invite-staff-user`

`POST /functions/v1/invite-staff-user` — `verify_jwt: true`.

Body: `{ staff_id: string, email: string }`.

Fluxo:

1. Decodifica JWT → `caller_user_id`.
2. Carrega o `staff` (service role): valida que existe, está ativo e ainda
   não tem `user_id`.
3. Confirma que o caller é admin do mesmo tenant
   (`users_tenant.role IN owner|admin|manager`).
4. `auth.admin.inviteUserByEmail(email, { redirectTo: 'https://app.modogestor.com.br/auth/callback' })`.
5. `UPDATE staff SET user_id = newUser.id` + `INSERT users_tenant (user_id, tenant_id, role='staff')`.
6. Em qualquer falha após o invite, tenta `auth.admin.deleteUser(newUser.id)`
   pra evitar usuário órfão. Se o rollback falhar, retorna 500 com
   `orphan_user_id` no payload pro admin limpar manualmente.

Erros padronizados (HTTP/mensagem):

| Cenário | HTTP | Mensagem |
|---|---|---|
| Falta staff_id ou email | 400 | "staff_id and email are required" |
| Email inválido | 400 | "Invalid email format" |
| Staff não encontrado | 404 | "Staff not found" |
| Staff inativo | 400 | "Staff is not active" |
| Staff já tem user_id | 409 | "Staff already has a login account" |
| Caller não é admin | 403 | "Only admins can invite staff" |
| Email já em uso | 409 | "Email already registered with another account" |
| Erro do Auth API | 500 | "Failed to send invitation" |
| Erro no UPDATE/INSERT | 500 | "Failed to link account (rollback may be needed)" |

### 3. Frontend

Hooks novos:

- `src/hooks/useUserRole.ts` — React Query, `["user-role", userId, tenantId]`.
  Lê `users_tenant.role` do user logado pro tenant ativo. Expõe
  `{ role, isAdmin, isStaff, isLoading }`. `isAdmin` cobre owner/admin/manager.
  Se aparecer mais de uma row (não deveria), prioriza admin.
- `src/hooks/useCurrentStaff.ts` — só roda se `isStaff`. Retorna o registro
  `staff` com `user_id = auth.user().id`. Usado no header pra exibir o nome
  do profissional logado.

Componentes novos:

- `src/components/RoleGuard.tsx` — wrapper de rota com `requireAdmin`.
  Se o user é staff, redireciona pra `/app/bookings`; se anônimo, manda
  pro login.
- `src/pages/AuthCallback.tsx` — landing do magic link. Espera a sessão
  materializar e roteia: staff → `/app/bookings`, admin → `/app/dashboard`.

Mudanças em arquivos existentes:

- **`src/components/layout/AppShell.tsx`**:
  - `NavItem` ganha flags `adminOnly?` e `staffOnly?`.
  - Cada item do menu sidebar/drawer/bottom-tabs marcado conforme role.
  - Helper `filterNavByRole(items, isStaff)` filtra recursivamente e descarta
    grupos que ficaram sem filhos.
  - Sidebar/Drawer/BottomTabs invocam o filtro com `useUserRole().isStaff`.
  - Header mostra `currentStaff?.name` quando staff logado.
  - Item novo top-level pra staff: **"Minhas Comissões"** → `/app/commissions`.
- **`src/App.tsx`**:
  - Rotas admin-only embrulhadas em `<RoleGuard requireAdmin>`:
    `dashboard`, `services`, `packages`, `subscriptions/*`, `staff`,
    `recurring-clients`, `finance`, `caixa`, `products`, `reports`,
    `alta-performance`, `settings`.
  - Rotas livres: `bookings`, `customers`, `commissions`.
  - Adicionada rota `/auth/callback` → `<AuthCallback />`.
- **`src/components/AuthWatcher.tsx`**:
  - Antes de carregar onboarding, verifica role. Se staff-only, redireciona
    direto pra `/app/bookings` (staff não passa por questionário/wizard).
- **`src/pages/Staff.tsx`** (apenas admin acessa, via RoleGuard):
  - Badge "Tem login" / "Sem login" no card de cada staff.
  - Botão "Mail" (convidar) aparece quando `staff.user_id IS NULL`.
  - Modal de convite com input de e-mail, chama `supabase.functions.invoke('invite-staff-user', ...)`.
  - Toast de sucesso + `loadData()` pra atualizar badge.

## Fluxo de convite (sequence)

```
admin → /app/staff
       ↓ clica "Mail" no card de um staff sem user_id
       ↓ digita email + "Enviar convite"
frontend → POST /functions/v1/invite-staff-user { staff_id, email }
edge fn  → valida caller=admin, staff.user_id IS NULL, email válido
         → supabase.auth.admin.inviteUserByEmail(email, { redirectTo: '/auth/callback' })
         → UPDATE staff SET user_id = newUser.id
         → INSERT users_tenant (user_id, tenant_id, role='staff')
         ← { success: true, user_id, email, invitation_sent: true }
toast "Convite enviado" + recarrega lista (badge muda pra "Tem login")

— mais tarde, no email do staff —
staff → clica magic link
       ↓ Supabase JS detecta hash, cria session
       ↓ landing em /auth/callback
AuthCallback → useUserRole().isStaff = true → navigate('/app/bookings', replace)
staff → vê apenas a própria agenda (RLS), menu sem Configurações/Financeiro/etc.
```

## Como criar staff novo end-to-end

1. **Como admin**, em `/app/staff`, clique "Adicionar Profissional", preencha
   nome/cor/etc. (sem login ainda — `user_id` fica NULL).
2. No card desse staff, clique no ícone de envelope ("Convidar para o sistema").
3. Digite o e-mail dele e envie.
4. O staff recebe e-mail com magic link. Ao clicar:
   - É redirecionado pra `https://app.modogestor.com.br/auth/callback`.
   - Supabase auto-loga via hash.
   - `AuthCallback` decide pelo role e o leva pra `/app/bookings`.
5. Daí em diante, ele entra com magic link/senha e vê apenas o que a role
   `staff` permite.

## Limitações conhecidas / itens em aberto

- **1 user = 1 staff record**: o índice único parcial em `staff(user_id)`
  garante isso. Hoje não há cenário de "staff que atende em 2 estabelecimentos
  com o mesmo login".
- **`recurring_clients` table**: não está na lista de policies restritivas
  pra staff. `useBookingsByDate` usa essa tabela. Comportamento atual: staff
  vê todos os recurring clients do tenant (somente leitura). É aceitável,
  mas se for sensível, criar policy.
- **`staff_calendar_bookings` view**: usada em `useBookingsByDate` pra
  mostrar bookings onde o staff é provider secundário. Views Postgres
  precisam de `security_invoker = true` pra herdar RLS da tabela base.
  **Verificar** que esse setting está ativo na view; se não estiver, staff
  pode ver bookings secundários de colegas.
- **`useSubscription` chama `check-subscription` edge function**: a function
  consulta `stripe_subscriptions` com service role. Se ela rejeitar caller
  sem role admin, AppShell pode tentar redirecionar staff pra `/app/onboarding`
  via guard `needsSubscription`. **Testar com staff real** — se quebrar,
  ajustar a function pra liberar staff (sub é do tenant, não do user).
- **`SubscriptionCommissionDashboard` e `SubscriptionCommissionHistory`** em
  `CommissionsPage` consultam `subscription_commission_settlements` que está
  totalmente bloqueado pra staff. Componentes podem mostrar erro/vazio. Se a
  UX ficar ruim, condicionar render desses blocos por `isAdmin`.
- **`StaffFilterChips`** na Bookings page mostra todos os staff do tenant.
  Pra staff, RLS já filtra os bookings, então o filtro é puramente visual e
  inofensivo. Não precisa esconder.
- **Convite expira**: `inviteUserByEmail` envia link com expiração padrão do
  Supabase (24h). Não há retry no UI ainda — se expirar, admin precisa
  remover `staff.user_id` manualmente (via SQL) e reenviar.

## Deploy / próximos passos

- [ ] Deploy da edge function via MCP: `mcp__supabase__deploy_edge_function`
      com `name: invite-staff-user` e `verify_jwt: true`.
- [ ] Smoke test pelos 5 staff candidatos:
      ESDRAS SOUZA, MILA, RECEPÇÃO (Adriano Alves), Maria Costa (BarberFlow),
      Lizandra (Minha Barbearia).
- [ ] Validar concerns acima (staff_calendar_bookings, useSubscription).
