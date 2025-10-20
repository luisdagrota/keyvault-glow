import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, MessageCircle, Mail, Package, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface OrderData {
  id: string;
  product_name: string;
  customer_email: string;
  payment_status: string;
  created_at: string;
}

export default function PedidoConcluido() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (error) throw error;
        setOrder(data);
      } catch (error) {
        console.error("Erro ao carregar pedido:", error);
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [orderId]);

  useEffect(() => {
    // Abrir chat Tawk.To automaticamente apenas nesta página
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && (window as any).Tawk_API) {
        (window as any).Tawk_API.maximize();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenChat = () => {
    if (typeof window !== "undefined" && (window as any).Tawk_API) {
      (window as any).Tawk_API.maximize();
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <Card className="max-w-2xl mx-auto p-8">
              <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
              <Skeleton className="h-6 w-1/2 mx-auto mb-8" />
              <Skeleton className="h-32 w-full mb-4" />
              <Skeleton className="h-32 w-full" />
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!orderId || !order) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-16">
            <Card className="max-w-2xl mx-auto p-8 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
              <p className="text-muted-foreground mb-6">
                Não foi possível localizar as informações deste pedido.
              </p>
              <Link to="/">
                <Button>Voltar para Home</Button>
              </Link>
            </Card>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <Card className="max-w-2xl mx-auto p-8">
            {/* Título de Impacto */}
            <div className="text-center mb-8">
              <CheckCircle className="h-20 w-20 mx-auto mb-4 text-green-500" />
              <h1 className="text-3xl font-bold mb-2">
                🎉 Pagamento Aprovado e Pedido Concluído!
              </h1>
              <p className="text-lg text-muted-foreground">
                Seu pedido foi processado com sucesso
              </p>
            </div>

            {/* Informações do Pedido */}
            <div className="bg-muted/50 rounded-lg p-6 mb-8">
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-sm font-medium text-muted-foreground">ID do Pedido:</span>
                  <span className="font-mono font-bold">{order.id}</span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-sm font-medium text-muted-foreground">Produto:</span>
                  <span className="font-semibold">{order.product_name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground">Status:</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm font-semibold">
                    Aprovado
                  </span>
                </div>
              </div>
            </div>

            {/* Entrega por E-mail */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <Mail className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold mb-2">Entrega Automática por E-mail</h3>
                  <p className="text-sm text-muted-foreground">
                    Sua Key/Credencial foi enviada automaticamente para{" "}
                    <span className="font-semibold text-foreground">{order.customer_email}</span>.
                    Confira sua caixa de entrada e a pasta de Spam.
                  </p>
                </div>
              </div>
            </div>

            {/* Entrega Imediata */}
            <div className="bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/30 rounded-lg p-6 mb-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-3">Receba Agora (Recomendado)</h3>
                <p className="text-sm mb-4">
                  Escolha uma das opções abaixo e informe o ID do seu pedido para
                  receber sua chave na hora!
                </p>
                <div className="bg-background/80 rounded-lg p-3 mb-6 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">ID do Pedido:</p>
                  <p className="font-mono font-bold text-lg">{order.id}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chat ao Vivo */}
                  <div className="flex flex-col items-center">
                    <MessageCircle className="h-10 w-10 mb-3 text-primary" />
                    <Button
                      onClick={handleOpenChat}
                      size="lg"
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                      <MessageCircle className="h-5 w-5 mr-2" />
                      Chat ao Vivo
                    </Button>
                  </div>

                  {/* Discord */}
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-10 w-10 mb-3 text-primary" />
                    <Button
                      asChild
                      size="lg"
                      className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold"
                    >
                      <a href="https://discord.gg/SMjamyEpaD" target="_blank" rel="noopener noreferrer">
                        <MessageSquare className="h-5 w-5 mr-2" />
                        Discord
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Botão Voltar */}
            <div className="text-center">
              <Link to="/">
                <Button variant="outline" size="lg">
                  Voltar para Home
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}
