-- Create seller_notifications table for in-app notifications
CREATE TABLE public.seller_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'product_approved', 'product_rejected', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  product_id UUID REFERENCES public.seller_products(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_notifications ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own notifications
CREATE POLICY "Sellers can view their own notifications"
ON public.seller_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM seller_profiles
    WHERE seller_profiles.id = seller_notifications.seller_id
    AND seller_profiles.user_id = auth.uid()
  )
);

-- Sellers can update (mark as read) their own notifications
CREATE POLICY "Sellers can update their own notifications"
ON public.seller_notifications
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM seller_profiles
    WHERE seller_profiles.id = seller_notifications.seller_id
    AND seller_profiles.user_id = auth.uid()
  )
);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications"
ON public.seller_notifications
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for seller_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_notifications;