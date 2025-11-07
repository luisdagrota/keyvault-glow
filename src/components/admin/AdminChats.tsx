import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Package, AlertCircle } from "lucide-react";
import { ChatWindow } from "@/components/chat/ChatWindow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatListItem {
  id: string;
  order_id: string;
  unread_admin_count: number;
  last_message_at: string | null;
  order: {
    id: string;
    customer_name: string | null;
    customer_email: string;
    product_name: string;
    payment_status: string;
  };
}

export function AdminChats() {
  const [chats, setChats] = useState<ChatListItem[]>([]);
  const [selectedChat, setSelectedChat] = useState<ChatListItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChats();

    // Subscribe to chat updates
    const channel = supabase
      .channel('admin-chats')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_chat_status'
        },
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadChats = async () => {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('order_chat_status')
      .select(`
        *,
        order:orders(
          id,
          customer_name,
          customer_email,
          product_name,
          payment_status
        )
      `)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      toast.error("Erro ao carregar chats", { description: error.message });
      setLoading(false);
      return;
    }

    setChats(data as any || []);
    setLoading(false);
  };

  const handleMarkAsDelivered = async () => {
    if (!selectedChat) return;

    const { error: orderError } = await supabase
      .from('orders')
      .update({ payment_status: 'delivered' })
      .eq('id', selectedChat.order_id);

    if (orderError) {
      toast.error("Erro ao atualizar pedido", { description: orderError.message });
      return;
    }

    const { error: chatError } = await supabase
      .from('order_chat_status')
      .update({ is_archived: true })
      .eq('order_id', selectedChat.order_id);

    if (chatError) {
      toast.error("Erro ao arquivar chat", { description: chatError.message });
      return;
    }

    toast.success("Pedido marcado como entregue!");
    setSelectedChat(null);
    loadChats();
  };

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unread_admin_count, 0);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      approved: { label: "Aprovado", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      delivered: { label: "Entregue", variant: "default" }
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Chats de Entrega</h2>
        <p className="text-muted-foreground">Gerencie as conversas com clientes sobre seus pedidos</p>
      </div>

      {totalUnread > 0 && (
        <Card className="card-gaming border-primary/50">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Você tem {totalUnread} mensagem(ns) não lida(s)</p>
              <p className="text-sm text-muted-foreground">Clique em um chat para responder</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-gaming">
        <CardHeader>
          <CardTitle>Lista de Chats Ativos</CardTitle>
          <CardDescription>Clique em um chat para abrir a conversa</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="text-center py-8 text-muted-foreground">
              Carregando chats...
            </div>
          )}

          {!loading && chats.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum chat ativo no momento</p>
            </div>
          )}

          <div className="space-y-2">
            {chats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                className="w-full text-left p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {chat.order.customer_name || chat.order.customer_email}
                      </span>
                      {chat.unread_admin_count > 0 && (
                        <Badge variant="destructive" className="ml-auto">
                          {chat.unread_admin_count} nova(s)
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {chat.order.product_name}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(chat.order.payment_status)}
                      {chat.last_message_at && (
                        <span className="text-xs text-muted-foreground">
                          Última mensagem: {new Date(chat.last_message_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle>Chat com Cliente</DialogTitle>
            <DialogDescription>
              Conversa sobre o pedido de {selectedChat?.order.customer_name || selectedChat?.order.customer_email}
            </DialogDescription>
          </DialogHeader>
          
          {selectedChat && (
            <div className="p-6 pt-0">
              <ChatWindow
                orderId={selectedChat.order_id}
                orderNumber={selectedChat.order_id.slice(0, 8)}
                customerName={selectedChat.order.customer_name || selectedChat.order.customer_email}
                isAdmin={true}
                onMarkAsDelivered={handleMarkAsDelivered}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
