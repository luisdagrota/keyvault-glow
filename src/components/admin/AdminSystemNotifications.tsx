import { useEffect, useState } from "react";
import { Bell, MessageSquare, Package, CreditCard, AlertTriangle, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotificationSound } from "@/hooks/useNotificationSound";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SystemNotification {
  id: string;
  type: 'order' | 'payment' | 'chat' | 'report' | 'seller';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  orderId?: string;
  metadata?: any;
}

const DISMISSED_KEY = 'admin_dismissed_notifications';
const CLEAR_TIMESTAMP_KEY = 'admin_notifications_cleared_at';

export function AdminSystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSound } = useNotificationSound();

  const getDismissedIds = (): Set<string> => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  };

  const getClearedTimestamp = (): Date | null => {
    try {
      const stored = localStorage.getItem(CLEAR_TIMESTAMP_KEY);
      return stored ? new Date(stored) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    loadInitialNotifications();
    setupRealtimeSubscriptions();
  }, []);

  const loadInitialNotifications = async () => {
    try {
      const dismissedIds = getDismissedIds();
      const clearedAt = getClearedTimestamp();

      // Load recent orders
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Load pending reports
      const { data: pendingReports } = await supabase
        .from('seller_reports')
        .select('*, orders(product_name), seller_profiles(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      // Load unread chats
      const { data: unreadChats } = await supabase
        .from('order_chat_status')
        .select('*, orders(customer_name, customer_email, product_name)')
        .gt('unread_admin_count', 0)
        .eq('is_archived', false);

      const systemNotifications: SystemNotification[] = [];

      // Add order notifications
      recentOrders?.forEach(order => {
        if (order.payment_status === 'approved') {
          const id = `order-${order.id}`;
          const timestamp = new Date(order.created_at);
          
          // Skip if dismissed or created before clear timestamp
          if (dismissedIds.has(id)) return;
          if (clearedAt && timestamp < clearedAt) return;
          
          systemNotifications.push({
            id,
            type: 'order',
            title: 'Novo Pedido Aprovado',
            message: `${order.product_name} - R$ ${Number(order.transaction_amount).toFixed(2)}`,
            timestamp: order.created_at,
            read: false,
            orderId: order.id
          });
        }
      });

      // Add report notifications
      pendingReports?.forEach(report => {
        const id = `report-${report.id}`;
        const timestamp = new Date(report.created_at);
        
        if (dismissedIds.has(id)) return;
        if (clearedAt && timestamp < clearedAt) return;
        
        systemNotifications.push({
          id,
          type: 'report',
          title: 'Nova Denúncia',
          message: `Denúncia contra ${(report as any).seller_profiles?.full_name || 'vendedor'}`,
          timestamp: report.created_at,
          read: false,
          metadata: report
        });
      });

      // Add chat notifications
      unreadChats?.forEach(chat => {
        const id = `chat-${chat.order_id}`;
        const timestamp = new Date(chat.last_message_at || chat.created_at);
        
        if (dismissedIds.has(id)) return;
        if (clearedAt && timestamp < clearedAt) return;
        
        const order = (chat as any).orders;
        systemNotifications.push({
          id,
          type: 'chat',
          title: 'Mensagens Não Lidas',
          message: `${chat.unread_admin_count} mensagem(ns) de ${order?.customer_name || order?.customer_email || 'cliente'}`,
          timestamp: chat.last_message_at || chat.created_at,
          read: false,
          orderId: chat.order_id
        });
      });

      // Sort by timestamp
      systemNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setNotifications(systemNotifications.slice(0, 50));
      setLoading(false);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Listen for new orders
    const ordersChannel = supabase
      .channel('admin-system-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as any;
          const notification: SystemNotification = {
            id: `order-${order.id}`,
            type: 'order',
            title: 'Novo Pedido',
            message: `${order.product_name} - R$ ${Number(order.transaction_amount).toFixed(2)}`,
            timestamp: new Date().toISOString(),
            read: false,
            orderId: order.id
          };
          addNotification(notification);
          playSound();
          toast.success("Novo pedido!", { description: notification.message });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const order = payload.new as any;
          const oldOrder = payload.old as any;
          
          if (oldOrder.payment_status !== 'approved' && order.payment_status === 'approved') {
            const notification: SystemNotification = {
              id: `payment-${order.id}`,
              type: 'payment',
              title: 'Pagamento Aprovado',
              message: order.product_name,
              timestamp: new Date().toISOString(),
              read: false,
              orderId: order.id
            };
            addNotification(notification);
            playSound();
            toast.success("Pagamento aprovado!", { description: notification.message });
          }
        }
      )
      .subscribe();

    // Listen for new reports
    const reportsChannel = supabase
      .channel('admin-system-reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seller_reports' },
        async (payload) => {
          const report = payload.new as any;
          const notification: SystemNotification = {
            id: `report-${report.id}`,
            type: 'report',
            title: 'Nova Denúncia',
            message: `Motivo: ${report.reason.substring(0, 50)}...`,
            timestamp: new Date().toISOString(),
            read: false,
            metadata: report
          };
          addNotification(notification);
          playSound();
          toast.warning("Nova denúncia recebida!", { description: notification.message });
        }
      )
      .subscribe();

    // Listen for new chat messages
    const chatChannel = supabase
      .channel('admin-system-chat')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        async (payload) => {
          const message = payload.new as any;
          if (message.sender_type === 'customer') {
            const { data: order } = await supabase
              .from('orders')
              .select('customer_name, customer_email, product_name')
              .eq('id', message.order_id)
              .single();

            const notification: SystemNotification = {
              id: `chat-msg-${message.id}`,
              type: 'chat',
              title: 'Nova Mensagem',
              message: `De ${order?.customer_name || order?.customer_email || 'cliente'}`,
              timestamp: new Date().toISOString(),
              read: false,
              orderId: message.order_id
            };
            addNotification(notification);
            playSound();
            toast.info("Nova mensagem!", { description: notification.message });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(chatChannel);
    };
  };

  const addNotification = (notification: SystemNotification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    // Save to localStorage so it doesn't come back
    const dismissed = getDismissedIds();
    dismissed.add(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
    
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    // Save timestamp so notifications before this time won't appear
    localStorage.setItem(CLEAR_TIMESTAMP_KEY, new Date().toISOString());
    
    // Also add all current notification IDs to dismissed list
    const dismissed = getDismissedIds();
    notifications.forEach(n => dismissed.add(n.id));
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...dismissed]));
    
    setNotifications([]);
    toast.success("Notificações limpas");
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <Package className="h-5 w-5 text-primary" />;
      case 'payment':
        return <CreditCard className="h-5 w-5 text-green-500" />;
      case 'chat':
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      case 'report':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'seller':
        return <CheckCircle className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Notificações do Sistema
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Acompanhe pedidos, pagamentos, chats e denúncias em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              Marcar todas como lidas
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearAllNotifications} className="text-destructive hover:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma notificação no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`transition-colors group ${
                  !notification.read ? "border-primary/50 bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium flex items-center gap-2">
                            {notification.title}
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full" />
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.timestamp), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}