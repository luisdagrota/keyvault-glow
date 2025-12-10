import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";
import { 
  CreditCard, QrCode, Receipt, Loader2, Ticket, Check, X, 
  Package, Minus, Plus, Trash2, ArrowLeft 
} from "lucide-react";
import { User } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";

type PaymentMethod = 'pix' | 'credit_card' | 'ticket';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Cupom
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discount_percentage: number;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
    coupon_type: 'global' | 'seller';
    coupon_id?: string;
    seller_id?: string;
    applicable_total?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Cartão
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpirationMonth, setCardExpirationMonth] = useState('');
  const [cardExpirationYear, setCardExpirationYear] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cpf, setCpf] = useState('');
  const [installments, setInstallments] = useState(1);

  // Pagamento
  const [pixQrCode, setPixQrCode] = useState('');
  const [pixQrCodeBase64, setPixQrCodeBase64] = useState('');
  const [ticketUrl, setTicketUrl] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState('');

  // Preços - calculate discount based on coupon type
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    
    if (appliedCoupon.coupon_type === 'seller') {
      // For seller coupons, only apply to applicable items
      const applicableTotal = appliedCoupon.applicable_total || 0;
      if (appliedCoupon.discount_type === 'percentage') {
        return (applicableTotal * appliedCoupon.discount_value) / 100;
      } else {
        return Math.min(appliedCoupon.discount_value, applicableTotal);
      }
    } else {
      // Global coupons apply to entire cart
      return (totalPrice * appliedCoupon.discount_percentage) / 100;
    }
  };
  
  const discountAmount = calculateDiscount();
  const finalPrice = totalPrice - discountAmount;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Você precisa fazer login para continuar');
        navigate('/auth');
        return;
      }

      setUser(session.user);
      setCustomerEmail(session.user.email || '');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', session.user.id)
        .single();

      if (profileData) {
        setCustomerName(profileData.full_name);
      }
    };

    if (items.length === 0) {
      navigate('/products');
      return;
    }

    checkUser();
  }, [navigate, items.length]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Digite um código de cupom');
      return;
    }

    setCouponLoading(true);
    setCouponError('');

    try {
      const code = couponCode.toUpperCase().trim();
      
      // First, try to find a seller coupon
      const { data: sellerCoupon } = await supabase
        .from('seller_coupons')
        .select(`
          id,
          code,
          discount_type,
          discount_value,
          expires_at,
          is_active,
          max_uses,
          times_used,
          seller_id
        `)
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (sellerCoupon) {
        // Validate seller coupon
        if (sellerCoupon.expires_at && new Date(sellerCoupon.expires_at) < new Date()) {
          setCouponError('Este cupom expirou');
          setAppliedCoupon(null);
          return;
        }

        if (sellerCoupon.max_uses && sellerCoupon.times_used >= sellerCoupon.max_uses) {
          setCouponError('Este cupom atingiu o limite de uso');
          setAppliedCoupon(null);
          return;
        }

        // Check if coupon has product restrictions
        const { data: couponProducts } = await supabase
          .from('seller_coupon_products')
          .select('product_id')
          .eq('coupon_id', sellerCoupon.id);

        // Find applicable items in cart
        let applicableItems = items.filter(item => 
          item.source === 'seller' && item.sellerId === sellerCoupon.seller_id
        );

        // If coupon has specific products, filter further
        if (couponProducts && couponProducts.length > 0) {
          const productIds = couponProducts.map(cp => cp.product_id);
          applicableItems = applicableItems.filter(item => productIds.includes(item.id));
        }

        if (applicableItems.length === 0) {
          setCouponError('Este cupom não é válido para os produtos do seu carrinho');
          setAppliedCoupon(null);
          return;
        }

        const applicableTotal = applicableItems.reduce(
          (sum, item) => sum + item.price * item.quantity, 
          0
        );

        const discountPercentage = sellerCoupon.discount_type === 'percentage' 
          ? sellerCoupon.discount_value 
          : (sellerCoupon.discount_value / applicableTotal) * 100;

        setAppliedCoupon({
          code: sellerCoupon.code,
          discount_percentage: discountPercentage,
          discount_type: sellerCoupon.discount_type as 'percentage' | 'fixed',
          discount_value: sellerCoupon.discount_value,
          coupon_type: 'seller',
          coupon_id: sellerCoupon.id,
          seller_id: sellerCoupon.seller_id,
          applicable_total: applicableTotal
        });

        const discountText = sellerCoupon.discount_type === 'percentage' 
          ? `${sellerCoupon.discount_value}%`
          : `R$ ${sellerCoupon.discount_value.toFixed(2)}`;
        toast.success(`Cupom de vendedor aplicado! ${discountText} de desconto`);
        return;
      }

      // If no seller coupon found, try global coupons
      const { data: globalCoupon, error } = await supabase
        .from('coupons')
        .select('code, discount_percentage, valid_until, is_active, usage_limit, times_used')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !globalCoupon) {
        setCouponError('Cupom inválido ou não encontrado');
        setAppliedCoupon(null);
        return;
      }

      if (globalCoupon.valid_until && new Date(globalCoupon.valid_until) < new Date()) {
        setCouponError('Este cupom expirou');
        setAppliedCoupon(null);
        return;
      }

      if (globalCoupon.usage_limit && globalCoupon.times_used >= globalCoupon.usage_limit) {
        setCouponError('Este cupom atingiu o limite de uso');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: globalCoupon.code,
        discount_percentage: globalCoupon.discount_percentage,
        discount_type: 'percentage',
        discount_value: globalCoupon.discount_percentage,
        coupon_type: 'global'
      });
      toast.success(`Cupom aplicado! ${globalCoupon.discount_percentage}% de desconto`);
    } catch (error) {
      console.error('Coupon error:', error);
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
      // Process each item in cart
      // For now, we'll process the first item and create separate orders for each
      // This is a simplified approach - in production, you'd want a multi-item order system
      
      const firstItem = items[0];
      
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          productId: firstItem.id,
          productName: items.length > 1 
            ? `${firstItem.name} + ${items.length - 1} outros`
            : firstItem.name,
          productPrice: finalPrice,
          customerEmail,
          customerName,
          paymentMethod,
          userId: user?.id,
          sellerId: firstItem.sellerId || null,
          sellerName: firstItem.sellerName || null,
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
        // Update coupon usage tracking
        if (appliedCoupon) {
          if (appliedCoupon.coupon_type === 'seller' && appliedCoupon.coupon_id) {
            // Update seller coupon usage
            const { data: sellerCouponData } = await supabase
              .from('seller_coupons')
              .select('times_used, total_discount_given')
              .eq('id', appliedCoupon.coupon_id)
              .single();
            
            if (sellerCouponData) {
              await supabase
                .from('seller_coupons')
                .update({ 
                  times_used: sellerCouponData.times_used + 1,
                  total_discount_given: sellerCouponData.total_discount_given + discountAmount
                })
                .eq('id', appliedCoupon.coupon_id);
              
              // Record usage in seller_coupon_usage
              await supabase
                .from('seller_coupon_usage')
                .insert({
                  coupon_id: appliedCoupon.coupon_id,
                  order_id: data.orderId,
                  user_id: user?.id,
                  discount_amount: discountAmount
                });
            }
          } else {
            // Update global coupon usage
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
        }

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
          clearCart();
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

        if (data.status === 'approved') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          toast.success('🎉 Pagamento Aprovado!');
          clearCart();

          setTimeout(() => {
            navigate(`/pedido-concluido?id=${orderId}`);
          }, 1500);
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 5000);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixQrCode);
    toast.success('Código PIX copiado!');
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead title="Checkout" description="Finalize sua compra na GameKeys Store" />
      <Header />
      
      <main className="flex-1 py-6 sm:py-12">
        <div className="container px-4 max-w-6xl">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold mb-6">
            <span className="gradient-text">Finalizar</span> Compra
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items - Left Side */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card-gaming p-4 sm:p-6">
                <h2 className="font-bold text-lg mb-4">Itens do Carrinho</h2>
                
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 sm:gap-4 p-3 rounded-lg bg-muted/50">
                      <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base line-clamp-1">{item.name}</h4>
                        {item.source === "seller" && item.sellerName && (
                          <p className="text-xs text-muted-foreground">por {item.sellerName}</p>
                        )}
                        <p className="text-primary font-bold text-sm sm:text-base mt-1">
                          R$ {item.price.toFixed(2)}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              R$ {(item.price * item.quantity).toFixed(2)}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Section - Only show if no PIX/Boleto generated */}
              {!pixQrCode && !ticketUrl && (
                <div className="card-gaming p-4 sm:p-6 space-y-6">
                  <h2 className="font-bold text-lg">Forma de Pagamento</h2>

                  <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="pix" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                        <QrCode className="h-4 w-4" />
                        <span className="hidden sm:inline">PIX</span>
                      </TabsTrigger>
                      <TabsTrigger value="credit_card" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                        <CreditCard className="h-4 w-4" />
                        <span className="hidden sm:inline">Cartão</span>
                      </TabsTrigger>
                      <TabsTrigger value="ticket" className="gap-1 sm:gap-2 text-xs sm:text-sm">
                        <Receipt className="h-4 w-4" />
                        <span className="hidden sm:inline">Boleto</span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Label>Número do Cartão *</Label>
                          <Input
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            placeholder="0000 0000 0000 0000"
                            maxLength={19}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>Nome no Cartão *</Label>
                          <Input
                            value={cardholderName}
                            onChange={(e) => setCardholderName(e.target.value)}
                            placeholder="NOME IMPRESSO NO CARTÃO"
                          />
                        </div>
                        <div>
                          <Label>Validade *</Label>
                          <div className="flex gap-2">
                            <Input
                              value={cardExpirationMonth}
                              onChange={(e) => setCardExpirationMonth(e.target.value)}
                              placeholder="MM"
                              maxLength={2}
                              className="w-16"
                            />
                            <span className="flex items-center">/</span>
                            <Input
                              value={cardExpirationYear}
                              onChange={(e) => setCardExpirationYear(e.target.value)}
                              placeholder="AA"
                              maxLength={2}
                              className="w-16"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>CVV *</Label>
                          <Input
                            value={securityCode}
                            onChange={(e) => setSecurityCode(e.target.value)}
                            placeholder="123"
                            maxLength={4}
                            type="password"
                            className="w-24"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Label>CPF *</Label>
                          <Input
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            maxLength={14}
                          />
                        </div>
                        <div className="sm:col-span-2">
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
                      </div>
                    </TabsContent>

                    <TabsContent value="ticket" className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-bold mb-2">Pagamento via Boleto</h3>
                        <p className="text-sm text-muted-foreground">
                          O pagamento pode levar até 3 dias úteis para ser confirmado.
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {/* PIX Payment Display */}
              {pixQrCode && (
                <div className="card-gaming p-6 text-center space-y-4">
                  <h3 className="font-bold text-lg">Escaneie o QR Code</h3>
                  {pixQrCodeBase64 && (
                    <img
                      src={`data:image/png;base64,${pixQrCodeBase64}`}
                      alt="QR Code PIX"
                      className="mx-auto w-48 h-48 sm:w-64 sm:h-64 rounded-lg"
                    />
                  )}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ou copie o código PIX:</p>
                    <div className="flex gap-2 max-w-md mx-auto">
                      <Input value={pixQrCode} readOnly className="text-xs" />
                      <Button variant="outline" onClick={copyPixCode}>
                        Copiar
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Aguardando pagamento...</span>
                  </div>
                </div>
              )}

              {/* Boleto Display */}
              {ticketUrl && (
                <div className="card-gaming p-6 text-center space-y-4">
                  <h3 className="font-bold text-lg">Boleto Gerado</h3>
                  <p className="text-muted-foreground">
                    Seu boleto foi gerado. Clique no botão abaixo para visualizar.
                  </p>
                  <Button onClick={() => window.open(ticketUrl, '_blank')}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Ver Boleto
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Aguardando confirmação...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Summary - Right Side */}
            <div className="lg:col-span-1">
              <div className="card-gaming p-4 sm:p-6 sticky top-20 space-y-4">
                <h2 className="font-bold text-lg">Resumo do Pedido</h2>

                {/* Customer Info */}
                {!pixQrCode && !ticketUrl && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Seu nome"
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
                )}

                {/* Coupon */}
                {!pixQrCode && !ticketUrl && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Cupom de Desconto</span>
                    </div>
                    
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-2 bg-success/10 border border-success/30 rounded-lg">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Check className="h-4 w-4 text-success" />
                          <span className="text-sm font-medium">{appliedCoupon.code}</span>
                          <span className="text-sm text-success">
                            {appliedCoupon.discount_type === 'percentage' 
                              ? `-${appliedCoupon.discount_value}%`
                              : `-R$ ${appliedCoupon.discount_value.toFixed(2)}`
                            }
                          </span>
                          {appliedCoupon.coupon_type === 'seller' && (
                            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                              Cupom de vendedor
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-6 w-6 p-0">
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Código"
                          value={couponCode}
                          onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            setCouponError('');
                          }}
                          className="flex-1 uppercase text-sm h-9"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={applyCoupon}
                          disabled={couponLoading}
                          className="h-9"
                        >
                          {couponLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Aplicar'}
                        </Button>
                      </div>
                    )}
                    {couponError && (
                      <p className="text-xs text-destructive mt-1">{couponError}</p>
                    )}
                  </div>
                )}

                {/* Price Summary */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({items.length} itens)</span>
                    <span>R$ {totalPrice.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-success">
                      <span>
                        Desconto
                        {appliedCoupon.discount_type === 'percentage' 
                          ? ` (${appliedCoupon.discount_value}%)`
                          : ''
                        }
                        {appliedCoupon.coupon_type === 'seller' && appliedCoupon.applicable_total && appliedCoupon.applicable_total < totalPrice && (
                          <span className="text-xs text-muted-foreground ml-1">
                            (aplicado em R$ {appliedCoupon.applicable_total.toFixed(2)})
                          </span>
                        )}
                      </span>
                      <span>-R$ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-primary">R$ {finalPrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Checkout Button */}
                {!pixQrCode && !ticketUrl && (
                  <Button
                    size="lg"
                    className="w-full h-12"
                    onClick={handleCheckout}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processando...
                      </>
                    ) : (
                      <>Finalizar Compra</>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
