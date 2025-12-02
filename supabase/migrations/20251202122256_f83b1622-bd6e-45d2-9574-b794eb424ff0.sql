-- Criar tabela de avaliações de produtos
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(order_id, product_id)
);

-- Índices para performance
CREATE INDEX idx_reviews_product ON public.product_reviews(product_id);
CREATE INDEX idx_reviews_approved ON public.product_reviews(is_approved);

-- RLS para avaliações
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler avaliações aprovadas
CREATE POLICY "Anyone can read approved reviews"
ON public.product_reviews
FOR SELECT
USING (is_approved = true);

-- Usuários podem criar avaliações dos seus próprios pedidos
CREATE POLICY "Users can create reviews for their orders"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_id 
    AND orders.user_id = auth.uid()
    AND orders.payment_status = 'approved'
  )
);

-- Usuários podem ver suas próprias avaliações (aprovadas ou não)
CREATE POLICY "Users can view their own reviews"
ON public.product_reviews
FOR SELECT
USING (user_id = auth.uid());

-- Admins podem gerenciar todas as avaliações
CREATE POLICY "Admins can manage all reviews"
ON public.product_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_reviews_timestamp
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_reviews_updated_at();

-- Habilitar realtime para avaliações
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews;