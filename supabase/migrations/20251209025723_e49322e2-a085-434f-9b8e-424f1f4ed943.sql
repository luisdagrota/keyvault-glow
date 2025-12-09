
-- Add seller reference to orders for seller products
ALTER TABLE public.orders ADD COLUMN seller_id UUID REFERENCES public.seller_profiles(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN seller_name TEXT;
