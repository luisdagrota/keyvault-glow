
-- Add vacation mode fields to seller_profiles
ALTER TABLE public.seller_profiles
ADD COLUMN is_on_vacation boolean NOT NULL DEFAULT false,
ADD COLUMN vacation_started_at timestamp with time zone,
ADD COLUMN vacation_ends_at timestamp with time zone,
ADD COLUMN vacation_message text;

-- Create index for vacation status queries
CREATE INDEX idx_seller_profiles_vacation ON public.seller_profiles (is_on_vacation) WHERE is_on_vacation = true;
