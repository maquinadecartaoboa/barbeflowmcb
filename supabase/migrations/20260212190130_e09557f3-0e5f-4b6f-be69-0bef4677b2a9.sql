
-- Table: stripe_customers (maps tenant to Stripe customer)
CREATE TABLE public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view own stripe customer"
  ON public.stripe_customers FOR SELECT
  USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope stripe_customers"
  ON public.stripe_customers FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

-- Table: stripe_subscriptions (Stripe billing for tenants using modoGESTOR)
CREATE TABLE public.stripe_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL UNIQUE,
  stripe_price_id TEXT NOT NULL,
  plan_name TEXT NOT NULL CHECK (plan_name IN ('essencial', 'profissional')),
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  status TEXT NOT NULL DEFAULT 'trialing',
  commission_rate NUMERIC(4,3) NOT NULL DEFAULT 0.025,
  additional_professionals INTEGER NOT NULL DEFAULT 0,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id)
);

ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view own stripe subscription"
  ON public.stripe_subscriptions FOR SELECT
  USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope stripe_subscriptions"
  ON public.stripe_subscriptions FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

-- Table: stripe_invoices (invoice history)
CREATE TABLE public.stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL,
  invoice_url TEXT,
  invoice_pdf TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view own stripe invoices"
  ON public.stripe_invoices FOR SELECT
  USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope stripe_invoices"
  ON public.stripe_invoices FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

-- Add subscription_status column to tenants
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Triggers for updated_at
CREATE TRIGGER update_stripe_customers_updated_at
  BEFORE UPDATE ON public.stripe_customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stripe_subscriptions_updated_at
  BEFORE UPDATE ON public.stripe_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
