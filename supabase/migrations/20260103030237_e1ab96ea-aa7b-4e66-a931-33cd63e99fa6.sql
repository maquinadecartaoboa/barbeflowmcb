-- Adicionar coluna public_key para Checkout Transparente
ALTER TABLE public.mercadopago_connections 
ADD COLUMN IF NOT EXISTS public_key TEXT;