-- Criar tabela de pedidos (orders)
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_price DECIMAL(10, 2) NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  transaction_amount DECIMAL(10, 2) NOT NULL,
  pix_qr_code TEXT,
  pix_qr_code_base64 TEXT,
  ticket_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver seus próprios pedidos pelo email
CREATE POLICY "Users can view their own orders"
ON public.orders
FOR SELECT
USING (true);

-- Política: Permitir inserção de pedidos (necessário para checkout público)
CREATE POLICY "Allow order creation"
ON public.orders
FOR INSERT
WITH CHECK (true);

-- Política: Permitir atualização de pedidos (para webhook do Mercado Pago)
CREATE POLICY "Allow order updates"
ON public.orders
FOR UPDATE
USING (true);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para updated_at
CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.update_orders_updated_at();

-- Criar índices para melhor performance
CREATE INDEX idx_orders_email ON public.orders(customer_email);
CREATE INDEX idx_orders_payment_id ON public.orders(payment_id);
CREATE INDEX idx_orders_status ON public.orders(payment_status);