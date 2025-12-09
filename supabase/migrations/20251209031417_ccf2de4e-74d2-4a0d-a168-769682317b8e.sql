-- Function to create seller sale notification
CREATE OR REPLACE FUNCTION public.create_seller_sale_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    INSERT INTO public.seller_notifications (seller_id, type, title, message, product_id)
    VALUES (
      NEW.seller_id,
      'sale',
      '💰 Nova venda realizada!',
      'Você vendeu ' || NEW.product_name || ' por R$ ' || NEW.sale_amount::text,
      NEW.product_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for seller sale notifications
DROP TRIGGER IF EXISTS on_seller_sale_notification ON public.seller_sales;
CREATE TRIGGER on_seller_sale_notification
  AFTER INSERT ON public.seller_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.create_seller_sale_notification();

-- Function to create seller balance released notification
CREATE OR REPLACE FUNCTION public.create_balance_released_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.balance_released_at IS NULL AND NEW.balance_released_at IS NOT NULL THEN
    INSERT INTO public.seller_notifications (seller_id, type, title, message, product_id)
    VALUES (
      NEW.seller_id,
      'balance_released',
      '✅ Saldo liberado!',
      'R$ ' || NEW.net_amount::text || ' foi liberado para saque referente à venda de ' || NEW.product_name,
      NEW.product_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for balance released notifications
DROP TRIGGER IF EXISTS on_balance_released_notification ON public.seller_sales;
CREATE TRIGGER on_balance_released_notification
  AFTER UPDATE ON public.seller_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.create_balance_released_notification();

-- Allow sellers to delete their own notifications
CREATE POLICY "Sellers can delete their own notifications" 
ON public.seller_notifications 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM seller_profiles
  WHERE seller_profiles.id = seller_notifications.seller_id
  AND seller_profiles.user_id = auth.uid()
));

-- Allow users to delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.user_notifications 
FOR DELETE 
USING (auth.uid() = user_id);