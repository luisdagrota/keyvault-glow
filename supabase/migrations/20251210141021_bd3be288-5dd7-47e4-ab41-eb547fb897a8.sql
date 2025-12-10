-- Create function to deduct seller coupon discount from pending balance
CREATE OR REPLACE FUNCTION public.deduct_seller_coupon_balance(p_seller_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE seller_profiles
  SET pending_balance = GREATEST(0, pending_balance - p_amount)
  WHERE id = p_seller_id;
END;
$$;