import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Wallet, 
  ArrowLeft,
  Store,
  Menu,
  Bell,
  AlertTriangle
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface SellerSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  sellerId: string;
}

export const SellerSidebar = ({ activeTab, setActiveTab, sellerId }: SellerSidebarProps) => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    fetchUnreadCount();

    const channel = supabase
      .channel('seller-sidebar-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_notifications' }, () => {
        fetchUnreadCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from("seller_notifications")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", sellerId)
      .eq("is_read", false);

    setUnreadNotifications(count || 0);
  };

  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Meus Produtos", icon: Package },
    { id: "sales", label: "Minhas Vendas", icon: ShoppingCart },
    { id: "balance", label: "Saldo", icon: Wallet },
    { id: "warnings", label: "Advertências", icon: AlertTriangle },
    { id: "notifications", label: "Notificações", icon: Bell, badge: unreadNotifications },
  ];

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        <Store className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        <span className="font-bold text-lg sm:text-xl">Painel Vendedor</span>
      </div>

      <nav className="flex-1 space-y-1 sm:space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className="w-full justify-start h-11 sm:h-10"
            onClick={() => handleTabChange(item.id)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
            {item.badge && item.badge > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {item.badge > 9 ? "9+" : item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </nav>

      <Button
        variant="outline"
        className="w-full justify-start mt-auto h-11 sm:h-10"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Loja
      </Button>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 border-b bg-background/95 backdrop-blur px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-primary" />
          <span className="font-bold">Painel Vendedor</span>
        </div>
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-4 flex flex-col">
            <SheetHeader className="mb-4">
              <SheetTitle className="sr-only">Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 border-r bg-card min-h-screen p-4 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
};
