
-- Create recurring_clients table for fixed weekly recurring bookings
CREATE TABLE public.recurring_clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6), -- 0=Sun, 1=Mon...6=Sat
  start_time TIME WITHOUT TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: no two active recurring clients on same staff/day/time
CREATE UNIQUE INDEX idx_recurring_clients_unique_slot 
  ON public.recurring_clients (tenant_id, staff_id, weekday, start_time) 
  WHERE active = true;

-- Enable RLS
ALTER TABLE public.recurring_clients ENABLE ROW LEVEL SECURITY;

-- Tenant members can manage recurring clients
CREATE POLICY "Tenant scope recurring_clients"
  ON public.recurring_clients
  FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

-- Public can read active recurring clients (needed for availability check in edge function)
CREATE POLICY "Public read active recurring_clients"
  ON public.recurring_clients
  FOR SELECT
  USING (active = true);

-- Trigger for updated_at
CREATE TRIGGER update_recurring_clients_updated_at
  BEFORE UPDATE ON public.recurring_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
