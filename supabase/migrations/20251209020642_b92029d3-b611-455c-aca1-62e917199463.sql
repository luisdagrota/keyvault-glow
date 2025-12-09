-- Create table for product keys/codes inventory
CREATE TABLE public.seller_product_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  key_content TEXT NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_product_keys ENABLE ROW LEVEL SECURITY;

-- Sellers can manage keys for their own products
CREATE POLICY "Sellers can manage their product keys"
ON public.seller_product_keys
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM seller_products sp
    JOIN seller_profiles spr ON sp.seller_id = spr.id
    WHERE sp.id = seller_product_keys.product_id
    AND spr.user_id = auth.uid()
  )
);

-- Admins can manage all keys
CREATE POLICY "Admins can manage all product keys"
ON public.seller_product_keys
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_seller_product_keys_product_available ON public.seller_product_keys(product_id, is_used) WHERE is_used = false;