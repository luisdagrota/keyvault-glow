-- Corrigir função update_orders_updated_at com search_path usando CASCADE
DROP FUNCTION IF EXISTS public.update_orders_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();