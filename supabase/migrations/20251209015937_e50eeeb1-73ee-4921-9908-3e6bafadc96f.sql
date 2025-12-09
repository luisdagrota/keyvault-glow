-- Add delivery method fields to seller_products
ALTER TABLE public.seller_products 
ADD COLUMN delivery_method TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN delivery_content TEXT;

-- Add constraint for delivery_method values
ALTER TABLE public.seller_products 
ADD CONSTRAINT seller_products_delivery_method_check 
CHECK (delivery_method IN ('manual', 'automatic'));