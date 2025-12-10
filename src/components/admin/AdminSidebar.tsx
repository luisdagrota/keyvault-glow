import { LayoutDashboard, Package, ShoppingCart, FileText, Home, MessageSquare, Ticket, Star, Users, PackageCheck, Flag, Bell, LifeBuoy, ShieldAlert, Image, RefreshCcw } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const [unreadChats, setUnreadChats] = useState(0);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [pendingSellers, setPendingSellers] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingSellerProducts, setPendingSellerProducts] = useState(0);
  const [pendingReports, setPendingReports] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [pendingFraudAlerts, setPendingFraudAlerts] = useState(0);
  const [pendingRefunds, setPendingRefunds] = useState(0);

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel('admin-sidebar-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_chat_status' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_reviews' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_profiles' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_withdrawals' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_products' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_reports' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fraud_alerts' },
        () => loadNotifications()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'refund_requests' },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadNotifications = async () => {
    // Load unread chat count
    const { data: chatData } = await supabase
      .from('order_chat_status')
      .select('unread_admin_count')
      .eq('is_archived', false);

    if (chatData) {
      const total = chatData.reduce((sum, item) => sum + (item.unread_admin_count || 0), 0);
      setUnreadChats(total);
    }

    // Load pending reviews count
    const { count: reviewCount } = await supabase
      .from('product_reviews')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false);

    setPendingReviews(reviewCount || 0);

    // Load pending sellers count
    const { count: sellerCount } = await supabase
      .from('seller_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', false);

    setPendingSellers(sellerCount || 0);

    // Load pending withdrawals count
    const { count: withdrawalCount } = await supabase
      .from('seller_withdrawals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setPendingWithdrawals(withdrawalCount || 0);

    // Load pending seller products count
    const { count: sellerProductsCount } = await supabase
      .from('seller_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', false);

    setPendingSellerProducts(sellerProductsCount || 0);

    // Load pending reports count
    const { count: reportsCount } = await supabase
      .from('seller_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setPendingReports(reportsCount || 0);

    // Load open tickets count
    const { count: ticketsCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'waiting_customer']);

    setOpenTickets(ticketsCount || 0);

    // Load pending fraud alerts count
    const { count: fraudCount } = await supabase
      .from('fraud_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false);

    setPendingFraudAlerts(fraudCount || 0);

    // Load pending refunds count
    const { count: refundsCount } = await supabase
      .from('refund_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    setPendingRefunds(refundsCount || 0);
  };

  const menuItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
    { title: "Notificações", url: "/admin/notifications", icon: Bell },
    { title: "Banners", url: "/admin/banners", icon: Image },
    { title: "Tickets", url: "/admin/tickets", icon: LifeBuoy, badge: openTickets },
    { title: "Produtos", url: "/admin/products", icon: Package },
    { title: "Produtos Vendedores", url: "/admin/seller-products", icon: PackageCheck, badge: pendingSellerProducts },
    { title: "Pedidos", url: "/admin/orders", icon: ShoppingCart },
    { title: "Reembolsos", url: "/admin/refunds", icon: RefreshCcw, badge: pendingRefunds },
    { title: "Cupons Admin", url: "/admin/coupons", icon: Ticket },
    { title: "Cupons Vendedores", url: "/admin/seller-coupons", icon: Ticket },
    { title: "Avaliações", url: "/admin/reviews", icon: Star, badge: pendingReviews },
    { title: "Vendedores", url: "/admin/sellers", icon: Users, badge: pendingSellers + pendingWithdrawals },
    { title: "Denúncias", url: "/admin/complaints", icon: Flag, badge: pendingReports },
    { title: "Antifraude", url: "/admin/fraud", icon: ShieldAlert, badge: pendingFraudAlerts },
    { title: "Chats", url: "/admin/chats", icon: MessageSquare, badge: unreadChats },
    { title: "Relatórios", url: "/admin/reports", icon: FileText },
  ];

  const isActive = (path: string, end?: boolean) => {
    if (end) {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Painel Administrativo</SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url, item.end)}>
                    <NavLink 
                      to={item.url} 
                      end={item.end}
                      className="flex items-center gap-2 hover:bg-accent/50 transition-colors"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center p-0 text-xs">
                          {item.badge > 9 ? '9+' : item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2"
                    onClick={() => navigate("/")}
                  >
                    <Home className="h-4 w-4" />
                    <span>Voltar ao Site</span>
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
