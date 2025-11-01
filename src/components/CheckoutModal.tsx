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
import { CreditCard, QrCode, Receipt, Loader2 } from "lucide-react";

interface CheckoutModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CheckoutModal = ({ product, open, onOpenChange }: CheckoutModalProps) => {
  const navigate = useNavigate();
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card' | 'ticket'>('pix');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');
  
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
          productPrice: product.price,
          customerEmail,
          customerName,
          paymentMethod,
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
        setPaymentId(data.paymentId);
        setCurrentOrderId(data.orderId);
        
        if (paymentMethod === 'pix') {
          setPixQrCode(data.pixQrCode);
          setPixQrCodeBase64(data.pixQrCodeBase64);
          toast.success('PIX gerado! Escaneie o QR Code para pagar');
          // Iniciar polling para PIX
          startPaymentPolling(data.orderId);
        } else if (paymentMethod === 'ticket') {
          setTicketUrl(data.ticketUrl);
          toast.success('Boleto gerado! Clique no link para visualizar');
          if (data.ticketUrl) {
            window.open(data.ticketUrl, '_blank');
          }
          // Iniciar polling para Boleto
          startPaymentPolling(data.orderId);
        } else if (data.status === 'approved') {
          toast.success('Pagamento aprovado!');
          // Redirecionar para página de sucesso
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
    // Limpar qualquer polling anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Verificar status a cada 5 segundos
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
          // Pagamento aprovado - parar polling e redirecionar
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          toast.success('🎉 Pagamento Aprovado!');
          
          // Abrir chat Tawk.to
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
    }, 5000); // Verificar a cada 5 segundos
  };

  // Cleanup ao desmontar componente
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
          <p className="text-2xl font-bold text-primary mt-2">R$ {product.price.toFixed(2)}</p>
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
                        {i}x de R$ {(product.price / i).toFixed(2)}
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
                <>Finalizar Compra - R$ {product.price.toFixed(2)}</>
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
