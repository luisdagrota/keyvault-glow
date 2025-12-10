import { useEffect, useState } from "react";
import { Bell, MessageSquare, Package, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface Notification {
  id: string;
  type: 'order' | 'payment' | 'chat';
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
}

export function AdminNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { playSound } = useNotificationSound();

  useEffect(() => {
    // Load initial unread chat count
    loadUnreadChats();

    // Listen for new orders
    const ordersChannel = supabase
      .channel('admin-orders-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as any;
          const notification: Notification = {
            id: `order-${newOrder.id}`,
            type: 'order',
            message: `Novo pedido: ${newOrder.product_name} - R$ ${Number(newOrder.transaction_amount).toFixed(2)}`,
            timestamp: new Date().toISOString(),
            read: false,
            orderId: newOrder.id
          };
          
          addNotification(notification);
          playSound();
          
          toast.success("Novo pedido!", {
            description: notification.message,
            duration: 5000
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Notify when status changes to approved
          if (oldOrder.payment_status !== 'approved' && updatedOrder.payment_status === 'approved') {
            const notification: Notification = {
              id: `payment-${updatedOrder.id}`,
              type: 'payment',
              message: `Pagamento aprovado: ${updatedOrder.product_name}`,
              timestamp: new Date().toISOString(),
              read: false,
              orderId: updatedOrder.id
            };
            
            addNotification(notification);
            playSound();
            
            toast.success("Pagamento aprovado!", {
              description: notification.message,
              duration: 5000
            });
          }
        }
      )
      .subscribe();

    // Listen for new chat messages
    const chatChannel = supabase
      .channel('admin-chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Only notify for customer messages
          if (newMessage.sender_type === 'customer') {
            // Get order info
            const { data: order } = await supabase
              .from('orders')
              .select('customer_name, customer_email, product_name')
              .eq('id', newMessage.order_id)
              .single();

            const customerName = order?.customer_name || order?.customer_email || 'Cliente';
            
            const notification: Notification = {
              id: `chat-${newMessage.id}`,
              type: 'chat',
              message: `Nova mensagem de ${customerName}`,
              timestamp: new Date().toISOString(),
              read: false,
              orderId: newMessage.order_id
            };
            
            addNotification(notification);
            playSound();
            
            toast.info("Nova mensagem!", {
              description: notification.message,
              duration: 4000
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(chatChannel);
    };
  }, []);

  const loadUnreadChats = async () => {
    const { data, error } = await supabase
      .from('order_chat_status')
      .select('unread_admin_count, order_id')
      .eq('is_archived', false)
      .gt('unread_admin_count', 0);

    if (!error && data) {
      const chatNotifications: Notification[] = data.map(chat => ({
        id: `pending-chat-${chat.order_id}`,
        type: 'chat',
        message: `${chat.unread_admin_count} mensagem(ns) não lida(s)`,
        timestamp: new Date().toISOString(),
        read: false,
        orderId: chat.order_id
      }));

      if (chatNotifications.length > 0) {
        setNotifications(prev => [...chatNotifications, ...prev]);
        setUnreadCount(prev => prev + chatNotifications.length);
      }
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]);
    setUnreadCount(prev => prev + 1);
  };

  const markAllAsRead = async () => {
    // Reset unread counts in database
    await supabase
      .from('order_chat_status')
      .update({ unread_admin_count: 0 })
      .gt('unread_admin_count', 0);
    
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-4 w-4 text-primary" />;
      case 'payment':
        return <CreditCard className="h-4 w-4 text-success" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 sm:w-96 p-0" align="end">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Notificações Admin</h4>
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                Limpar tudo
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-accent/10' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notification.read ? 'font-medium' : 'text-muted-foreground'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatTime(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
