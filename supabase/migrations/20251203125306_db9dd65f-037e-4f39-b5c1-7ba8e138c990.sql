-- Create table to track user likes on seller products
CREATE TABLE public.user_product_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.user_product_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can view likes count (aggregated in seller_products.likes_count)
CREATE POLICY "Anyone can view likes"
ON public.user_product_likes
FOR SELECT
USING (true);

-- Authenticated users can like products
CREATE POLICY "Authenticated users can like products"
ON public.user_product_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can unlike (delete their own likes)
CREATE POLICY "Users can unlike their own likes"
ON public.user_product_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Function to update likes_count on seller_products
CREATE OR REPLACE FUNCTION public.update_product_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.seller_products
    SET likes_count = likes_count + 1
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.seller_products
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Trigger to auto-update likes_count
CREATE TRIGGER on_product_like_change
AFTER INSERT OR DELETE ON public.user_product_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_product_likes_count();