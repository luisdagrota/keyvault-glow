import { useEffect, useState } from "react";
import { useNavigate, Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminProducts } from "@/components/admin/AdminProducts";
import { AdminOrders } from "@/components/admin/AdminOrders";
import { AdminReports } from "@/components/admin/AdminReports";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { AdminChats } from "@/components/admin/AdminChats";
import { AdminCoupons } from "@/components/admin/AdminCoupons";
import { AdminReviews } from "@/components/admin/AdminReviews";
import { AdminSellers } from "@/components/admin/AdminSellers";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  stock: number;
  image_url: string | null;
}

interface Order {
  id: string;
  customer_name: string | null;
  customer_email: string;
  product_name: string;
  product_price: number;
  transaction_amount: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  user_id: string | null;
}

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  approvedOrders: number;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, totalRevenue: 0, pendingOrders: 0, approvedOrders: 0 });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      console.log('🔐 Admin: Verificando acesso...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('❌ Admin: Nenhuma sessão encontrada');
        toast.error("Acesso negado", { description: "Você precisa estar logado" });
        navigate("/auth");
        return;
      }

      console.log('✅ Admin: Sessão encontrada:', {
        email: session.user.email,
        id: session.user.id
      });

      const ADMIN_EMAIL = "luisdagrota20@gmail.com";

      // 1) Verificação prioritária por e-mail
      if (session.user.email === ADMIN_EMAIL) {
        console.log('✅ Admin: Email autorizado:', ADMIN_EMAIL);
        setIsAdmin(true);
        loadData();
        return;
      }

      // 2) Fallback: verificar role no banco
      console.log('🔍 Admin: Verificando role na tabela user_roles...');
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      console.log('📊 Admin: Resultado da query:', { roles, error });

      if (error || !roles) {
        console.log('❌ Admin: Acesso negado - sem role admin');
        toast.error("Acesso negado", { description: "Você não tem permissão para acessar esta página" });
        navigate("/");
        return;
      }

      console.log('✅ Admin: Role admin encontrada');
      setIsAdmin(true);
      loadData();
    } catch (error) {
      console.error("❌ Admin: Erro ao verificar acesso:", error);
      toast.error("Erro ao verificar permissões");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    await Promise.all([loadProducts(), loadOrders()]);
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar produtos", { description: error.message });
      return;
    }

    setProducts(data || []);
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar pedidos", { description: error.message });
      return;
    }

    setOrders(data || []);
    calculateStats(data || []);
  };

  const calculateStats = (ordersData: Order[]) => {
    const totalOrders = ordersData.length;
    const totalRevenue = ordersData
      .filter(o => o.payment_status === "approved")
      .reduce((sum, o) => sum + Number(o.transaction_amount), 0);
    const pendingOrders = ordersData.filter(o => o.payment_status === "pending").length;
    const approvedOrders = ordersData.filter(o => o.payment_status === "approved").length;

    setStats({ totalOrders, totalRevenue, pendingOrders, approvedOrders });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger />
              <div className="flex-1" />
              <AdminNotifications />
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <Routes>
              <Route index element={
                <AdminDashboard 
                  stats={stats} 
                  orders={orders} 
                  products={products} 
                />
              } />
              <Route path="products" element={
                <AdminProducts 
                  products={products} 
                  onProductsChange={loadProducts} 
                />
              } />
              <Route path="orders" element={
                <AdminOrders 
                  orders={orders} 
                  onOrdersChange={loadOrders} 
                />
              } />
              <Route path="coupons" element={<AdminCoupons />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="sellers" element={<AdminSellers />} />
              <Route path="chats" element={<AdminChats />} />
              <Route path="reports" element={
                <AdminReports 
                  orders={orders} 
                  products={products} 
                  stats={stats} 
                />
              } />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
