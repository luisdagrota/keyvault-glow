-- Customer Points System
CREATE TABLE public.customer_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  level TEXT NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Point Transactions History
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earned', 'redeemed', 'expired'
  description TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  coupon_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customer_points
CREATE POLICY "Users can view their own points"
  ON public.customer_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points"
  ON public.customer_points FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update points"
  ON public.customer_points FOR UPDATE
  USING (true);

-- RLS Policies for point_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.point_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.point_transactions FOR INSERT
  WITH CHECK (true);

-- Function to calculate customer level based on lifetime points
CREATE OR REPLACE FUNCTION public.calculate_customer_level(lifetime_pts INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF lifetime_pts >= 10000 THEN RETURN 'diamante';
  ELSIF lifetime_pts >= 5000 THEN RETURN 'platina';
  ELSIF lifetime_pts >= 2000 THEN RETURN 'ouro';
  ELSIF lifetime_pts >= 500 THEN RETURN 'prata';
  ELSE RETURN 'bronze';
  END IF;
END;
$$;

-- Function to award points on order delivery
CREATE OR REPLACE FUNCTION public.award_points_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  points_to_award INTEGER;
  current_total INTEGER;
  current_lifetime INTEGER;
  new_level TEXT;
BEGIN
  -- Only award points when order is marked as delivered
  IF NEW.payment_status = 'delivered' AND OLD.payment_status != 'delivered' AND NEW.user_id IS NOT NULL THEN
    -- Calculate points: 1 point per R$1 spent
    points_to_award := FLOOR(NEW.transaction_amount);
    
    -- Get or create customer points record
    INSERT INTO customer_points (user_id, total_points, lifetime_points)
    VALUES (NEW.user_id, points_to_award, points_to_award)
    ON CONFLICT (user_id) DO UPDATE
    SET 
      total_points = customer_points.total_points + points_to_award,
      lifetime_points = customer_points.lifetime_points + points_to_award,
      updated_at = now();
    
    -- Get updated totals
    SELECT total_points, lifetime_points INTO current_total, current_lifetime
    FROM customer_points WHERE user_id = NEW.user_id;
    
    -- Update level
    new_level := calculate_customer_level(current_lifetime);
    UPDATE customer_points SET level = new_level WHERE user_id = NEW.user_id;
    
    -- Record transaction
    INSERT INTO point_transactions (user_id, points, transaction_type, description, order_id)
    VALUES (NEW.user_id, points_to_award, 'earned', 'Pontos ganhos pela compra de ' || NEW.product_name, NEW.id);
    
    -- Notify user
    INSERT INTO user_notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'points_earned',
      '🎉 Você ganhou pontos!',
      'Você ganhou ' || points_to_award || ' pontos pela sua compra. Seu nível atual: ' || new_level,
      '/profile?tab=rewards'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for awarding points
CREATE TRIGGER award_points_on_order_delivery
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.award_points_on_delivery();

-- Enable realtime for customer_points
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.point_transactions;