-- Fix the check_consecutive_negative_reviews function to handle NULL arrays
CREATE OR REPLACE FUNCTION public.check_consecutive_negative_reviews()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  seller_uuid uuid;
  consecutive_negative integer;
  last_reviews integer[];
  arr_length integer;
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
  
  -- Get array length safely
  arr_length := COALESCE(array_length(last_reviews, 1), 0);
  
  -- Only proceed if we have reviews
  IF arr_length = 0 THEN
    RETURN NEW;
  END IF;
  
  -- Count consecutive ratings <= 2 (negative)
  consecutive_negative := 0;
  FOR i IN 1..arr_length LOOP
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
$function$;