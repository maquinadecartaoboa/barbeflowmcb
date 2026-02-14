
-- RPC: record_local_payment_for_booking
-- Registers local payment (multiple methods), credits customer balance, handles change
CREATE OR REPLACE FUNCTION public.record_local_payment_for_booking(
  p_booking_id uuid,
  p_tenant_id uuid,
  p_customer_id uuid,
  p_receipt_id uuid, -- idempotency key
  p_payments jsonb, -- array of { method: string, amount_cents: int }
  p_keep_change_as_credit boolean DEFAULT false,
  p_cash_session_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_received integer := 0;
  v_service_price integer;
  v_balance integer;
  v_total_to_charge integer;
  v_change integer;
  v_payment jsonb;
  v_existing_count integer;
BEGIN
  -- 1. Idempotency: check if receipt_id already used
  SELECT COUNT(*) INTO v_existing_count
  FROM customer_balance_entries
  WHERE booking_id = p_booking_id
    AND tenant_id = p_tenant_id
    AND type = 'credit'
    AND description LIKE '%receipt:' || p_receipt_id::text || '%';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PAYMENT');
  END IF;

  -- 2. Validate booking exists and belongs to tenant
  SELECT s.price_cents INTO v_service_price
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 3. Calculate current customer balance
  SELECT COALESCE(SUM(
    CASE WHEN type = 'credit' THEN amount_cents ELSE -amount_cents END
  ), 0) INTO v_balance
  FROM customer_balance_entries
  WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

  -- 4. Calculate total received from all payment lines
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_total_received := v_total_received + (v_payment->>'amount_cents')::integer;
  END LOOP;

  -- 5. Insert cash_entries for each payment line (income)
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    INSERT INTO cash_entries (
      tenant_id, session_id, amount_cents, kind, source,
      payment_method, booking_id, notes, occurred_at, staff_id
    ) VALUES (
      p_tenant_id, p_cash_session_id, (v_payment->>'amount_cents')::integer,
      'income', 'booking',
      v_payment->>'method', p_booking_id,
      'Pagamento local booking ' || p_booking_id::text,
      now(), p_staff_id
    );
  END LOOP;

  -- 6. Insert customer_balance_entries credit for total received
  INSERT INTO customer_balance_entries (
    tenant_id, customer_id, type, amount_cents,
    description, booking_id, staff_id
  ) VALUES (
    p_tenant_id, p_customer_id, 'credit', v_total_received,
    'Pagamento local (receipt:' || p_receipt_id::text || ')',
    p_booking_id, p_staff_id
  );

  -- 7. Handle change
  -- Recalculate balance after credit
  v_balance := v_balance + v_total_received;
  -- Negative balance (total owed) was already in v_balance before credit
  -- change = total_received - abs(service_price + previous_debt)
  -- But simpler: if balance > 0 after credit, that's the "excess"
  v_change := GREATEST(0, v_balance);

  IF v_change > 0 AND NOT p_keep_change_as_credit THEN
    -- Give change: register cash outflow and debit customer balance
    INSERT INTO cash_entries (
      tenant_id, session_id, amount_cents, kind, source,
      payment_method, booking_id, notes, occurred_at, staff_id
    ) VALUES (
      p_tenant_id, p_cash_session_id, v_change,
      'expense', 'booking',
      'cash', p_booking_id,
      'Troco do booking ' || p_booking_id::text,
      now(), p_staff_id
    );

    -- Remove the excess from customer balance
    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'debit', v_change,
      'Troco devolvido (receipt:' || p_receipt_id::text || ')',
      p_booking_id, p_staff_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_received', v_total_received,
    'change', v_change,
    'kept_as_credit', p_keep_change_as_credit AND v_change > 0,
    'new_balance', CASE 
      WHEN p_keep_change_as_credit THEN v_balance
      ELSE v_balance - v_change
    END
  );
END;
$$;
