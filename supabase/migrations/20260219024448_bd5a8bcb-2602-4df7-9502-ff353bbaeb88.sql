
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE,
  ADD COLUMN IF NOT EXISTS cloudflare_status text DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS cloudflare_hostname_id text;
