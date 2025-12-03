import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Wallet, 
  ArrowLeft,
  Store
} from "lucide-react";

interface SellerSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const SellerSidebar = ({ activeTab, setActiveTab }: SellerSidebarProps) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: "overview", label: "Dashboard", icon: LayoutDashboard },
    { id: "products", label: "Meus Produtos", icon: Package },
    { id: "sales", label: "Minhas Vendas", icon: ShoppingCart },
    { id: "balance", label: "Saldo", icon: Wallet },
  ];

  return (
    <aside className="w-64 border-r bg-card min-h-screen p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-8">
        <Store className="h-8 w-8 text-primary" />
        <span className="font-bold text-xl">Painel Vendedor</span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? "default" : "ghost"}
            className="w-full justify-start"
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        ))}
      </nav>

      <Button
        variant="outline"
        className="w-full justify-start mt-auto"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Voltar para Loja
      </Button>
    </aside>
  );
};
