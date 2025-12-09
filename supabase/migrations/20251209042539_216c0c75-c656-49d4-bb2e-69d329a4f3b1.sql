
-- Create product reports table for reporting listings
CREATE TABLE IF NOT EXISTS public.product_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.seller_products(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  report_type text NOT NULL DEFAULT 'inappropriate', -- inappropriate, scam, fake, spam, other
  status text NOT NULL DEFAULT 'pending', -- pending, confirmed, dismissed
  admin_notes text,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, reporter_id)
);

-- Enable RLS
ALTER TABLE public.product_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create product reports"
ON public.product_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports"
ON public.product_reports
FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can manage all product reports"
ON public.product_reports
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add reports_count to seller_profiles if not exists
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS reports_count integer DEFAULT 0;

-- Function to update seller reports count and notify admin
CREATE OR REPLACE FUNCTION public.handle_product_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_name text;
  product_name text;
  admin_record RECORD;
BEGIN
  -- Get seller and product info
  SELECT sp.full_name INTO seller_name FROM seller_profiles sp WHERE sp.id = NEW.seller_id;
  SELECT p.name INTO product_name FROM seller_products p WHERE p.id = NEW.product_id;
  
  -- Increment seller reports count
  UPDATE seller_profiles
  SET reports_count = reports_count + 1
  WHERE id = NEW.seller_id;
  
  -- Notify seller
  INSERT INTO seller_notifications (seller_id, type, title, message, product_id)
  VALUES (
    NEW.seller_id,
    'report_received',
    '⚠️ Seu anúncio foi denunciado',
    'O produto "' || product_name || '" recebeu uma denúncia. Motivo: ' || NEW.report_type || '. Nossa equipe irá analisar.',
    NEW.product_id
  );
  
  -- Notify all admins
  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO user_notifications (user_id, type, title, message, link)
    VALUES (
      admin_record.user_id,
      'product_report',
      '🚨 Nova denúncia de anúncio',
      'Vendedor: ' || seller_name || ' - Produto: ' || product_name || ' - Tipo: ' || NEW.report_type,
      '/admin?tab=reports'
    );
  END LOOP;
  
  -- Auto-suspend seller if too many reports (5+)
  UPDATE seller_profiles
  SET 
    is_suspended = true,
    fraud_risk_level = 'high'
  WHERE id = NEW.seller_id
  AND reports_count >= 5;
  
  -- Notify seller if suspended
  IF (SELECT reports_count FROM seller_profiles WHERE id = NEW.seller_id) >= 5 THEN
    INSERT INTO seller_notifications (seller_id, type, title, message)
    VALUES (
      NEW.seller_id,
      'account_suspended',
      '🚫 Conta suspensa',
      'Sua conta foi suspensa devido a múltiplas denúncias. Entre em contato com o suporte.'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for product reports
DROP TRIGGER IF EXISTS on_product_report_created ON public.product_reports;
CREATE TRIGGER on_product_report_created
  AFTER INSERT ON public.product_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_product_report();

-- Function to handle confirmed reports (add warning)
CREATE OR REPLACE FUNCTION public.handle_confirmed_product_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
    -- Update seller warning count
    UPDATE seller_profiles
    SET warning_count = warning_count + 1
    WHERE id = NEW.seller_id;
    
    -- Auto-suspend if 3+ warnings
    UPDATE seller_profiles
    SET is_suspended = true
    WHERE id = NEW.seller_id
    AND warning_count >= 3;
    
    -- Notify seller
    INSERT INTO seller_notifications (seller_id, type, title, message, product_id)
    VALUES (
      NEW.seller_id,
      'report_confirmed',
      '❌ Denúncia confirmada',
      'Uma denúncia contra seu produto foi confirmada. Isso conta como um aviso na sua conta.',
      NEW.product_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for confirmed reports
DROP TRIGGER IF EXISTS on_product_report_confirmed ON public.product_reports;
CREATE TRIGGER on_product_report_confirmed
  AFTER UPDATE ON public.product_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_confirmed_product_report();
