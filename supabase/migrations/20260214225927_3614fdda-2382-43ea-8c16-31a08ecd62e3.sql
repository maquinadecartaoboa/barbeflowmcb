-- Update RPC to accept extra items (products/services) and record them
CREATE OR REPLACE FUNCTION public.record_local_payment_for_booking(
  p_booking_id uuid,
  p_tenant_id uuid,
  p_customer_id uuid,
  p_receipt_id uuid,
  p_payments jsonb,
  p_keep_change_as_credit boolean DEFAULT false,
  p_cash_session_id uuid DEFAULT NULL::uuid,
  p_staff_id uuid DEFAULT NULL::uuid,
  p_extra_items jsonb DEFAULT '[]'::jsonb
)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_received integer := 0;
  v_service_price integer;
  v_balance integer;
  v_extra_total integer := 0;
  v_total_to_charge integer;
  v_change integer;
  v_payment jsonb;
  v_item jsonb;
  v_existing_count integer;
BEGIN
  -- 1. Idempotency
  SELECT COUNT(*) INTO v_existing_count
  FROM customer_balance_entries
  WHERE booking_id = p_booking_id
    AND tenant_id = p_tenant_id
    AND type = 'credit'
    AND description LIKE '%receipt:' || p_receipt_id::text || '%';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PAYMENT');
  END IF;

  -- Also check for debit "Serviço realizado" to prevent double processing
  SELECT COUNT(*) INTO v_existing_count
  FROM customer_balance_entries
  WHERE booking_id = p_booking_id
    AND tenant_id = p_tenant_id
    AND type = 'debit'
    AND description = 'Serviço realizado';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PAYMENT');
  END IF;

  -- 2. Get service price
  SELECT s.price_cents INTO v_service_price
  FROM bookings b
  JOIN services s ON s.id = b.service_id
  WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 3. Current balance
  SELECT COALESCE(SUM(
    CASE WHEN type = 'credit' THEN amount_cents ELSE -amount_cents END
  ), 0) INTO v_balance
  FROM customer_balance_entries
  WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

  -- 4. Register service debit
  INSERT INTO customer_balance_entries (
    tenant_id, customer_id, type, amount_cents,
    description, booking_id, staff_id
  ) VALUES (
    p_tenant_id, p_customer_id, 'debit', v_service_price,
    'Serviço realizado', p_booking_id, p_staff_id
  );
  v_balance := v_balance - v_service_price;

  -- 5. Process extra items (products or services)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_extra_items)
  LOOP
    v_extra_total := v_extra_total + (v_item->>'price_cents')::integer;

    -- Debit customer balance for extra item
    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'debit',
      (v_item->>'price_cents')::integer,
      COALESCE(v_item->>'name', 'Item extra'),
      p_booking_id,
      COALESCE((v_item->>'staff_id')::uuid, p_staff_id)
    );

    -- If product, create product_sales entry
    IF (v_item->>'type') = 'product' THEN
      INSERT INTO product_sales (
        tenant_id, product_id, quantity,
        sale_price_snapshot_cents, purchase_price_snapshot_cents,
        staff_id, notes
      ) VALUES (
        p_tenant_id, (v_item->>'id')::uuid, COALESCE((v_item->>'quantity')::integer, 1),
        (v_item->>'price_cents')::integer,
        COALESCE((v_item->>'purchase_price_cents')::integer, 0),
        COALESCE((v_item->>'staff_id')::uuid, p_staff_id),
        'Venda via comanda booking ' || p_booking_id::text
      );
    END IF;

    v_balance := v_balance - (v_item->>'price_cents')::integer;
  END LOOP;

  -- 6. Calculate total received
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_total_received := v_total_received + (v_payment->>'amount_cents')::integer;
  END LOOP;

  -- 7. Cash entries for each payment line
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

  -- 8. Credit for total received
  IF v_total_received > 0 THEN
    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'credit', v_total_received,
      'Pagamento local (receipt:' || p_receipt_id::text || ')',
      p_booking_id, p_staff_id
    );
    v_balance := v_balance + v_total_received;
  END IF;

  -- 9. Handle change
  v_change := GREATEST(0, v_balance);

  IF v_change > 0 AND NOT p_keep_change_as_credit THEN
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

    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'debit', v_change,
      'Troco devolvido (receipt:' || p_receipt_id::text || ')',
      p_booking_id, p_staff_id
    );
    v_balance := v_balance - v_change;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_received', v_total_received,
    'extra_items_total', v_extra_total,
    'change', v_change,
    'kept_as_credit', p_keep_change_as_credit AND v_change > 0,
    'new_balance', v_balance
  );
END;
$function$;