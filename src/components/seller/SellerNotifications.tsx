import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, Loader2, Package, DollarSign, Trash2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNotificationSound } from "@/hooks/useNotificationSound";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  product_id: string | null;
  is_read: boolean;
  created_at: string;
  seller_id: string;
}

interface SellerNotificationsProps {
  sellerId: string;
}

export const SellerNotifications = ({ sellerId }: SellerNotificationsProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { playSound } = useNotificationSound();

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription
    const channel = supabase
      .channel('seller-notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'seller_notifications' },
        (payload) => {
          const newNotification = payload.new as Notification;
          if (newNotification.seller_id === sellerId) {
            setNotifications(prev => [newNotification, ...prev]);
            playSound();
            toast.info(newNotification.title, {
              description: newNotification.message,
              duration: 4000
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'seller_notifications' },
        (payload) => {
          setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("seller_notifications")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error);
      return;
    }

    setNotifications(data || []);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("seller_notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("seller_notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (error) {
      console.error("Error marking all as read:", error);
      return;
    }

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from("seller_notifications")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao remover notificação");
      return;
    }

    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = async () => {
    const { error } = await supabase
      .from("seller_notifications")
      .delete()
      .eq("seller_id", sellerId);

    if (error) {
      toast.error("Erro ao limpar notificações");
      return;
    }

    setNotifications([]);
    toast.success("Notificações removidas");
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "product_approved":
        return <Check className="h-5 w-5 text-green-500" />;
      case "product_rejected":
        return <Package className="h-5 w-5 text-red-500" />;
      case "sale":
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case "balance_released":
        return <DollarSign className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

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
            Notificações
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Acompanhe suas vendas e atualizações
          </p>
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar lidas
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
              Você ainda não tem notificações
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`transition-colors group ${
                !notification.is_read
                  ? "border-primary/50 bg-primary/5"
                  : ""
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
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                          onClick={() => deleteNotification(notification.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.created_at), {
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
      )}
    </div>
  );
};