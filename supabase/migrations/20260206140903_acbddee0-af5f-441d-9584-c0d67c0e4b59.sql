
-- 1) Tabela de estado de conversa WhatsApp
CREATE TABLE public.whatsapp_conversation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  remote_jid text NOT NULL,
  step text NOT NULL DEFAULT 'MENU',
  payload jsonb DEFAULT '{}'::jsonb,
  last_message_id text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, remote_jid)
);

ALTER TABLE public.whatsapp_conversation_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope whatsapp_conversation_state"
  ON public.whatsapp_conversation_state FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE TRIGGER update_whatsapp_conversation_state_updated_at
  BEFORE UPDATE ON public.whatsapp_conversation_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Tabela de hold temporário de horário
CREATE TABLE public.booking_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  remote_jid text NOT NULL,
  staff_id uuid REFERENCES public.staff(id),
  service_id uuid REFERENCES public.services(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope booking_holds"
  ON public.booking_holds FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE INDEX idx_booking_holds_active ON public.booking_holds (tenant_id, staff_id, status) WHERE status = 'active';

-- 3) Ajustar bookings.created_via — não há CHECK constraint, é apenas text livre.
-- O valor 'whatsapp' já é aceito pois a coluna é text sem constraint.
-- Adicionamos um comentário para documentar os valores válidos.
COMMENT ON COLUMN public.bookings.created_via IS 'Valores válidos: public, admin, whatsapp';
