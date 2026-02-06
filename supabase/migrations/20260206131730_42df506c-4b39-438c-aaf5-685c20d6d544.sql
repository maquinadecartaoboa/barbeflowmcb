
-- Add service_id column to recurring_clients
ALTER TABLE public.recurring_clients
  ADD COLUMN service_id uuid REFERENCES public.services(id);

-- Backfill: set service_id to NULL for existing rows (they'll need manual update)
-- Make it NOT NULL after backfill period - for now allow NULL for backwards compat

-- Comment: duration_minutes is kept for backwards compat but will be auto-filled from service
