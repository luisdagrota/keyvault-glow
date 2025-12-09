-- Create typing indicators table for real-time typing status
CREATE TABLE public.chat_typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  user_type TEXT NOT NULL CHECK (user_type IN ('customer', 'admin')),
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique constraint on order_id + user_id
ALTER TABLE public.chat_typing_status
  ADD CONSTRAINT unique_typing_status UNIQUE (order_id, user_id);

-- Enable RLS
ALTER TABLE public.chat_typing_status ENABLE ROW LEVEL SECURITY;

-- Policies for typing status
CREATE POLICY "Anyone can view typing status for their chats"
ON public.chat_typing_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = chat_typing_status.order_id 
    AND orders.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can update their own typing status"
ON public.chat_typing_status
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Enable realtime for typing status
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_typing_status;

-- Create notifications table for persistent notifications
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.user_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.user_notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.user_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Function to create notification when chat message is sent
CREATE OR REPLACE FUNCTION public.create_chat_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_record RECORD;
  notification_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get order info
  SELECT * INTO order_record FROM orders WHERE id = NEW.order_id;
  
  IF NEW.sender_type = 'admin' THEN
    -- Notify customer
    notification_user_id := order_record.user_id;
    notification_title := 'Nova mensagem do suporte';
    notification_message := 'Você recebeu uma nova mensagem sobre seu pedido';
  ELSE
    -- For admin notifications, we'll handle it differently (admin checks chat_status)
    RETURN NEW;
  END IF;
  
  -- Only create notification if user_id exists
  IF notification_user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, link)
    VALUES (
      notification_user_id,
      'chat_message',
      notification_title,
      notification_message,
      '/profile'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for chat notifications
CREATE TRIGGER on_chat_message_create_notification
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_chat_notification();

-- Function to create notification when order status changes
CREATE OR REPLACE FUNCTION public.create_order_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify on status changes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    IF NEW.payment_status = 'approved' AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'order_approved',
        'Pagamento aprovado! 🎉',
        'Seu pedido de ' || NEW.product_name || ' foi aprovado. Aguarde o envio do produto.',
        '/profile'
      );
    ELSIF NEW.payment_status = 'delivered' AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'order_delivered',
        'Produto entregue! ✅',
        'Seu pedido de ' || NEW.product_name || ' foi marcado como entregue. Deixe uma avaliação!',
        '/product/' || NEW.product_id || '?orderId=' || NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order notifications
CREATE TRIGGER on_order_status_change_notification
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_notification();