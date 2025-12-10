
-- Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  seller_id UUID REFERENCES public.seller_profiles(id),
  reason TEXT NOT NULL,
  description TEXT,
  proofs TEXT[] DEFAULT '{}',
  customer_pix_key TEXT NOT NULL,
  pix_key_type TEXT NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'more_info_requested')),
  order_amount NUMERIC NOT NULL,
  seller_deducted_amount NUMERIC,
  admin_decision TEXT,
  admin_notes TEXT,
  seller_response TEXT,
  seller_responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID
);

-- Create refund_messages table for chat
CREATE TABLE public.refund_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  refund_id UUID NOT NULL REFERENCES public.refund_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'seller', 'admin')),
  message TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refund_logs table for anti-fraud
CREATE TABLE public.refund_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'seller')),
  refund_id UUID REFERENCES public.refund_requests(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for refund_requests
CREATE POLICY "Admins can manage all refunds"
ON public.refund_requests FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their own refund requests"
ON public.refund_requests FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create refund requests"
ON public.refund_requests FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Sellers can view refunds for their orders"
ON public.refund_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM seller_profiles sp
  WHERE sp.id = refund_requests.seller_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Sellers can update their response"
ON public.refund_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM seller_profiles sp
  WHERE sp.id = refund_requests.seller_id AND sp.user_id = auth.uid()
));

-- RLS Policies for refund_messages
CREATE POLICY "Admins can manage all refund messages"
ON public.refund_messages FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customers can view their refund messages"
ON public.refund_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM refund_requests rr
  WHERE rr.id = refund_messages.refund_id AND rr.customer_id = auth.uid()
));

CREATE POLICY "Customers can send messages"
ON public.refund_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM refund_requests rr
  WHERE rr.id = refund_messages.refund_id AND rr.customer_id = auth.uid()
) AND sender_type = 'customer');

CREATE POLICY "Sellers can view their refund messages"
ON public.refund_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM refund_requests rr
  JOIN seller_profiles sp ON sp.id = rr.seller_id
  WHERE rr.id = refund_messages.refund_id AND sp.user_id = auth.uid()
));

CREATE POLICY "Sellers can send messages"
ON public.refund_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM refund_requests rr
  JOIN seller_profiles sp ON sp.id = rr.seller_id
  WHERE rr.id = refund_messages.refund_id AND sp.user_id = auth.uid()
) AND sender_type = 'seller');

-- RLS for refund_logs (admin only)
CREATE POLICY "Admins can manage refund logs"
ON public.refund_logs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert logs"
ON public.refund_logs FOR INSERT
WITH CHECK (true);

-- Add monthly_refunds_count to seller_profiles
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS monthly_refunds_count INTEGER DEFAULT 0;
ALTER TABLE public.seller_profiles ADD COLUMN IF NOT EXISTS last_refund_reset TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Function to handle refund approval
CREATE OR REPLACE FUNCTION public.handle_refund_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  seller_record RECORD;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Get order details
    SELECT * INTO order_record FROM orders WHERE id = NEW.order_id;
    
    -- Get seller details
    SELECT * INTO seller_record FROM seller_profiles WHERE id = NEW.seller_id;
    
    -- Update order status
    UPDATE orders SET payment_status = 'refunded' WHERE id = NEW.order_id;
    
    -- Deduct from seller's pending balance
    UPDATE seller_profiles
    SET pending_balance = GREATEST(pending_balance - NEW.order_amount, 0)
    WHERE id = NEW.seller_id;
    
    -- Increment monthly refunds count
    UPDATE seller_profiles
    SET monthly_refunds_count = monthly_refunds_count + 1
    WHERE id = NEW.seller_id;
    
    -- Log the action
    INSERT INTO refund_logs (user_id, user_type, refund_id, action, details)
    VALUES (
      NEW.resolved_by,
      'seller',
      NEW.id,
      'refund_approved',
      jsonb_build_object('amount', NEW.order_amount, 'seller_id', NEW.seller_id)
    );
    
    -- Notify customer
    INSERT INTO user_notifications (user_id, type, title, message, link)
    VALUES (
      NEW.customer_id,
      'refund_approved',
      '✅ Reembolso Aprovado!',
      'Seu pedido de reembolso foi aprovado. O valor será enviado para a chave PIX informada.',
      '/profile'
    );
    
    -- Notify seller
    IF seller_record.user_id IS NOT NULL THEN
      INSERT INTO seller_notifications (seller_id, type, title, message)
      VALUES (
        NEW.seller_id,
        'refund_approved',
        '⚠️ Reembolso Aprovado',
        'Um reembolso de R$ ' || ROUND(NEW.order_amount::numeric, 2)::text || ' foi aprovado. O valor foi descontado do seu saldo.'
      );
    END IF;
  ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    -- Update order back to delivered
    UPDATE orders SET payment_status = 'delivered' WHERE id = NEW.order_id;
    
    -- Notify customer
    INSERT INTO user_notifications (user_id, type, title, message, link)
    VALUES (
      NEW.customer_id,
      'refund_rejected',
      '❌ Reembolso Rejeitado',
      'Seu pedido de reembolso foi rejeitado. Motivo: ' || COALESCE(NEW.admin_notes, 'Não atendeu aos critérios.'),
      '/profile'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for refund approval
CREATE TRIGGER on_refund_status_change
  AFTER UPDATE ON public.refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_refund_approval();

-- Function to reset monthly refunds count
CREATE OR REPLACE FUNCTION public.reset_monthly_refunds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE seller_profiles
  SET monthly_refunds_count = 0, last_refund_reset = now()
  WHERE last_refund_reset < date_trunc('month', now());
END;
$$;

-- Function to check if customer can request refund
CREATE OR REPLACE FUNCTION public.can_request_refund(order_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = order_id
    AND o.user_id = auth.uid()
    AND (
      o.payment_status IN ('approved', 'delivered')
      OR (o.payment_status = 'delivered' AND o.updated_at > now() - interval '48 hours')
    )
    AND NOT EXISTS (
      SELECT 1 FROM refund_requests rr
      WHERE rr.order_id = o.id AND rr.status NOT IN ('rejected')
    )
  )
$$;

-- Create storage bucket for refund proofs
INSERT INTO storage.buckets (id, name, public)
VALUES ('refund-proofs', 'refund-proofs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for refund proofs
CREATE POLICY "Users can upload refund proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'refund-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their refund proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'refund-proofs' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all refund proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'refund-proofs' AND has_role(auth.uid(), 'admin'::app_role));
