-- Criar bucket para anexos do chat
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Tabela de mensagens do chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  message TEXT,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Tabela para rastrear status dos chats
CREATE TABLE IF NOT EXISTS public.order_chat_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_admin_count INTEGER NOT NULL DEFAULT 0,
  unread_customer_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_chat_status ENABLE ROW LEVEL SECURITY;

-- Políticas para chat_messages
CREATE POLICY "Admin can view all messages"
  ON public.chat_messages
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com');

CREATE POLICY "Customers can view their order messages"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = chat_messages.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can send messages"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com')
    AND sender_type = 'admin'
  );

CREATE POLICY "Customers can send messages to their orders"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = chat_messages.order_id
      AND orders.user_id = auth.uid()
    )
    AND sender_type = 'customer'
  );

-- Políticas para order_chat_status
CREATE POLICY "Admin can view all chat status"
  ON public.order_chat_status
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com');

CREATE POLICY "Customers can view their order chat status"
  ON public.order_chat_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_chat_status.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can manage chat status"
  ON public.order_chat_status
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com')
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com');

CREATE POLICY "Customers can update their chat status"
  ON public.order_chat_status
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_chat_status.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Políticas de storage para anexos do chat
CREATE POLICY "Admin can view all attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com')
  );

CREATE POLICY "Customers can view their order attachments"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.orders WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admin can upload attachments"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (has_role(auth.uid(), 'admin'::app_role) OR auth.uid()::text = 'luisdagrota20@gmail.com')
  );

CREATE POLICY "Customers can upload attachments to their orders"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.orders WHERE user_id = auth.uid()
    )
  );

-- Habilitar realtime para mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_chat_status;

-- Função para criar chat automaticamente quando pedido é criado
CREATE OR REPLACE FUNCTION public.create_order_chat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.order_chat_status (order_id)
  VALUES (NEW.id)
  ON CONFLICT (order_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger para criar chat ao criar pedido
DROP TRIGGER IF EXISTS create_order_chat_trigger ON public.orders;
CREATE TRIGGER create_order_chat_trigger
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_chat();

-- Função para atualizar contadores de mensagens não lidas
CREATE OR REPLACE FUNCTION public.update_chat_unread_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    UPDATE public.order_chat_status
    SET 
      unread_customer_count = unread_customer_count + 1,
      last_message_at = NEW.created_at
    WHERE order_id = NEW.order_id;
  ELSE
    UPDATE public.order_chat_status
    SET 
      unread_admin_count = unread_admin_count + 1,
      last_message_at = NEW.created_at
    WHERE order_id = NEW.order_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger para atualizar contadores
DROP TRIGGER IF EXISTS update_chat_unread_trigger ON public.chat_messages;
CREATE TRIGGER update_chat_unread_trigger
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_unread_count();