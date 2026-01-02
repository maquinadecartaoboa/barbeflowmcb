-- 1. Remover associação errada
DELETE FROM public.users_tenant 
WHERE user_id = '351590d0-c2b4-41dc-b34e-da1bdac997c9';

-- 2. Criar nova barbearia para o usuário atual
INSERT INTO public.tenants (id, name, slug)
VALUES (
  gen_random_uuid(),
  'Minha Barbearia',
  'minha-barbearia-' || substr(gen_random_uuid()::text, 1, 8)
);

-- 3. Associar usuário como admin da nova barbearia
INSERT INTO public.users_tenant (user_id, tenant_id, role)
SELECT 
  '351590d0-c2b4-41dc-b34e-da1bdac997c9',
  id,
  'admin'
FROM public.tenants 
WHERE name = 'Minha Barbearia' AND slug LIKE 'minha-barbearia-%'
ORDER BY created_at DESC
LIMIT 1;

-- 4. Criar função para auto-criar tenant no cadastro
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
BEGIN
  -- Gerar slug único baseado no email
  base_slug := lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-z0-9]', '-', 'g'));
  final_slug := base_slug || '-' || substr(NEW.id::text, 1, 8);
  
  -- Criar novo tenant
  INSERT INTO public.tenants (name, slug)
  VALUES ('Minha Barbearia', final_slug)
  RETURNING id INTO new_tenant_id;
  
  -- Associar usuário como admin
  INSERT INTO public.users_tenant (user_id, tenant_id, role)
  VALUES (NEW.id, new_tenant_id, 'admin');
  
  RETURN NEW;
END;
$$;

-- 5. Criar trigger que executa após criação de usuário
CREATE TRIGGER on_auth_user_created_tenant
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_tenant();