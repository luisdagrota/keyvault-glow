-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL DEFAULT '📦',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id, slug)
);

-- Add subcategory reference to seller_products
ALTER TABLE public.seller_products 
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id);

-- Create indexes
CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_active ON public.categories(is_active, display_order);
CREATE INDEX idx_subcategories_category ON public.subcategories(category_id);
CREATE INDEX idx_subcategories_slug ON public.subcategories(slug);
CREATE INDEX idx_seller_products_subcategory ON public.seller_products(subcategory_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Anyone can view active categories" 
ON public.categories FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all categories" 
ON public.categories FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for subcategories
CREATE POLICY "Anyone can view active subcategories" 
ON public.subcategories FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all subcategories" 
ON public.subcategories FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert predefined categories
INSERT INTO public.categories (name, slug, icon, display_order) VALUES
('Jogos', 'jogos', '🎮', 1),
('Gift Cards', 'gift-cards', '💳', 2),
('Contas', 'contas', '🧩', 3),
('Serviços', 'servicos', '🛒', 4),
('Assinaturas', 'assinaturas', '⭐', 5),
('Outros', 'outros', '🧰', 6);

-- Insert subcategories for Jogos
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT id, 'Steam', 'steam', 1 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Epic Games', 'epic-games', 2 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Origin/EA', 'origin-ea', 3 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Ubisoft', 'ubisoft', 4 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Battle.net', 'battlenet', 5 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'PlayStation', 'playstation', 6 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Xbox', 'xbox', 7 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Nintendo', 'nintendo', 8 FROM public.categories WHERE slug = 'jogos'
UNION ALL
SELECT id, 'Outros Jogos', 'outros-jogos', 9 FROM public.categories WHERE slug = 'jogos';

-- Insert subcategories for Gift Cards
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT id, 'Steam', 'steam', 1 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'PlayStation', 'playstation', 2 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'Xbox', 'xbox', 3 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'Google Play', 'google-play', 4 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'Apple/iTunes', 'apple-itunes', 5 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'Amazon', 'amazon', 6 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'iFood', 'ifood', 7 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'Uber', 'uber', 8 FROM public.categories WHERE slug = 'gift-cards'
UNION ALL
SELECT id, 'Outros Gift Cards', 'outros-gift-cards', 9 FROM public.categories WHERE slug = 'gift-cards';

-- Insert subcategories for Contas
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT id, 'Streaming', 'streaming', 1 FROM public.categories WHERE slug = 'contas'
UNION ALL
SELECT id, 'Jogos', 'jogos', 2 FROM public.categories WHERE slug = 'contas'
UNION ALL
SELECT id, 'Redes Sociais', 'redes-sociais', 3 FROM public.categories WHERE slug = 'contas'
UNION ALL
SELECT id, 'Música', 'musica', 4 FROM public.categories WHERE slug = 'contas'
UNION ALL
SELECT id, 'Outras Contas', 'outras-contas', 5 FROM public.categories WHERE slug = 'contas';

-- Insert subcategories for Serviços
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT id, 'Boost', 'boost', 1 FROM public.categories WHERE slug = 'servicos'
UNION ALL
SELECT id, 'Elojob', 'elojob', 2 FROM public.categories WHERE slug = 'servicos'
UNION ALL
SELECT id, 'Coach', 'coach', 3 FROM public.categories WHERE slug = 'servicos'
UNION ALL
SELECT id, 'Design', 'design', 4 FROM public.categories WHERE slug = 'servicos'
UNION ALL
SELECT id, 'Outros Serviços', 'outros-servicos', 5 FROM public.categories WHERE slug = 'servicos';

-- Insert subcategories for Assinaturas
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT id, 'Game Pass', 'game-pass', 1 FROM public.categories WHERE slug = 'assinaturas'
UNION ALL
SELECT id, 'PlayStation Plus', 'playstation-plus', 2 FROM public.categories WHERE slug = 'assinaturas'
UNION ALL
SELECT id, 'EA Play', 'ea-play', 3 FROM public.categories WHERE slug = 'assinaturas'
UNION ALL
SELECT id, 'Netflix', 'netflix', 4 FROM public.categories WHERE slug = 'assinaturas'
UNION ALL
SELECT id, 'Spotify', 'spotify', 5 FROM public.categories WHERE slug = 'assinaturas'
UNION ALL
SELECT id, 'Outras Assinaturas', 'outras-assinaturas', 6 FROM public.categories WHERE slug = 'assinaturas';

-- Insert subcategories for Outros
INSERT INTO public.subcategories (category_id, name, slug, display_order)
SELECT id, 'Itens In-Game', 'itens-in-game', 1 FROM public.categories WHERE slug = 'outros'
UNION ALL
SELECT id, 'Moedas Virtuais', 'moedas-virtuais', 2 FROM public.categories WHERE slug = 'outros'
UNION ALL
SELECT id, 'Skins', 'skins', 3 FROM public.categories WHERE slug = 'outros'
UNION ALL
SELECT id, 'Diversos', 'diversos', 4 FROM public.categories WHERE slug = 'outros';