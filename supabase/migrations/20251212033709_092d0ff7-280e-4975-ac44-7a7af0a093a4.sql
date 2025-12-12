-- Remove the foreign key constraint from buyer_reviews to orders
-- because seller reviews buyers based on seller_sales, not orders
ALTER TABLE public.buyer_reviews DROP CONSTRAINT IF EXISTS buyer_reviews_order_id_fkey;