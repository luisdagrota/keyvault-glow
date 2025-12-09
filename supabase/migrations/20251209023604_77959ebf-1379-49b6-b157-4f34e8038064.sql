-- Add banner and bio to seller_profiles
ALTER TABLE public.seller_profiles
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create seller_followers table for follow functionality
CREATE TABLE public.seller_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  follower_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_follow UNIQUE (seller_id, follower_id)
);

-- Enable RLS
ALTER TABLE public.seller_followers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seller_followers
CREATE POLICY "Anyone can view follower counts"
ON public.seller_followers
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can follow sellers"
ON public.seller_followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow"
ON public.seller_followers
FOR DELETE
USING (auth.uid() = follower_id);

-- Enable realtime for followers
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_followers;