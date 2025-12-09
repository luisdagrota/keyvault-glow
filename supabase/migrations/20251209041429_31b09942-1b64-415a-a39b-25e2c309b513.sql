
-- Update order notification function with better platform messages
CREATE OR REPLACE FUNCTION public.create_order_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify on new order creation (purchase)
  IF TG_OP = 'INSERT' AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, link)
    VALUES (
      NEW.user_id,
      'order_created',
      '🛒 Pedido realizado com sucesso!',
      'Obrigado pela compra! O vendedor já foi notificado e entrará em contato em breve.',
      '/profile'
    );
  END IF;

  -- Notify on status changes
  IF TG_OP = 'UPDATE' AND OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    IF NEW.payment_status = 'approved' AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'order_approved',
        '✅ Pagamento aprovado!',
        'Seu pagamento foi confirmado! O vendedor foi notificado e enviará seu produto em breve.',
        '/profile'
      );
    ELSIF NEW.payment_status = 'delivered' AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'order_delivered',
        '🎉 Produto entregue!',
        'Seu pedido de ' || NEW.product_name || ' foi entregue! Não esqueça de deixar uma avaliação.',
        '/product/' || NEW.product_id || '?orderId=' || NEW.id
      );
    ELSIF NEW.payment_status = 'cancelled' AND NEW.user_id IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, type, title, message, link)
      VALUES (
        NEW.user_id,
        'order_cancelled',
        '❌ Pedido cancelado',
        'Seu pedido de ' || NEW.product_name || ' foi cancelado.',
        '/profile'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update chat notification function with better messages
CREATE OR REPLACE FUNCTION public.create_chat_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  order_record RECORD;
  notification_user_id UUID;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Get order info
  SELECT * INTO order_record FROM orders WHERE id = NEW.order_id;
  
  IF NEW.sender_type = 'admin' THEN
    -- Notify customer about admin/seller message
    notification_user_id := order_record.user_id;
    notification_title := '💬 Nova mensagem!';
    notification_message := 'O vendedor enviou uma nova mensagem sobre seu pedido. Clique para visualizar.';
    
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
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update balance released notification for sellers
CREATE OR REPLACE FUNCTION public.create_balance_released_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.balance_released_at IS NULL AND NEW.balance_released_at IS NOT NULL THEN
    INSERT INTO public.seller_notifications (seller_id, type, title, message, product_id)
    VALUES (
      NEW.seller_id,
      'balance_released',
      '💰 Saldo liberado!',
      'R$ ' || ROUND(NEW.net_amount::numeric, 2)::text || ' foi liberado para saque! Referente à venda de ' || NEW.product_name || '. Acesse seu painel para solicitar o saque.',
      NEW.product_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Update seller sale notification with better message
CREATE OR REPLACE FUNCTION public.create_seller_sale_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.seller_notifications (seller_id, type, title, message, product_id)
    VALUES (
      NEW.seller_id,
      'sale',
      '🎊 Nova venda realizada!',
      'Parabéns! Você vendeu ' || NEW.product_name || ' por R$ ' || ROUND(NEW.sale_amount::numeric, 2)::text || '. O cliente aguarda a entrega do produto.',
      NEW.product_id
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for new orders if not exists
DROP TRIGGER IF EXISTS on_order_created ON public.orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_notification();

-- Update existing trigger for order updates
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.create_order_notification();

-- Create function for withdrawal status notifications
CREATE OR REPLACE FUNCTION public.create_withdrawal_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.seller_notifications (seller_id, type, title, message)
      VALUES (
        NEW.seller_id,
        'withdrawal_approved',
        '✅ Saque aprovado!',
        'Seu saque de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi aprovado! O valor será transferido para sua chave Pix em breve.'
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.seller_notifications (seller_id, type, title, message)
      VALUES (
        NEW.seller_id,
        'withdrawal_rejected',
        '❌ Saque recusado',
        'Seu pedido de saque de R$ ' || ROUND(NEW.amount::numeric, 2)::text || ' foi recusado. Entre em contato com o suporte para mais informações.'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for withdrawal status changes
DROP TRIGGER IF EXISTS on_withdrawal_status_change ON public.seller_withdrawals;
CREATE TRIGGER on_withdrawal_status_change
  AFTER UPDATE ON public.seller_withdrawals
  FOR EACH ROW
  EXECUTE FUNCTION public.create_withdrawal_notification();
