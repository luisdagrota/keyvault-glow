-- Add CPF change tracking and fraud alert system

-- Add column to track CPF change attempts
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS cpf_change_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_cpf text,
ADD COLUMN IF NOT EXISTS last_profile_change timestamp with time zone,
ADD COLUMN IF NOT EXISTS fraud_risk_level text DEFAULT 'low';

-- Create fraud alerts table
CREATE TABLE public.fraud_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  description text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamp with time zone,
  resolved_by uuid,
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fraud_alerts
CREATE POLICY "Admins can manage all fraud alerts"
  ON public.fraud_alerts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add unique constraint on CPF to prevent duplicates
ALTER TABLE public.seller_profiles 
ADD CONSTRAINT unique_seller_cpf UNIQUE (cpf);

-- Function to track profile changes and generate alerts
CREATE OR REPLACE FUNCTION public.track_seller_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_sales boolean;
BEGIN
  -- Check if seller has any sales
  SELECT EXISTS(SELECT 1 FROM seller_sales WHERE seller_id = NEW.id) INTO has_sales;
  
  -- Track CPF changes
  IF OLD.cpf IS DISTINCT FROM NEW.cpf THEN
    NEW.cpf_change_count := COALESCE(OLD.cpf_change_count, 0) + 1;
    
    -- Store original CPF on first change
    IF OLD.original_cpf IS NULL THEN
      NEW.original_cpf := OLD.cpf;
    END IF;
    
    -- Alert if trying to change CPF more than once
    IF NEW.cpf_change_count > 1 THEN
      INSERT INTO fraud_alerts (seller_id, alert_type, description, severity)
      VALUES (
        NEW.id,
        'cpf_change_attempt',
        'Vendedor tentou alterar CPF mais de uma vez. CPF original: ' || COALESCE(NEW.original_cpf, OLD.cpf) || ', Novo CPF: ' || NEW.cpf,
        'high'
      );
      
      -- Auto-block on multiple CPF changes
      NEW.is_suspended := true;
      NEW.fraud_risk_level := 'high';
    END IF;
  END IF;
  
  -- Track other sensitive changes after seller has sales
  IF has_sales AND (
    OLD.pix_key IS DISTINCT FROM NEW.pix_key OR
    OLD.full_name IS DISTINCT FROM NEW.full_name
  ) THEN
    NEW.last_profile_change := now();
    
    INSERT INTO fraud_alerts (seller_id, alert_type, description, severity)
    VALUES (
      NEW.id,
      'profile_change_after_sales',
      'Vendedor alterou dados sensíveis após iniciar vendas. Alterações: ' ||
        CASE WHEN OLD.pix_key IS DISTINCT FROM NEW.pix_key THEN 'Chave Pix alterada. ' ELSE '' END ||
        CASE WHEN OLD.full_name IS DISTINCT FROM NEW.full_name THEN 'Nome alterado de "' || OLD.full_name || '" para "' || NEW.full_name || '". ' ELSE '' END,
      'medium'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile changes
DROP TRIGGER IF EXISTS on_seller_profile_change ON public.seller_profiles;
CREATE TRIGGER on_seller_profile_change
  BEFORE UPDATE ON public.seller_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.track_seller_profile_changes();

-- Function to check for consecutive negative reviews
CREATE OR REPLACE FUNCTION public.check_consecutive_negative_reviews()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  seller_uuid uuid;
  consecutive_negative integer;
  last_reviews integer[];
BEGIN
  -- Get seller_id from the product (for seller products)
  SELECT sp.seller_id INTO seller_uuid
  FROM seller_products sp
  WHERE sp.id::text = NEW.product_id;
  
  -- Only proceed if this is a seller product review
  IF seller_uuid IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get last 4 review ratings for this seller's products
  SELECT ARRAY(
    SELECT pr.rating
    FROM product_reviews pr
    JOIN seller_products sp ON sp.id::text = pr.product_id
    WHERE sp.seller_id = seller_uuid
      AND pr.is_approved = true
    ORDER BY pr.created_at DESC
    LIMIT 4
  ) INTO last_reviews;
  
  -- Count consecutive ratings <= 2 (negative)
  consecutive_negative := 0;
  FOR i IN 1..array_length(last_reviews, 1) LOOP
    IF last_reviews[i] <= 2 THEN
      consecutive_negative := consecutive_negative + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  -- Alert if more than 3 consecutive negative reviews
  IF consecutive_negative >= 3 THEN
    -- Check if alert already exists and is not resolved
    IF NOT EXISTS (
      SELECT 1 FROM fraud_alerts 
      WHERE seller_id = seller_uuid 
        AND alert_type = 'consecutive_negative_reviews'
        AND is_resolved = false
    ) THEN
      INSERT INTO fraud_alerts (seller_id, alert_type, description, severity)
      VALUES (
        seller_uuid,
        'consecutive_negative_reviews',
        'Vendedor recebeu ' || consecutive_negative || ' avaliações negativas consecutivas (rating <= 2)',
        'high'
      );
      
      -- Update risk level
      UPDATE seller_profiles 
      SET fraud_risk_level = 'high'
      WHERE id = seller_uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for negative reviews check
DROP TRIGGER IF EXISTS on_review_check_fraud ON public.product_reviews;
CREATE TRIGGER on_review_check_fraud
  AFTER INSERT OR UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.check_consecutive_negative_reviews();

-- Function to create admin notification for fraud alerts
CREATE OR REPLACE FUNCTION public.notify_admin_fraud_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  seller_name text;
BEGIN
  -- Get seller name
  SELECT full_name INTO seller_name FROM seller_profiles WHERE id = NEW.seller_id;
  
  -- Notify all admins
  FOR admin_record IN 
    SELECT user_id FROM user_roles WHERE role = 'admin'::app_role
  LOOP
    INSERT INTO user_notifications (user_id, type, title, message, link)
    VALUES (
      admin_record.user_id,
      'fraud_alert',
      '⚠️ Alerta de Fraude - ' || NEW.severity,
      'Vendedor: ' || seller_name || ' - ' || NEW.description,
      '/admin/fraud'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Create trigger for admin notifications
DROP TRIGGER IF EXISTS on_fraud_alert_notify ON public.fraud_alerts;
CREATE TRIGGER on_fraud_alert_notify
  AFTER INSERT ON public.fraud_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_fraud_alert();

-- Enable realtime for fraud alerts
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_alerts;