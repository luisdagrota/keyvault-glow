import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Package, MessageSquare, Loader2 } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Order {
  id: string;
  product_name: string;
  product_price: number;
  transaction_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  customer_name: string | null;
  chat_status?: {
    unread_customer_count: number;
  };
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Você precisa estar logado");
      navigate("/auth");
      return;
    }

    loadOrders();
  };

  const loadOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: ordersData, error } = await supabase
      .from('orders')
      .select(`
        *,
        chat_status:order_chat_status(unread_customer_count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Erro ao carregar pedidos", { description: error.message });
      setLoading(false);
      return;
    }

    setOrders(ordersData as any || []);
    setLoading(false);

    // Subscribe to updates
    const channel = supabase
      .channel('my-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadOrders();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_chat_status'
        },
        () => {
          loadOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      approved: { label: "Aprovado", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      delivered: { label: "Entregue", variant: "default" },
      refunded: { label: "Reembolsado", variant: "outline" }
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const totalUnread = orders.reduce((sum, order) => {
    return sum + (order.chat_status?.[0]?.unread_customer_count || 0);
  }, 0);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Meus Pedidos</h1>
            <p className="text-muted-foreground">Acompanhe seus pedidos e entre em contato com o suporte</p>
            
            {totalUnread > 0 && (
              <Card className="mt-4 border-primary/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <p className="font-medium">
                    Você tem {totalUnread} mensagem(ns) não lida(s) no chat
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          )}

          {!loading && orders.length === 0 && (
            <Card className="card-gaming">
              <CardContent className="text-center py-12">
                <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  Você ainda não realizou nenhum pedido
                </p>
                <Button onClick={() => navigate("/products")}>
                  Ver Produtos
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4">
            {orders.map((order) => {
              const unreadCount = order.chat_status?.[0]?.unread_customer_count || 0;
              const isDelivered = order.payment_status === 'delivered';
              
              return (
                <Card key={order.id} className="card-gaming">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 mb-2">
                          <Package className="h-5 w-5" />
                          {order.product_name}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <span>Pedido #{order.id.slice(0, 8)}</span>
                          <span>•</span>
                          <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold mb-2">
                          R$ {Number(order.transaction_amount).toFixed(2)}
                        </div>
                        {getStatusBadge(order.payment_status)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">Pagamento:</span>{" "}
                          <Badge variant="outline">{order.payment_method}</Badge>
                        </p>
                      </div>

                      {!isDelivered && (
                        <Button
                          onClick={() => setSelectedOrder(order)}
                          variant={unreadCount > 0 ? "default" : "outline"}
                          className="gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Chat com Suporte
                          {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-1">
                              {unreadCount}
                            </Badge>
                          )}
                        </Button>
                      )}

                      {isDelivered && (
                        <div className="flex items-center gap-2 text-success">
                          <Package className="h-5 w-5" />
                          <span className="font-medium">✅ Pedido Entregue</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Chat do Pedido</DialogTitle>
            <DialogDescription>
              Converse com nossa equipe sobre seu pedido
            </DialogDescription>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="p-6 pt-0">
              <ChatWindow
                orderId={selectedOrder.id}
                orderNumber={selectedOrder.id.slice(0, 8)}
                isAdmin={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
