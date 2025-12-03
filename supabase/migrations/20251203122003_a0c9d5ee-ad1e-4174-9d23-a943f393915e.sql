-- Create seller_profiles table
CREATE TABLE public.seller_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  cpf TEXT NOT NULL UNIQUE,
  pix_key TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  is_suspended BOOLEAN NOT NULL DEFAULT false,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  total_sales INTEGER NOT NULL DEFAULT 0,
  average_rating NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_products table
CREATE TABLE public.seller_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_sales table
CREATE TABLE public.seller_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT NOT NULL,
  product_name TEXT NOT NULL,
  sale_amount NUMERIC NOT NULL,
  fee_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  balance_released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller_withdrawals table
CREATE TABLE public.seller_withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  pix_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_withdrawals ENABLE ROW LEVEL SECURITY;

-- Seller profiles policies
CREATE POLICY "Users can view their own seller profile" ON public.seller_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seller profile" ON public.seller_profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seller profile" ON public.seller_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view approved sellers" ON public.seller_profiles
FOR SELECT USING (is_approved = true AND is_suspended = false);

CREATE POLICY "Admins can manage all seller profiles" ON public.seller_profiles
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seller products policies
CREATE POLICY "Anyone can view active seller products" ON public.seller_products
FOR SELECT USING (is_active = true);

CREATE POLICY "Sellers can manage their own products" ON public.seller_products
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_products.seller_id 
    AND user_id = auth.uid()
    AND is_approved = true
    AND is_suspended = false
  )
);

CREATE POLICY "Admins can manage all seller products" ON public.seller_products
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seller sales policies
CREATE POLICY "Sellers can view their own sales" ON public.seller_sales
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_sales.seller_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Allow creating sales" ON public.seller_sales
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all sales" ON public.seller_sales
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Seller withdrawals policies
CREATE POLICY "Sellers can view their own withdrawals" ON public.seller_withdrawals
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_withdrawals.seller_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can create withdrawal requests" ON public.seller_withdrawals
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.seller_profiles 
    WHERE id = seller_withdrawals.seller_id 
    AND user_id = auth.uid()
    AND is_approved = true
    AND is_suspended = false
  )
);

CREATE POLICY "Admins can manage all withdrawals" ON public.seller_withdrawals
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to release balance after 1 day
CREATE OR REPLACE FUNCTION public.release_seller_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update sales that are older than 1 day and not yet released
  UPDATE public.seller_sales
  SET balance_released_at = now()
  WHERE status = 'approved'
    AND balance_released_at IS NULL
    AND created_at < now() - interval '1 day';
    
  -- Update seller available balance
  UPDATE public.seller_profiles sp
  SET 
    available_balance = available_balance + COALESCE((
      SELECT SUM(net_amount)
      FROM public.seller_sales ss
      WHERE ss.seller_id = sp.id
        AND ss.balance_released_at IS NOT NULL
        AND ss.status = 'approved'
    ), 0) - sp.available_balance,
    pending_balance = COALESCE((
      SELECT SUM(net_amount)
      FROM public.seller_sales ss
      WHERE ss.seller_id = sp.id
        AND ss.balance_released_at IS NULL
        AND ss.status = 'approved'
    ), 0);
END;
$$;

-- Trigger to update seller stats on sale
CREATE OR REPLACE FUNCTION public.update_seller_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    UPDATE public.seller_profiles
    SET 
      total_sales = total_sales + 1,
      pending_balance = pending_balance + NEW.net_amount
    WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_seller_sale_approved
AFTER INSERT OR UPDATE ON public.seller_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_seller_stats();