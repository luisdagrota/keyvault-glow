-- Create seller challenges table
CREATE TABLE public.seller_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL DEFAULT 'sales', -- 'sales', 'rating', 'reviews', 'engagement'
  target_value INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'badge', -- 'badge', 'fee_reduction', 'homepage_highlight'
  reward_value TEXT, -- badge name, fee reduction %, etc.
  reward_fee_reduction NUMERIC DEFAULT 0, -- percentage reduction if reward_type is fee_reduction
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month' - interval '1 second'),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller challenge progress table
CREATE TABLE public.seller_challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.seller_challenges(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  reward_claimed BOOLEAN NOT NULL DEFAULT false,
  reward_claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(seller_id, challenge_id)
);

-- Create seller rewards table (for earned rewards)
CREATE TABLE public.seller_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.seller_challenges(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_value TEXT,
  fee_reduction_percentage NUMERIC DEFAULT 0,
  fee_reduction_expires_at TIMESTAMP WITH TIME ZONE,
  homepage_highlight_expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_challenges
CREATE POLICY "Anyone can view active challenges" ON public.seller_challenges
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all challenges" ON public.seller_challenges
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for seller_challenge_progress
CREATE POLICY "Sellers can view their own progress" ON public.seller_challenge_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = seller_challenge_progress.seller_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage progress" ON public.seller_challenge_progress
  FOR ALL USING (true);

CREATE POLICY "Admins can manage all progress" ON public.seller_challenge_progress
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for seller_rewards
CREATE POLICY "Sellers can view their own rewards" ON public.seller_rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM seller_profiles sp
      WHERE sp.id = seller_rewards.seller_id
      AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "System can manage rewards" ON public.seller_rewards
  FOR ALL USING (true);

CREATE POLICY "Admins can manage all rewards" ON public.seller_rewards
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to update challenge progress when a sale is made
CREATE OR REPLACE FUNCTION public.update_seller_challenge_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  challenge_record RECORD;
  current_progress INTEGER;
  seller_rating NUMERIC;
  monthly_sales INTEGER;
BEGIN
  IF NEW.status = 'approved' THEN
    -- Get seller's current stats
    SELECT average_rating INTO seller_rating FROM seller_profiles WHERE id = NEW.seller_id;
    
    -- Count monthly sales
    SELECT COUNT(*) INTO monthly_sales 
    FROM seller_sales 
    WHERE seller_id = NEW.seller_id 
    AND status = 'approved'
    AND created_at >= date_trunc('month', now());
    
    -- Loop through active challenges
    FOR challenge_record IN 
      SELECT * FROM seller_challenges 
      WHERE is_active = true 
      AND now() BETWEEN start_date AND end_date
    LOOP
      -- Insert or update progress
      INSERT INTO seller_challenge_progress (seller_id, challenge_id, current_value)
      VALUES (NEW.seller_id, challenge_record.id, 
        CASE 
          WHEN challenge_record.challenge_type = 'sales' THEN monthly_sales
          WHEN challenge_record.challenge_type = 'rating' THEN FLOOR(seller_rating * 10)
          ELSE 0
        END
      )
      ON CONFLICT (seller_id, challenge_id) DO UPDATE
      SET 
        current_value = CASE 
          WHEN challenge_record.challenge_type = 'sales' THEN monthly_sales
          WHEN challenge_record.challenge_type = 'rating' THEN FLOOR(seller_rating * 10)
          ELSE seller_challenge_progress.current_value
        END,
        updated_at = now();
      
      -- Check if challenge is completed
      SELECT current_value INTO current_progress 
      FROM seller_challenge_progress 
      WHERE seller_id = NEW.seller_id AND challenge_id = challenge_record.id;
      
      IF current_progress >= challenge_record.target_value THEN
        UPDATE seller_challenge_progress
        SET is_completed = true, completed_at = now()
        WHERE seller_id = NEW.seller_id 
        AND challenge_id = challenge_record.id
        AND is_completed = false;
        
        -- Notify seller of completion
        IF FOUND THEN
          INSERT INTO seller_notifications (seller_id, type, title, message)
          VALUES (
            NEW.seller_id,
            'challenge_completed',
            '🏆 Desafio concluído!',
            'Parabéns! Você completou o desafio "' || challenge_record.title || '". Resgate sua recompensa!'
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for updating challenge progress on sales
CREATE TRIGGER on_seller_sale_update_challenge
  AFTER INSERT OR UPDATE ON public.seller_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_seller_challenge_progress();

-- Insert default monthly challenges
INSERT INTO public.seller_challenges (title, description, challenge_type, target_value, reward_type, reward_value, reward_fee_reduction) VALUES
  ('Vendedor Estrela', 'Realize 50 vendas este mês', 'sales', 50, 'badge', 'challenge_star', 0),
  ('Mega Vendedor', 'Realize 100 vendas este mês', 'sales', 100, 'fee_reduction', 'Redução de 2% na taxa', 2),
  ('Vendedor Elite', 'Realize 200 vendas este mês', 'sales', 200, 'homepage_highlight', 'Destaque na home por 7 dias', 0),
  ('Avaliação de Ouro', 'Mantenha avaliação acima de 4.5', 'rating', 45, 'badge', 'gold_rating', 0),
  ('Primeiros Passos', 'Realize suas primeiras 10 vendas', 'sales', 10, 'badge', 'first_steps', 0);