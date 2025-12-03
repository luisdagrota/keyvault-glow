-- Fix RLS policy for reviews to allow reviews from delivered orders
DROP POLICY IF EXISTS "Users can create reviews for their orders" ON public.product_reviews;

CREATE POLICY "Users can create reviews for their orders"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.id = product_reviews.order_id
      AND orders.user_id = auth.uid()
      AND orders.payment_status IN ('approved', 'delivered')
  )
);