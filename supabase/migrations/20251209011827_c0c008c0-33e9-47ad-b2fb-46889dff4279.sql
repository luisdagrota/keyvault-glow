-- Drop existing foreign key constraint if exists
ALTER TABLE public.product_reviews 
DROP CONSTRAINT IF EXISTS product_reviews_product_id_fkey;

-- Change product_id from UUID to TEXT to support both Supabase and Google Sheets products
ALTER TABLE public.product_reviews 
ALTER COLUMN product_id TYPE TEXT USING product_id::TEXT;