import { LayoutDashboard, Package, ShoppingCart, FileText, Home, MessageSquare, Ticket, Star } from "lucide-react";
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
  };

  const menuItems = [
    { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
    { title: "Produtos", url: "/admin/products", icon: Package },
    { title: "Pedidos", url: "/admin/orders", icon: ShoppingCart },
    { title: "Cupons", url: "/admin/coupons", icon: Ticket },
    { title: "Avaliações", url: "/admin/reviews", icon: Star, badge: pendingReviews },
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
