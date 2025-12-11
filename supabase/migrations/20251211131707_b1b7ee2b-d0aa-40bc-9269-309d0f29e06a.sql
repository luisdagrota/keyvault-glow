-- Update chat_messages RLS policies to allow sellers to participate

-- Drop existing policies
DROP POLICY IF EXISTS "Admin can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admin can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Customers can send messages to their orders" ON public.chat_messages;
DROP POLICY IF EXISTS "Customers can view their order messages" ON public.chat_messages;

-- New policies: Sellers can view and send messages for their orders
CREATE POLICY "Sellers can view messages for their orders"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN seller_profiles sp ON sp.id = o.seller_id
    WHERE o.id = chat_messages.order_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can send messages to their orders"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN seller_profiles sp ON sp.id = o.seller_id
    WHERE o.id = chat_messages.order_id
    AND sp.user_id = auth.uid()
  )
  AND sender_type = 'seller'
);

-- Customers can view their order messages
CREATE POLICY "Customers can view their order messages"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Customers can send messages to their orders
CREATE POLICY "Customers can send messages to their orders"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_messages.order_id
    AND orders.user_id = auth.uid()
  )
  AND sender_type = 'customer'
);

-- Admin can view all messages
CREATE POLICY "Admin can view all messages"
ON public.chat_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin can send messages
CREATE POLICY "Admin can send messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND sender_type = 'admin'
);

-- Update chat_typing_status policies for sellers
DROP POLICY IF EXISTS "Anyone can view typing status for their chats" ON public.chat_typing_status;
DROP POLICY IF EXISTS "Users can update their own typing status" ON public.chat_typing_status;

CREATE POLICY "Users can view typing status for their chats"
ON public.chat_typing_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = chat_typing_status.order_id
    AND orders.user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM orders o
    JOIN seller_profiles sp ON sp.id = o.seller_id
    WHERE o.id = chat_typing_status.order_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage their own typing status"
ON public.chat_typing_status
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Update order_chat_status for sellers
DROP POLICY IF EXISTS "Admin can manage chat status" ON public.order_chat_status;

CREATE POLICY "Admin can manage chat status"
ON public.order_chat_status
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers can view chat status for their orders"
ON public.order_chat_status
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN seller_profiles sp ON sp.id = o.seller_id
    WHERE o.id = order_chat_status.order_id
    AND sp.user_id = auth.uid()
  )
);

CREATE POLICY "Sellers can update chat status for their orders"
ON public.order_chat_status
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN seller_profiles sp ON sp.id = o.seller_id
    WHERE o.id = order_chat_status.order_id
    AND sp.user_id = auth.uid()
  )
);

-- Add unread_seller_count to order_chat_status
ALTER TABLE public.order_chat_status 
ADD COLUMN IF NOT EXISTS unread_seller_count integer NOT NULL DEFAULT 0;

-- Update trigger to handle seller messages
CREATE OR REPLACE FUNCTION public.update_chat_unread_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    UPDATE public.order_chat_status
    SET 
      unread_customer_count = unread_customer_count + 1,
      unread_seller_count = unread_seller_count + 1,
      last_message_at = NEW.created_at
    WHERE order_id = NEW.order_id;
  ELSIF NEW.sender_type = 'seller' THEN
    UPDATE public.order_chat_status
    SET 
      unread_customer_count = unread_customer_count + 1,
      unread_admin_count = unread_admin_count + 1,
      last_message_at = NEW.created_at
    WHERE order_id = NEW.order_id;
  ELSE
    UPDATE public.order_chat_status
    SET 
      unread_admin_count = unread_admin_count + 1,
      unread_seller_count = unread_seller_count + 1,
      last_message_at = NEW.created_at
    WHERE order_id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$function$;

-- Update notification function for chat messages
CREATE OR REPLACE FUNCTION public.create_chat_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  seller_user_id UUID;
BEGIN
  SELECT * INTO order_record FROM orders WHERE id = NEW.order_id;
  
  IF NEW.sender_type = 'seller' THEN
    -- Notify customer about seller message
    IF order_record.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        order_record.user_id,
        'chat_message',
        '💬 Nova mensagem do vendedor!',
        'O vendedor enviou uma nova mensagem sobre seu pedido.',
        '/profile'
      );
    END IF;
  ELSIF NEW.sender_type = 'admin' THEN
    -- Notify customer about admin message
    IF order_record.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        order_record.user_id,
        'chat_message',
        '💬 Nova mensagem do suporte!',
        'O suporte enviou uma nova mensagem sobre seu pedido.',
        '/profile'
      );
    END IF;
    -- Notify seller about admin message
    IF order_record.seller_id IS NOT NULL THEN
      SELECT user_id INTO seller_user_id FROM seller_profiles WHERE id = order_record.seller_id;
      IF seller_user_id IS NOT NULL THEN
        INSERT INTO public.seller_notifications (seller_id, type, title, message)
        VALUES (
          order_record.seller_id,
          'chat_message',
          '💬 Nova mensagem do suporte!',
          'O suporte enviou uma mensagem sobre um pedido.'
        );
      END IF;
    END IF;
  ELSIF NEW.sender_type = 'customer' THEN
    -- Notify seller about customer message
    IF order_record.seller_id IS NOT NULL THEN
      INSERT INTO public.seller_notifications (seller_id, type, title, message)
      VALUES (
        order_record.seller_id,
        'chat_message',
        '💬 Nova mensagem do cliente!',
        'Um cliente enviou uma mensagem sobre um pedido.'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;