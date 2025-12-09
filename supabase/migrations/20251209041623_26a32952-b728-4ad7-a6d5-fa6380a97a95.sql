
-- Add buyer reputation fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS buyer_rating numeric DEFAULT 5.0,
ADD COLUMN IF NOT EXISTS total_purchases integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_ratings_received integer DEFAULT 0;

-- Create buyer reviews table (sellers rating buyers)
CREATE TABLE IF NOT EXISTS public.buyer_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(order_id, seller_id)
);

-- Enable RLS
ALTER TABLE public.buyer_reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for buyer_reviews
CREATE POLICY "Sellers can create reviews for their buyers"
ON public.buyer_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM seller_profiles
    WHERE seller_profiles.id = buyer_reviews.seller_id
    AND seller_profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view buyer reviews"
ON public.buyer_reviews
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage all buyer reviews"
ON public.buyer_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update buyer rating when review is added
CREATE OR REPLACE FUNCTION public.update_buyer_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  avg_rating numeric;
  total_ratings integer;
BEGIN
  -- Calculate new average rating for buyer
  SELECT 
    COALESCE(AVG(rating), 5.0),
    COUNT(*)
  INTO avg_rating, total_ratings
  FROM buyer_reviews
  WHERE buyer_id = NEW.buyer_id;
  
  -- Update buyer's profile
  UPDATE profiles
  SET 
    buyer_rating = ROUND(avg_rating, 2),
    total_ratings_received = total_ratings
  WHERE id = NEW.buyer_id;
  
  RETURN NEW;
END;
$function$;

-- Trigger to update buyer rating
DROP TRIGGER IF EXISTS on_buyer_review_created ON public.buyer_reviews;
CREATE TRIGGER on_buyer_review_created
  AFTER INSERT ON public.buyer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_buyer_rating();

-- Function to increment total_purchases when order is delivered
CREATE OR REPLACE FUNCTION public.update_buyer_purchases()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'delivered' AND OLD.payment_status != 'delivered' AND NEW.user_id IS NOT NULL THEN
    UPDATE profiles
    SET total_purchases = total_purchases + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Trigger for updating purchases
DROP TRIGGER IF EXISTS on_order_delivered_update_purchases ON public.orders;
CREATE TRIGGER on_order_delivered_update_purchases
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_buyer_purchases();
