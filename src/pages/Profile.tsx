import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, Package, User as UserIcon, MessageSquare, CheckCircle2, Star, Camera, Save, Flag, Ticket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ReportSellerButton } from "@/components/ReportSellerButton";
import { CustomerTickets } from "@/components/CustomerTickets";
import { BuyerReputation } from "@/components/BuyerReputation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  buyer_rating: number | null;
  total_purchases: number | null;
  total_ratings_received: number | null;
}

interface Order {
  id: string;
  product_id: string;
  product_name: string;
  transaction_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
  updated_at?: string;
  customer_name: string | null;
  seller_id?: string | null;
  seller_name?: string | null;
  chat_status?: {
    unread_customer_count: number;
    is_archived: boolean;
  };
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchProfile(session.user.id);
      await fetchOrders(session.user.id);
      setLoading(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, buyer_rating, total_purchases, total_ratings_received")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfile(data);
    setAvatarUrl(data.avatar_url || "");
  };

  const handleSaveAvatar = async () => {
    if (!user) return;
    
    setSavingAvatar(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl.trim() || null })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, avatar_url: avatarUrl.trim() || null } : null);
      setEditingAvatar(false);
      toast({
        title: "Foto atualizada!",
        description: "Sua foto de perfil foi salva com sucesso.",
      });
    } catch (error) {
      console.error("Error saving avatar:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar a foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setSavingAvatar(false);
    }
  };

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        chat_status:order_chat_status(unread_customer_count, is_archived)
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }

    setOrders(data as any || []);

    // Subscribe to updates
    const channel = supabase
      .channel('profile-orders')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchOrders(userId);
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
          fetchOrders(userId);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      approved: { label: "Aprovado", variant: "default" },
      pending: { label: "Pendente", variant: "secondary" },
      rejected: { label: "Rejeitado", variant: "destructive" },
      delivered: { label: "Entregue", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      refunded: { label: "Reembolsado", variant: "outline" }
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Active orders with open chats (not delivered)
  const activeOrders = orders.filter(order => 
    order.payment_status === 'approved' &&
    !order.chat_status?.[0]?.is_archived
  );

  // Recently delivered orders (show success message)
  const deliveredOrders = orders.filter(order => 
    order.payment_status === 'delivered'
  );

  const totalUnread = activeOrders.reduce((sum, order) => {
    return sum + (order.chat_status?.[0]?.unread_customer_count || 0);
  }, 0);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background py-6 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-8">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="relative group">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-border">
                      <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name} />
                      <AvatarFallback className="text-lg sm:text-xl bg-primary/10 text-primary">
                        {profile?.full_name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || <UserIcon className="h-6 w-6 sm:h-8 sm:w-8" />}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={() => setEditingAvatar(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </button>
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-lg sm:text-2xl truncate">{profile?.full_name}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm truncate">{user?.email}</CardDescription>
                    {profile && (
                      <BuyerReputation
                        rating={profile.buyer_rating ?? 5}
                        totalPurchases={profile.total_purchases ?? 0}
                        totalRatings={profile.total_ratings_received ?? 0}
                        size="sm"
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
                <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
                  Sair
                </Button>
              </div>

              {editingAvatar && (
                <div className="mt-4 p-3 sm:p-4 rounded-lg bg-muted/50 border space-y-3">
                  <p className="text-sm font-medium">Foto de Perfil</p>
                  <p className="text-xs text-muted-foreground">
                    Cole o link de uma imagem (URL) para usar como foto de perfil
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="https://exemplo.com/minha-foto.jpg"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAvatar} disabled={savingAvatar} size="sm" className="flex-1 sm:flex-none">
                        {savingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                        Salvar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 sm:flex-none" onClick={() => {
                        setEditingAvatar(false);
                        setAvatarUrl(profile?.avatar_url || "");
                      }}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                  {avatarUrl && (
                    <div className="flex items-center gap-3 pt-2">
                      <p className="text-xs text-muted-foreground">Pré-visualização:</p>
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage src={avatarUrl} alt="Preview" />
                        <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                    </div>
                  )}
                </div>
              )}
            </CardHeader>
          </Card>

          {totalUnread > 0 && (
            <Card className="border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Você tem {totalUnread} mensagem(ns) não lida(s)</p>
                  <p className="text-sm text-muted-foreground">Clique em "Abrir Chat" para responder</p>
                </div>
              </CardContent>
            </Card>
          )}

          {activeOrders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  <CardTitle>Chats Ativos</CardTitle>
                </div>
                <CardDescription>
                  Converse com nossa equipe sobre seus pedidos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeOrders.map((order) => {
                    const unreadCount = order.chat_status?.[0]?.unread_customer_count || 0;
                    
                    return (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold flex items-center gap-2">
                              <Package className="h-4 w-4" />
                              {order.product_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              Pedido #{order.id.slice(0, 8)}
                            </p>
                          </div>
                          {getStatusBadge(order.payment_status)}
                        </div>
                        
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("pt-BR")}
                          </p>
                          <div className="flex gap-2 w-full sm:w-auto">
                            {order.seller_id && order.payment_status === 'approved' && (
                              <ReportSellerButton
                                orderId={order.id}
                                sellerId={order.seller_id}
                                sellerName={order.seller_name || "Vendedor"}
                                productName={order.product_name}
                              />
                            )}
                            <Button
                              onClick={() => setSelectedOrder(order)}
                              variant={unreadCount > 0 ? "default" : "outline"}
                              size="sm"
                              className="gap-2 flex-1 sm:flex-none"
                            >
                              <MessageSquare className="h-4 w-4" />
                              Abrir Chat
                              {unreadCount > 0 && (
                                <Badge variant="destructive" className="ml-1">
                                  {unreadCount}
                                </Badge>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success message for recently delivered orders */}
          {deliveredOrders.length > 0 && (
            <Card className="border-success/50 bg-success/5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <CardTitle className="text-success">Pedidos Concluídos</CardTitle>
                </div>
                <CardDescription>
                  ✅ Seus pedidos foram entregues com sucesso!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deliveredOrders.slice(0, 3).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div>
                        <h4 className="font-semibold">{order.product_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          Entregue em {new Date(order.updated_at || order.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/product/${order.product_id}?orderId=${order.id}`}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Avaliar
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Histórico de Pedidos</CardTitle>
              </div>
              <CardDescription>
                Todos os seus pedidos anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Você ainda não tem pedidos
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => {
                    const isDelivered = order.payment_status === 'delivered';
                    
                    return (
                      <div
                        key={order.id}
                        className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{order.product_name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {getStatusBadge(order.payment_status)}
                            {isDelivered && (
                              <div className="flex items-center gap-1 text-sm text-success">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>Concluído</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-muted-foreground">
                            {order.payment_method === "pix" ? "PIX" : "Boleto"}
                          </p>
                          <p className="font-bold text-primary">
                            R$ {order.transaction_amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tickets de Suporte */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Ticket className="h-5 w-5" />
                <CardTitle>Suporte</CardTitle>
              </div>
              <CardDescription>
                Abra tickets para obter ajuda com seus pedidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomerTickets />
            </CardContent>
          </Card>
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
                customerName={selectedOrder.customer_name || user?.email || "Cliente"}
                isAdmin={false}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
