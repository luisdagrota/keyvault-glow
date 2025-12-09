-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('technical', 'payment', 'seller', 'order')),
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'waiting_customer', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE
);

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
CREATE POLICY "Users can view their own tickets" 
ON public.support_tickets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets" 
ON public.support_tickets 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete tickets" 
ON public.support_tickets 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for ticket_messages
CREATE POLICY "Users can view messages of their tickets" 
ON public.ticket_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM support_tickets 
  WHERE support_tickets.id = ticket_messages.ticket_id 
  AND support_tickets.user_id = auth.uid()
));

CREATE POLICY "Users can send messages to their tickets" 
ON public.ticket_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM support_tickets 
    WHERE support_tickets.id = ticket_messages.ticket_id 
    AND support_tickets.user_id = auth.uid()
  ) AND sender_type = 'customer'
);

CREATE POLICY "Admins can view all messages" 
ON public.ticket_messages 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can send messages" 
ON public.ticket_messages 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND sender_type = 'admin');

-- Trigger to update ticket updated_at
CREATE OR REPLACE FUNCTION public.update_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.support_tickets
  SET updated_at = now()
  WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_ticket_message_update_timestamp
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_timestamp();

-- Trigger to update ticket status when admin responds
CREATE OR REPLACE FUNCTION public.update_ticket_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'admin' THEN
    UPDATE public.support_tickets
    SET status = 'answered'
    WHERE id = NEW.ticket_id AND status != 'closed';
  ELSIF NEW.sender_type = 'customer' THEN
    UPDATE public.support_tickets
    SET status = 'waiting_customer'
    WHERE id = NEW.ticket_id AND status = 'answered';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_ticket_message_status_update
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ticket_status_on_message();

-- Function to create notification on ticket response
CREATE OR REPLACE FUNCTION public.create_ticket_notification()
RETURNS TRIGGER AS $$
DECLARE
  ticket_record RECORD;
BEGIN
  SELECT * INTO ticket_record FROM support_tickets WHERE id = NEW.ticket_id;
  
  IF NEW.sender_type = 'admin' THEN
    -- Notify customer
    INSERT INTO public.user_notifications (user_id, type, title, message, link)
    VALUES (
      ticket_record.user_id,
      'ticket_response',
      '📩 Nova resposta no seu ticket',
      'O suporte respondeu ao seu ticket: ' || ticket_record.subject,
      '/profile?tab=tickets'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_ticket_message_notification
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.create_ticket_notification();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;