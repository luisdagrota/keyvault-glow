import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import { 
  TrendingUp, Users, ShoppingBag, Store, Star, Package,
  Loader2, Award
} from "lucide-react";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

interface TopProduct {
  name: string;
  sales: number;
  image_url: string | null;
}

interface TopSeller {
  id: string;
  full_name: string;
  average_rating: number;
  total_sales: number;
  avatar_url: string | null;
}

const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#10b981", "#f59e0b", "#ef4444"];

const Statistics = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalUsers: 0,
    activeSellers: 0,
    totalRevenue: 0
  });
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSellers, setTopSellers] = useState<TopSeller[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<{ name: string; value: number }[]>([]);
  const [monthlySales, setMonthlySales] = useState<{ month: string; sales: number }[]>([]);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      // Fetch total sales count and revenue
      const { data: salesData } = await supabase
        .from('seller_sales')
        .select('sale_amount, product_name, created_at')
        .eq('status', 'approved');

      const totalSales = salesData?.length || 0;
      const totalRevenue = salesData?.reduce((sum, sale) => sum + Number(sale.sale_amount), 0) || 0;

      // Fetch active sellers count
      const { count: activeSellers } = await supabase
        .from('seller_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true)
        .eq('is_suspended', false);

      // Fetch total products
      const { count: totalProducts } = await supabase
        .from('seller_products')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch profiles count (approximate users)
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalSales,
        totalProducts: totalProducts || 0,
        totalUsers: totalUsers || 0,
        activeSellers: activeSellers || 0,
        totalRevenue
      });

      // Fetch top selling products
      const { data: productsData } = await supabase
        .from('seller_products')
        .select('name, image_url, id')
        .eq('is_active', true)
        .limit(10);

      if (productsData && salesData) {
        const productSales = productsData.map(product => {
          const sales = salesData.filter(s => s.product_name === product.name).length;
          return { name: product.name, sales, image_url: product.image_url };
        }).sort((a, b) => b.sales - a.sales).slice(0, 5);
        setTopProducts(productSales);
      }

      // Fetch top rated sellers
      const { data: sellersData } = await supabase
        .from('seller_profiles')
        .select('id, full_name, average_rating, total_sales, user_id')
        .eq('is_approved', true)
        .eq('is_suspended', false)
        .order('average_rating', { ascending: false })
        .order('total_sales', { ascending: false })
        .limit(5);

      if (sellersData) {
        const sellersWithAvatars = await Promise.all(
          sellersData.map(async (seller) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('avatar_url')
              .eq('id', seller.user_id)
              .maybeSingle();
            return {
              ...seller,
              avatar_url: profile?.avatar_url || null
            };
          })
        );
        setTopSellers(sellersWithAvatars);
      }

      // Calculate sales by category
      if (salesData) {
        const { data: allProducts } = await supabase
          .from('seller_products')
          .select('name, category');

        if (allProducts) {
          const categoryMap: Record<string, number> = {};
          salesData.forEach(sale => {
            const product = allProducts.find(p => p.name === sale.product_name);
            const category = product?.category || 'Outros';
            categoryMap[category] = (categoryMap[category] || 0) + 1;
          });
          setSalesByCategory(
            Object.entries(categoryMap)
              .map(([name, value]) => ({ name, value }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 6)
          );
        }
      }

      // Calculate monthly sales trend
      if (salesData) {
        const monthlyMap: Record<string, number> = {};
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        salesData.forEach(sale => {
          const date = new Date(sale.created_at);
          const monthKey = `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
          monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + 1;
        });

        const sortedMonths = Object.entries(monthlyMap)
          .slice(-6)
          .map(([month, sales]) => ({ month, sales }));
        setMonthlySales(sortedMonths);
      }

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: "Total de Vendas",
      value: stats.totalSales,
      icon: <ShoppingBag className="h-5 w-5" />,
      description: "Vendas concluídas"
    },
    {
      title: "Faturamento Total",
      value: `R$ ${stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: <TrendingUp className="h-5 w-5" />,
      description: "Volume total negociado"
    },
    {
      title: "Usuários Cadastrados",
      value: stats.totalUsers,
      icon: <Users className="h-5 w-5" />,
      description: "Usuários na plataforma"
    },
    {
      title: "Vendedores Ativos",
      value: stats.activeSellers,
      icon: <Store className="h-5 w-5" />,
      description: "Vendedores aprovados"
    },
    {
      title: "Produtos Disponíveis",
      value: stats.totalProducts,
      icon: <Package className="h-5 w-5" />,
      description: "Produtos ativos"
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="Estatísticas | GameKeys Store"
        description="Veja as estatísticas do marketplace GameKeys: vendas, produtos populares, melhores vendedores e muito mais."
      />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            📊 Estatísticas do Marketplace
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Acompanhe em tempo real os números da nossa plataforma
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {statCards.map((stat, index) => (
            <Card key={index} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-primary mb-2">
                  {stat.icon}
                  <span className="text-xs text-muted-foreground">{stat.title}</span>
                </div>
                <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Monthly Sales Chart */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Vendas por Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlySales.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados suficientes
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sales by Category */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Vendas por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {salesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {salesByCategory.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                  Sem dados suficientes
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Products and Sellers */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Products */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-primary" />
                Produtos Mais Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.map((product, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                        {index + 1}
                      </Badge>
                      <img 
                        src={product.image_url || '/placeholder.svg'} 
                        alt={product.name}
                        className="w-10 h-10 rounded object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.sales} vendas</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum produto vendido ainda
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Sellers */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Melhores Avaliações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topSellers.length > 0 ? (
                <div className="space-y-3">
                  {topSellers.map((seller, index) => (
                    <div key={seller.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <Badge 
                        variant="outline" 
                        className={`w-6 h-6 flex items-center justify-center p-0 ${
                          index === 0 ? 'border-yellow-500 text-yellow-500' :
                          index === 1 ? 'border-gray-400 text-gray-400' :
                          index === 2 ? 'border-amber-600 text-amber-600' : ''
                        }`}
                      >
                        {index + 1}
                      </Badge>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={seller.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {seller.full_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{seller.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            {seller.average_rating.toFixed(1)}
                          </span>
                          <span>•</span>
                          <span>{seller.total_sales} vendas</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum vendedor avaliado ainda
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Statistics;
