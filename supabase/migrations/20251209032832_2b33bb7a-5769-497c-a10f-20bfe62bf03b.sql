-- Add SEO fields to seller_products table
ALTER TABLE public.seller_products 
ADD COLUMN IF NOT EXISTS slug text,
ADD COLUMN IF NOT EXISTS meta_description text,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create unique index on slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_products_slug ON public.seller_products(slug) WHERE slug IS NOT NULL;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_seller_products_search ON public.seller_products USING GIN(search_vector);

-- Create index for tags
CREATE INDEX IF NOT EXISTS idx_seller_products_tags ON public.seller_products USING GIN(tags);

-- Function to generate slug from product name
CREATE OR REPLACE FUNCTION public.generate_slug(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  slug text;
BEGIN
  -- Convert to lowercase, replace accents, remove special chars
  slug := lower(name);
  -- Replace common Portuguese accents
  slug := translate(slug, 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn');
  -- Replace spaces and special chars with hyphens
  slug := regexp_replace(slug, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing hyphens
  slug := trim(both '-' from slug);
  
  RETURN slug;
END;
$$;

-- Function to auto-generate tags from product name and category
CREATE OR REPLACE FUNCTION public.generate_product_tags(name text, category text, description text)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text[];
  words text[];
  word text;
BEGIN
  result := '{}';
  
  -- Add category as tag
  IF category IS NOT NULL AND category != '' THEN
    result := array_append(result, lower(category));
  END IF;
  
  -- Split name into words and add significant ones
  words := regexp_split_to_array(lower(name), '\s+');
  FOREACH word IN ARRAY words
  LOOP
    -- Only add words with 3+ chars, exclude common words
    IF length(word) >= 3 AND word NOT IN ('the', 'and', 'for', 'com', 'para', 'com', 'sem', 'que', 'uma', 'por') THEN
      IF NOT word = ANY(result) THEN
        result := array_append(result, word);
      END IF;
    END IF;
  END LOOP;
  
  -- Add some gaming-related tags based on keywords
  IF name ~* 'steam|valve' THEN result := array_append(result, 'steam'); END IF;
  IF name ~* 'xbox|microsoft' THEN result := array_append(result, 'xbox'); END IF;
  IF name ~* 'playstation|ps4|ps5|sony' THEN result := array_append(result, 'playstation'); END IF;
  IF name ~* 'nintendo|switch' THEN result := array_append(result, 'nintendo'); END IF;
  IF name ~* 'key|chave|código|code' THEN result := array_append(result, 'key-digital'); END IF;
  IF name ~* 'conta|account' THEN result := array_append(result, 'conta'); END IF;
  IF name ~* 'gift|presente|card' THEN result := array_append(result, 'gift-card'); END IF;
  
  RETURN array(SELECT DISTINCT unnest(result));
END;
$$;

-- Function to generate meta description
CREATE OR REPLACE FUNCTION public.generate_meta_description(name text, description text, price numeric)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  result text;
BEGIN
  IF description IS NOT NULL AND length(description) > 0 THEN
    -- Take first 120 chars of description
    result := name || ' - ' || left(description, 120);
  ELSE
    result := name || ' - Compre agora por R$ ' || price::text || ' na GameKeys Store. Entrega imediata e 100% seguro.';
  END IF;
  
  -- Ensure max 160 chars
  IF length(result) > 155 THEN
    result := left(result, 152) || '...';
  END IF;
  
  RETURN result;
END;
$$;

-- Function to update search vector
CREATE OR REPLACE FUNCTION public.update_product_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate slug if not set
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.name) || '-' || substr(NEW.id::text, 1, 8);
  END IF;
  
  -- Generate meta description if not set
  IF NEW.meta_description IS NULL OR NEW.meta_description = '' THEN
    NEW.meta_description := generate_meta_description(NEW.name, NEW.description, NEW.price);
  END IF;
  
  -- Generate tags if empty
  IF NEW.tags IS NULL OR array_length(NEW.tags, 1) IS NULL THEN
    NEW.tags := generate_product_tags(NEW.name, NEW.category, NEW.description);
  END IF;
  
  -- Update search vector for full-text search
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.category, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-updating SEO fields
DROP TRIGGER IF EXISTS on_product_seo_update ON public.seller_products;
CREATE TRIGGER on_product_seo_update
  BEFORE INSERT OR UPDATE ON public.seller_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_search_vector();

-- Update existing products with SEO data
UPDATE public.seller_products SET updated_at = now() WHERE slug IS NULL;