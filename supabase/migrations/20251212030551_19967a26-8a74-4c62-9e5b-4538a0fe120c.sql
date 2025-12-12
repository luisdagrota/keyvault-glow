-- Drop the old constraint and add new one with seller type
ALTER TABLE public.chat_messages DROP CONSTRAINT chat_messages_sender_type_check;

ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_sender_type_check 
  CHECK (sender_type = ANY (ARRAY['customer'::text, 'admin'::text, 'seller'::text]));