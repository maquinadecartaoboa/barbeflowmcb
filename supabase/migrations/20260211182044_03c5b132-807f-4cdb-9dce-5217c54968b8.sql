-- First, deduplicate customers keeping the most recently updated one
-- Move bookings/balance entries from duplicate customers to the kept one
WITH duplicates AS (
  SELECT 
    id,
    phone,
    tenant_id,
    ROW_NUMBER() OVER (PARTITION BY phone, tenant_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM customers
),
kept AS (
  SELECT id, phone, tenant_id FROM duplicates WHERE rn = 1
),
to_remove AS (
  SELECT d.id as old_id, k.id as new_id
  FROM duplicates d
  JOIN kept k ON k.phone = d.phone AND k.tenant_id = d.tenant_id
  WHERE d.rn > 1
)
-- Update bookings to point to kept customer
UPDATE bookings SET customer_id = tr.new_id
FROM to_remove tr
WHERE bookings.customer_id = tr.old_id;

-- Update customer_balance_entries
WITH duplicates AS (
  SELECT id, phone, tenant_id,
    ROW_NUMBER() OVER (PARTITION BY phone, tenant_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM customers
),
kept AS (SELECT id, phone, tenant_id FROM duplicates WHERE rn = 1),
to_remove AS (
  SELECT d.id as old_id, k.id as new_id
  FROM duplicates d JOIN kept k ON k.phone = d.phone AND k.tenant_id = d.tenant_id
  WHERE d.rn > 1
)
UPDATE customer_balance_entries SET customer_id = tr.new_id
FROM to_remove tr
WHERE customer_balance_entries.customer_id = tr.old_id;

-- Update customer_packages
WITH duplicates AS (
  SELECT id, phone, tenant_id,
    ROW_NUMBER() OVER (PARTITION BY phone, tenant_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM customers
),
kept AS (SELECT id, phone, tenant_id FROM duplicates WHERE rn = 1),
to_remove AS (
  SELECT d.id as old_id, k.id as new_id
  FROM duplicates d JOIN kept k ON k.phone = d.phone AND k.tenant_id = d.tenant_id
  WHERE d.rn > 1
)
UPDATE customer_packages SET customer_id = tr.new_id
FROM to_remove tr
WHERE customer_packages.customer_id = tr.old_id;

-- Update recurring_clients
WITH duplicates AS (
  SELECT id, phone, tenant_id,
    ROW_NUMBER() OVER (PARTITION BY phone, tenant_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM customers
),
kept AS (SELECT id, phone, tenant_id FROM duplicates WHERE rn = 1),
to_remove AS (
  SELECT d.id as old_id, k.id as new_id
  FROM duplicates d JOIN kept k ON k.phone = d.phone AND k.tenant_id = d.tenant_id
  WHERE d.rn > 1
)
UPDATE recurring_clients SET customer_id = tr.new_id
FROM to_remove tr
WHERE recurring_clients.customer_id = tr.old_id;

-- Now delete duplicate customers
WITH duplicates AS (
  SELECT id, phone, tenant_id,
    ROW_NUMBER() OVER (PARTITION BY phone, tenant_id ORDER BY updated_at DESC, created_at DESC) as rn
  FROM customers
)
DELETE FROM customers WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_customers_phone_tenant ON customers (phone, tenant_id);