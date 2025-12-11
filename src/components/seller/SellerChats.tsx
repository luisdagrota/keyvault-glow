import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageSquare, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { toast } from "sonner";

interface OrderChat {
  id: string;
  product_name: string;
  customer_name: string | null;
  customer_email: string;
  payment_status: string;
  created_at: string;
  unread_seller_count: number;
}

interface SellerChatsProps {
  sellerId: string;
}

export const SellerChats = ({ sellerId }: SellerChatsProps) => {
  const [chats, setChats] = useState<OrderChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderChat | null>(null);

  const fetchChats = async () => {
    // Get orders for this seller with chat status
    const { data: orders, error } = await supabase
      .from("orders")
      .select(`
        id,
        product_name,
        customer_name,
        customer_email,
        payment_status,
        created_at
      `)
      .eq("seller_id", sellerId)
      .in("payment_status", ["approved", "delivered", "refund_requested"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching chats:", error);
      setLoading(false);
      return;
    }

    // Get chat status for unread counts
    const orderIds = (orders || []).map(o => o.id);
    if (orderIds.length > 0) {
      const { data: chatStatuses } = await supabase
        .from("order_chat_status")
        .select("order_id, unread_seller_count")
        .in("order_id", orderIds);

      const statusMap = new Map((chatStatuses || []).map(s => [s.order_id, s.unread_seller_count || 0]));

      setChats((orders || []).map(order => ({
        ...order,
        unread_seller_count: statusMap.get(order.id) || 0
      })));
    } else {
      setChats([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchChats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel("seller-chats")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_chat_status"
        },
        () => fetchChats()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `seller_id=eq.${sellerId}`
        },
        () => fetchChats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);

  const handleMarkAsDelivered = async () => {
    if (!selectedOrderId) return;

    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "delivered" })
      .eq("id", selectedOrderId);

    if (error) {
      toast.error("Erro ao marcar como entregue", { description: error.message });
      return;
    }

    toast.success("Pedido marcado como entregue!");
    fetchChats();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="default">Aguardando Entrega</Badge>;
      case "delivered":
        return <Badge className="bg-green-500">Entregue</Badge>;
      case "refund_requested":
        return <Badge variant="destructive">Reembolso Solicitado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (selectedOrderId && selectedOrder) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedOrderId(null);
            setSelectedOrder(null);
          }}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Chats
        </Button>
        
        <ChatWindow
          orderId={selectedOrderId}
          orderNumber={selectedOrderId.slice(0, 8)}
          customerName={selectedOrder.customer_name || selectedOrder.customer_email}
          isAdmin={false}
          isSeller={true}
          onMarkAsDelivered={selectedOrder.payment_status === "approved" ? handleMarkAsDelivered : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Chats com Clientes</h2>
        <p className="text-sm text-muted-foreground">
          Converse com seus clientes sobre os pedidos
        </p>
      </div>

      {chats.length === 0 ? (
        <Card>
          <CardContent className="py-8 sm:py-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Nenhum chat disponível. Os chats aparecerão quando você tiver pedidos aprovados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {chats.map((chat) => (
            <Card
              key={chat.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => {
                setSelectedOrderId(chat.id);
                setSelectedOrder(chat);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm sm:text-base truncate">
                        {chat.product_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {chat.customer_name || chat.customer_email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(chat.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {chat.unread_seller_count > 0 && (
                      <Badge variant="destructive" className="rounded-full">
                        {chat.unread_seller_count}
                      </Badge>
                    )}
                    {getStatusBadge(chat.payment_status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
