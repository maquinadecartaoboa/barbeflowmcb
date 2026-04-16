
CREATE OR REPLACE FUNCTION public.create_booking_if_available(
  p_tenant_id uuid,
  p_service_id uuid,
  p_staff_id uuid,
  p_customer_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_status text,
  p_notes text DEFAULT NULL,
  p_created_via text DEFAULT 'public',
  p_customer_package_id uuid DEFAULT NULL,
  p_customer_subscription_id uuid DEFAULT NULL,
  p_buffer_minutes int DEFAULT 10,
  p_skip_conflict_check boolean DEFAULT false,
  p_skip_block_check boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id uuid;
  v_conflict_count int;
  v_lock_key bigint;
BEGIN
  v_lock_key := ('x' || substr(replace(p_staff_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  IF NOT p_skip_conflict_check THEN
    -- Check conflicts with existing bookings (PRIMARY staff)
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND staff_id = p_staff_id
      AND status IN ('confirmed', 'pending', 'pending_payment', 'completed')
      AND starts_at < (p_ends_at + (p_buffer_minutes || ' minutes')::interval)
      AND ends_at > (p_starts_at - (p_buffer_minutes || ' minutes')::interval);
    
    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'TIME_CONFLICT';
    END IF;

    -- Check conflicts with SECONDARY staff (booking_items with this staff_id)
    SELECT COUNT(*) INTO v_conflict_count
    FROM booking_items bi
    JOIN bookings b ON b.id = bi.booking_id
    WHERE b.tenant_id = p_tenant_id
      AND bi.staff_id = p_staff_id
      AND bi.type IN ('service', 'extra_service')
      AND b.status IN ('confirmed', 'pending', 'pending_payment', 'completed')
      AND b.starts_at < (p_ends_at + (p_buffer_minutes || ' minutes')::interval)
      AND b.ends_at > (p_starts_at - (p_buffer_minutes || ' minutes')::interval);
    
    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'TIME_CONFLICT';
    END IF;
  END IF;
  
  -- Check conflicts with blocks (separate from booking conflicts)
  IF NOT p_skip_block_check THEN
    SELECT COUNT(*) INTO v_conflict_count
    FROM blocks
    WHERE tenant_id = p_tenant_id
      AND (staff_id = p_staff_id OR staff_id IS NULL)
      AND starts_at < p_ends_at
      AND ends_at > p_starts_at;
    
    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'BLOCK_CONFLICT';
    END IF;
  END IF;
  
  INSERT INTO bookings (
    tenant_id, service_id, staff_id, customer_id,
    starts_at, ends_at, status, notes, created_via,
    customer_package_id, customer_subscription_id
  ) VALUES (
    p_tenant_id, p_service_id, p_staff_id, p_customer_id,
    p_starts_at, p_ends_at, p_status, p_notes, p_created_via,
    p_customer_package_id, p_customer_subscription_id
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$;
