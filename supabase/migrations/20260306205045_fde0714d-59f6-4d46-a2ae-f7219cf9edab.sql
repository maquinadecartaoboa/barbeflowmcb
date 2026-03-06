CREATE OR REPLACE FUNCTION public.handle_new_user_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
  base_slug text;
  final_slug text;
  v_business_name text;
  v_phone text;
BEGIN
  -- Read metadata from signup
  v_business_name := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'business_name'), ''), 'Meu Negócio');
  v_phone := NEW.raw_user_meta_data->>'phone';
  
  -- Generate unique slug based on email
  base_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  final_slug := base_slug || '-' || substr(NEW.id::text, 1, 8);
  
  -- Create new tenant with business name and phone
  INSERT INTO public.tenants (name, slug, phone)
  VALUES (v_business_name, final_slug, v_phone)
  RETURNING id INTO new_tenant_id;
  
  -- Associate user as admin
  INSERT INTO public.users_tenant (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'admin');
  
  RETURN NEW;
END;
$$;