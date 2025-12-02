import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Product } from "@/types/product";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, QrCode, Receipt, Loader2, Ticket, Check, X } from "lucide-react";
import { User } from "@supabase/supabase-js";

interface CheckoutModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CheckoutModal = ({ product, open, onOpenChange }: CheckoutModalProps) => {
  const navigate = useNavigate();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'ticket'>('pix');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Cupom de desconto
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_percentage: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Verificar se o usuário está logado e preencher dados
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        onOpenChange(false);
        toast.error('Você precisa fazer login para continuar');
        navigate('/auth');
        return;
      }

      setUser(session.user);
      setCustomerEmail(session.user.email || '');

      // Buscar nome do perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setCustomerName(profileData.full_name);
      }
    };

    if (open) {
      checkUser();
      // Reset coupon when modal opens
      setAppliedCoupon(null);
      setCouponCode('');
      setCouponError('');
    }
  }, [open, onOpenChange, navigate]);
  
  // Dados do cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpirationMonth, setCardExpirationMonth] = useState('');
  const [cardExpirationYear, setCardExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cpf, setCpf] = useState('');
  const [installments, setInstallments] = useState(1);

  // Resultado do pagamento
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  // Calcular preços
  const discountAmount = appliedCoupon 
    ? (product.price * appliedCoupon.discount_percentage) / 100 
    : 0;
  const finalPrice = product.price - discountAmount;

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('code, discount_percentage, valid_until, is_active, usage_limit, times_used')
        .eq('code', couponCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setCouponError('Cupom inválido ou não encontrado');
        setAppliedCoupon(null);
        return;
      }

      // Verificar validade
      if (data.valid_until && new Date(data.valid_until) < new Date()) {
        setCouponError('Este cupom expirou');
        setAppliedCoupon(null);
        return;
      }

      // Verificar limite de uso
      if (data.usage_limit && data.times_used >= data.usage_limit) {
        setCouponError('Este cupom atingiu o limite de uso');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: data.code,
        discount_percentage: data.discount_percentage
      });
      toast.success(`Cupom aplicado! ${data.discount_percentage}% de desconto`);
    } catch (error) {
      setCouponError('Erro ao verificar cupom');
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    toast.info('Cupom removido');
  };

  const handleCheckout = async () => {
    if (!customerEmail || !customerName) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (paymentMethod === 'credit_card' && (!cardNumber || !cardholderName || !securityCode || !cpf)) {
      toast.error('Preencha todos os dados do cartão');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          productId: product.id,
          productName: product.name,
          productPrice: finalPrice,
          customerEmail,
          customerName,
          paymentMethod,
          userId: user?.id,
          couponCode: appliedCoupon?.code || null,
          discountAmount: discountAmount,
          ...(paymentMethod === 'credit_card' && {
            cardData: {
              cardNumber,
              cardholderName,
              cardExpirationMonth,
              cardExpirationYear,
              securityCode,
              identificationType: 'CPF',
              identificationNumber: cpf,
              installments
            }
          })
        }
      });

      if (error) throw error;

      if (data.success) {
        // Atualizar uso do cupom
        if (appliedCoupon) {
          const { data: couponData } = await supabase
            .from('coupons')
            .select('times_used')
            .eq('code', appliedCoupon.code)
            .single();
          
          if (couponData) {
            await supabase
              .from('coupons')
              .update({ times_used: couponData.times_used + 1 })
              .eq('code', appliedCoupon.code);
          }
        }

        setPaymentId(data.paymentId);
        setCurrentOrderId(data.orderId);
        
        if (paymentMethod === 'pix') {
          setPixQrCode(data.pixQrCode);
          setPixQrCodeBase64(data.pixQrCodeBase64);
          toast.success('PIX gerado! Escaneie o QR Code para pagar');
          startPaymentPolling(data.orderId);
        } else if (paymentMethod === 'ticket') {
          setTicketUrl(data.ticketUrl);
          toast.success('Boleto gerado! Clique no link para visualizar');
          if (data.ticketUrl) {
            window.open(data.ticketUrl, '_blank');
          }
          startPaymentPolling(data.orderId);
        } else if (data.status === 'approved') {
          toast.success('Pagamento aprovado!');
          onOpenChange(false);
          navigate(`/pedido-concluido?id=${data.orderId}`);
        } else {
          toast.info(`Status do pagamento: ${data.status}`);
        }
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error('Erro ao processar pagamento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const startPaymentPolling = (orderId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-payment-status', {
          body: { orderId }
        });

        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }

        console.log('Status do pagamento:', data.status);

        if (data.status === 'approved') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          toast.success('🎉 Pagamento Aprovado!');
          
          if (typeof window !== 'undefined' && (window as any).Tawk_API) {
            (window as any).Tawk_API.maximize();
          }

          setTimeout(() => {
            onOpenChange(false);
            navigate(`/pedido-concluido?id=${orderId}`);
          }, 1500);
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 5000);
  };

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Checkout - {product.name}</DialogTitle>
          <div className="space-y-1">
            {appliedCoupon ? (
              <>
                <p className="text-lg text-muted-foreground line-through">R$ {product.price.toFixed(2)}</p>
                <p className="text-2xl font-bold text-success">R$ {finalPrice.toFixed(2)}</p>
                <p className="text-sm text-success">Desconto de {appliedCoupon.discount_percentage}% aplicado!</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-primary">R$ {product.price.toFixed(2)}</p>
            )}
          </div>
        </DialogHeader>

        {!pixQrCode && !ticketUrl && (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            {/* Cupom de desconto */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="font-medium">Cupom de Desconto</span>
              </div>
              
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-success" />
                    <span className="font-medium">{appliedCoupon.code}</span>
                    <span className="text-success">-{appliedCoupon.discount_percentage}%</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={removeCoupon}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite o código"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError('');
                    }}
                    className="flex-1 uppercase"
                  />
                  <Button 
                    variant="outline" 
                    onClick={applyCoupon}
                    disabled={couponLoading}
                  >
                    {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aplicar'}
                  </Button>
                </div>
              )}
              {couponError && (
                <p className="text-sm text-destructive mt-2">{couponError}</p>
              )}
            </div>

            <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="pix" className="gap-2">
                  <QrCode className="h-4 w-4" />
                  PIX
                </TabsTrigger>
                <TabsTrigger value="credit_card" className="gap-2">
                  <CreditCard className="h-4 w-4" />
                  Cartão
                </TabsTrigger>
                <TabsTrigger value="ticket" className="gap-2">
                  <Receipt className="h-4 w-4" />
                  Boleto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pix" className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-bold mb-2">Pagamento via PIX</h3>
                  <p className="text-sm text-muted-foreground">
                    Você receberá um QR Code para pagar instantaneamente.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="credit_card" className="space-y-4">
                <div>
                  <Label>Número do Cartão *</Label>
                  <Input
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="0000 0000 0000 0000"
                    maxLength={19}
                  />
                </div>
                <div>
                  <Label>Nome no Cartão *</Label>
                  <Input
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="NOME IMPRESSO NO CARTÃO"
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Mês *</Label>
                    <Input
                      value={cardExpirationMonth}
                      onChange={(e) => setCardExpirationMonth(e.target.value)}
                      placeholder="MM"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label>Ano *</Label>
                    <Input
                      value={cardExpirationYear}
                      onChange={(e) => setCardExpirationYear(e.target.value)}
                      placeholder="AA"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label>CVV *</Label>
                    <Input
                      value={securityCode}
                      onChange={(e) => setSecurityCode(e.target.value)}
                      placeholder="123"
                      maxLength={4}
                      type="password"
                    />
                  </div>
                </div>
                <div>
                  <Label>CPF *</Label>
                  <Input
                    value={cpf}
                    onChange={(e) => setCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
                <div>
                  <Label>Parcelas</Label>
                  <select
                    className="w-full p-2 rounded-md border border-border bg-background"
                    value={installments}
                    onChange={(e) => setInstallments(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(i => (
                      <option key={i} value={i}>
                        {i}x de R$ {(finalPrice / i).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </TabsContent>

              <TabsContent value="ticket" className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-bold mb-2">Pagamento via Boleto</h3>
                  <p className="text-sm text-muted-foreground">
                    Você receberá um link para baixar o boleto. O pagamento pode levar até 3 dias úteis para ser confirmado.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Button
              size="xl"
              variant="cta"
              className="w-full"
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>Finalizar Compra - R$ {finalPrice.toFixed(2)}</>
              )}
            </Button>
          </div>
        )}

        {pixQrCode && (
          <div className="space-y-4 text-center">
            <h3 className="text-xl font-bold">Pague com PIX</h3>
            {pixQrCodeBase64 && (
              <img
                src={`data:image/png;base64,${pixQrCodeBase64}`}
                alt="QR Code PIX"
                className="mx-auto max-w-sm"
              />
            )}
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-mono break-all">{pixQrCode}</p>
            </div>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(pixQrCode);
                toast.success('Código PIX copiado!');
              }}
            >
              Copiar Código PIX
            </Button>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="h-5 w-5 animate-spin text-yellow-600 dark:text-yellow-400" />
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  Aguardando Pagamento
                </p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Seu pagamento está sendo processado. Assim que for aprovado, você será redirecionado automaticamente.
              </p>
            </div>

            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-lg font-bold text-primary mb-2">
                💬 Após aprovação, clique no chat para receber sua Key/Conta imediatamente!
              </p>
              <p className="text-sm text-muted-foreground">
                Nosso suporte responde em segundos para entregar sua compra.
              </p>
            </div>
          </div>
        )}

        {ticketUrl && (
          <div className="space-y-4 text-center">
            <h3 className="text-xl font-bold">Boleto Gerado!</h3>
            <Button
              size="lg"
              onClick={() => window.open(ticketUrl, '_blank')}
            >
              Visualizar Boleto
            </Button>
            
            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Loader2 className="h-5 w-5 animate-spin text-yellow-600 dark:text-yellow-400" />
                <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  Aguardando Confirmação
                </p>
              </div>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                O pagamento do boleto pode levar até 3 dias úteis para ser confirmado. Assim que for aprovado, você receberá uma confirmação por e-mail e será redirecionado automaticamente.
              </p>
            </div>

            <div className="mt-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-lg font-bold text-primary mb-2">
                💬 Após aprovação, clique no chat para receber sua Key/Conta imediatamente!
              </p>
              <p className="text-sm text-muted-foreground">
                Nosso suporte responde em segundos para entregar sua compra.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};