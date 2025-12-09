
-- Create seller_warnings table
CREATE TABLE public.seller_warnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add warning_count to seller_profiles
ALTER TABLE public.seller_profiles ADD COLUMN warning_count INTEGER NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE public.seller_warnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all warnings"
  ON public.seller_warnings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can view their own warnings"
  ON public.seller_warnings
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM seller_profiles
    WHERE seller_profiles.id = seller_warnings.seller_id
    AND seller_profiles.user_id = auth.uid()
  ));

-- Function to auto-suspend after 3 warnings
CREATE OR REPLACE FUNCTION public.check_seller_warnings()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update warning count
  UPDATE public.seller_profiles
  SET warning_count = (
    SELECT COUNT(*) FROM public.seller_warnings WHERE seller_id = NEW.seller_id
  )
  WHERE id = NEW.seller_id;
  
  -- Auto-suspend if 3 or more warnings
  UPDATE public.seller_profiles
  SET is_suspended = true
  WHERE id = NEW.seller_id
  AND warning_count >= 3;
  
  RETURN NEW;
END;
$$;

-- Trigger to check warnings after insert
CREATE TRIGGER on_seller_warning_created
  AFTER INSERT ON public.seller_warnings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_seller_warnings();
