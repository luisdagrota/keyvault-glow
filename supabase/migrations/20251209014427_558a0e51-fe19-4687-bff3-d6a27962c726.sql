-- Change default value of is_active to false for new seller products
-- So they start as pending approval
ALTER TABLE public.seller_products ALTER COLUMN is_active SET DEFAULT false;