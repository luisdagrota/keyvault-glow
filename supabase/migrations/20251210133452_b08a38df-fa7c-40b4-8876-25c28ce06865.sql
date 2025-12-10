-- Create seller_coupons table
CREATE TABLE IF NOT EXISTS public.seller_coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  total_discount_given NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, code)
);

-- Create seller_coupon_products table
CREATE TABLE IF NOT EXISTS public.seller_coupon_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL,
  product_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, product_id)
);

-- Create seller_coupon_usage table
CREATE TABLE IF NOT EXISTS public.seller_coupon_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL,
  order_id UUID,
  user_id UUID,
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_coupon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_coupon_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Sellers can manage their own coupons" ON public.seller_coupons;
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.seller_coupons;
DROP POLICY IF EXISTS "Admins can manage all coupons" ON public.seller_coupons;
DROP POLICY IF EXISTS "Sellers can manage their coupon products" ON public.seller_coupon_products;
DROP POLICY IF EXISTS "Anyone can view coupon products" ON public.seller_coupon_products;
DROP POLICY IF EXISTS "Admins can manage all coupon products" ON public.seller_coupon_products;
DROP POLICY IF EXISTS "System can insert usage" ON public.seller_coupon_usage;
DROP POLICY IF EXISTS "Sellers can view their coupon usage" ON public.seller_coupon_usage;
DROP POLICY IF EXISTS "Admins can view all usage" ON public.seller_coupon_usage;

-- RLS Policies for seller_coupons
CREATE POLICY "Sellers can manage their own coupons"
ON public.seller_coupons FOR ALL
USING (EXISTS (
  SELECT 1 FROM seller_profiles
  WHERE seller_profiles.id = seller_coupons.seller_id
  AND seller_profiles.user_id = auth.uid()
));

CREATE POLICY "Anyone can view active coupons"
ON public.seller_coupons FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage all coupons"
ON public.seller_coupons FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for seller_coupon_products
CREATE POLICY "Sellers can manage their coupon products"
ON public.seller_coupon_products FOR ALL
USING (EXISTS (
  SELECT 1 FROM seller_coupons sc
  JOIN seller_profiles sp ON sp.id = sc.seller_id
  WHERE sc.id = seller_coupon_products.coupon_id
  AND sp.user_id = auth.uid()
));

CREATE POLICY "Anyone can view coupon products"
ON public.seller_coupon_products FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all coupon products"
ON public.seller_coupon_products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for seller_coupon_usage
CREATE POLICY "System can insert usage"
ON public.seller_coupon_usage FOR INSERT
WITH CHECK (true);

CREATE POLICY "Sellers can view their coupon usage"
ON public.seller_coupon_usage FOR SELECT
USING (EXISTS (
  SELECT 1 FROM seller_coupons sc
  JOIN seller_profiles sp ON sp.id = sc.seller_id
  WHERE sc.id = seller_coupon_usage.coupon_id
  AND sp.user_id = auth.uid()
));

CREATE POLICY "Admins can view all usage"
ON public.seller_coupon_usage FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_seller_coupons_seller_id ON public.seller_coupons(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_coupons_code ON public.seller_coupons(code);
CREATE INDEX IF NOT EXISTS idx_seller_coupon_products_coupon_id ON public.seller_coupon_products(coupon_id);
CREATE INDEX IF NOT EXISTS idx_seller_coupon_products_product_id ON public.seller_coupon_products(product_id);