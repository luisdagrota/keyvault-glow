import { useEffect, useState, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle, Mail, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useSound } from "@/contexts/SoundContext";

const DISCORD_URL = "https://discord.gg/3B348wmnQ4";

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
  const { soundEnabled } = useSound();
  const hasPlayedSound = useRef(false);

  // Play success sound when order is loaded and approved
  useEffect(() => {
    if (order && order.payment_status === "approved" && !hasPlayedSound.current && soundEnabled) {
      hasPlayedSound.current = true;
      const audio = new Audio("/sounds/purchase-success.mp3");
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    }
  }, [order, soundEnabled]);

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
                  Entre no nosso Discord e informe o ID do seu pedido para
                  receber sua chave na hora!
                </p>
                <div className="bg-background/80 rounded-lg p-3 mb-6 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">ID do Pedido:</p>
                  <p className="font-mono font-bold text-lg">{order.id}</p>
                </div>
                
                <Button
                  asChild
                  size="lg"
                  className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold"
                >
                  <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer">
                    <svg
                      className="h-5 w-5 mr-2"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                    Entrar no Discord
                  </a>
                </Button>
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
