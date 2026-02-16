
-- =============================================
-- FASE 5: Commission Snapshots (imutável, per booking_item)
-- =============================================

-- 1. Tabela de snapshots de comissão
CREATE TABLE public.commission_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  booking_item_id UUID NOT NULL REFERENCES public.booking_items(id),
  staff_id UUID NOT NULL REFERENCES public.staff(id),
  item_type TEXT NOT NULL, -- 'service' or 'product'
  item_title TEXT NOT NULL,
  base_amount_cents INTEGER NOT NULL, -- valor sobre o qual a comissão incide
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_commission_snapshots_tenant_period ON public.commission_snapshots(tenant_id, created_at);
CREATE INDEX idx_commission_snapshots_staff ON public.commission_snapshots(staff_id);
CREATE INDEX idx_commission_snapshots_booking ON public.commission_snapshots(booking_id);
CREATE UNIQUE INDEX idx_commission_snapshots_item_unique ON public.commission_snapshots(booking_item_id);

-- RLS
ALTER TABLE public.commission_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view commissions"
  ON public.commission_snapshots FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can insert commissions"
  ON public.commission_snapshots FOR INSERT
  WITH CHECK (public.is_tenant_admin(tenant_id));

-- Nenhum UPDATE ou DELETE — snapshots são imutáveis

-- 2. RPC: Fechar comanda com geração de comissões
CREATE OR REPLACE FUNCTION public.close_comanda_with_commissions(
  p_booking_id UUID,
  p_tenant_id UUID,
  p_commission_basis TEXT DEFAULT 'theoretical'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status TEXT;
  v_comanda_status TEXT;
  v_item RECORD;
  v_comm_percent NUMERIC;
  v_base_amount INTEGER;
  v_comm_cents INTEGER;
  v_total_comm INTEGER := 0;
  v_count INTEGER := 0;
  v_received_map JSONB := '{}'::JSONB;
BEGIN
  -- 1. Lock and validate booking
  SELECT status, comanda_status INTO v_status, v_comanda_status
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_comanda_status = 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLOSED');
  END IF;

  -- 2. If "received" basis, build map of received amounts per booking_item
  --    from cash_entries linked to same booking
  IF p_commission_basis = 'received' THEN
    -- For received mode, use the actual paid amount on each item
    -- Items with paid_status in ('paid_local','paid_online') use total_price_cents as base
    -- Items with paid_status = 'unpaid' get 0
    NULL; -- handled inline below
  END IF;

  -- 3. For each booking_item with a staff_id, generate commission snapshot
  FOR v_item IN
    SELECT 
      bi.id AS item_id,
      bi.type AS item_type,
      bi.title,
      bi.total_price_cents,
      bi.paid_status,
      bi.staff_id,
      bi.ref_id,
      s.default_commission_percent,
      s.product_commission_percent
    FROM booking_items bi
    JOIN staff s ON s.id = bi.staff_id
    WHERE bi.booking_id = p_booking_id
      AND bi.tenant_id = p_tenant_id
      AND bi.staff_id IS NOT NULL
      AND (s.is_owner IS NULL OR s.is_owner = false)
  LOOP
    -- Determine commission percent
    IF v_item.item_type = 'service' THEN
      -- Check staff_services for service-specific override
      SELECT COALESCE(ss.commission_percent, v_item.default_commission_percent, 0)
      INTO v_comm_percent
      FROM staff_services ss
      WHERE ss.staff_id = v_item.staff_id AND ss.service_id = v_item.ref_id;

      IF NOT FOUND THEN
        v_comm_percent := COALESCE(v_item.default_commission_percent, 0);
      END IF;
    ELSE
      -- Product: use product_commission_percent
      v_comm_percent := COALESCE(v_item.product_commission_percent, 0);
    END IF;

    -- Determine base amount
    IF p_commission_basis = 'received' THEN
      -- Only count if actually paid
      IF v_item.paid_status IN ('paid_local', 'paid_online') THEN
        v_base_amount := v_item.total_price_cents;
      ELSE
        v_base_amount := 0;
      END IF;
    ELSE
      -- Theoretical: always use item price (even if unpaid)
      v_base_amount := v_item.total_price_cents;
    END IF;

    -- Calculate commission
    v_comm_cents := ROUND(v_base_amount * v_comm_percent / 100);

    -- Insert snapshot (unique constraint on booking_item_id prevents duplicates)
    INSERT INTO commission_snapshots (
      tenant_id, booking_id, booking_item_id, staff_id,
      item_type, item_title, base_amount_cents,
      commission_percent, commission_cents
    ) VALUES (
      p_tenant_id, p_booking_id, v_item.item_id, v_item.staff_id,
      v_item.item_type, v_item.title, v_base_amount,
      v_comm_percent, v_comm_cents
    );

    v_total_comm := v_total_comm + v_comm_cents;
    v_count := v_count + 1;
  END LOOP;

  -- 4. Close comanda
  UPDATE bookings
  SET comanda_status = 'closed', updated_at = now()
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'snapshots_created', v_count,
    'total_commission_cents', v_total_comm
  );
END;
$$;
