import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Loader2, Package, User as UserIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Profile {
  full_name: string;
}

interface Order {
  id: string;
  product_name: string;
  transaction_amount: number;
  payment_status: string;
  payment_method: string;
  created_at: string;
}

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
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
      .select("full_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfile(data);
  };

  const fetchOrders = async (userId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, product_name, transaction_amount, payment_status, payment_method, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
      return;
    }

    setOrders(data || []);
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
    };

    const config = statusConfig[status] || { label: status, variant: "outline" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

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
      <main className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserIcon className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{profile?.full_name}</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" onClick={handleLogout}>
                  Sair
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                <CardTitle>Meus Pedidos</CardTitle>
              </div>
              <CardDescription>
                Histórico completo de suas compras
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Você ainda não tem pedidos
                </p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
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
                        {getStatusBadge(order.payment_status)}
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
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default Profile;
