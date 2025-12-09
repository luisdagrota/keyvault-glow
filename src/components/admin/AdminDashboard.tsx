import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Package, TrendingUp, AlertCircle, Flag, AlertTriangle, Users } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface DashboardProps {
  stats: {
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    approvedOrders: number;
  };
  orders: any[];
  products: any[];
}

interface ReportStats {
  total: number;
  pending: number;
  confirmed: number;
  dismissed: number;
}

interface WarningStats {
  total: number;
  sellersWithWarnings: number;
  suspendedSellers: number;
  topWarnedSellers: { name: string; count: number }[];
}

const COLORS = ['hsl(270 80% 60%)', 'hsl(142 76% 45%)', 'hsl(200 90% 55%)', 'hsl(38 92% 50%)', 'hsl(0 72% 51%)'];

export function AdminDashboard({ stats, orders, products }: DashboardProps) {
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [reportStats, setReportStats] = useState<ReportStats>({ total: 0, pending: 0, confirmed: 0, dismissed: 0 });
  const [warningStats, setWarningStats] = useState<WarningStats>({ total: 0, sellersWithWarnings: 0, suspendedSellers: 0, topWarnedSellers: [] });
  const [reportsOverTime, setReportsOverTime] = useState<any[]>([]);

  useEffect(() => {
    // Vendas por dia (últimos 7 dias)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const salesData = last7Days.map(date => {
      const dayOrders = orders.filter(o => 
        o.created_at.startsWith(date) && o.payment_status === 'approved'
      );
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        vendas: dayOrders.reduce((sum, o) => sum + Number(o.transaction_amount), 0),
        pedidos: dayOrders.length
      };
    });
    setSalesByDay(salesData);

    // Produtos mais vendidos
    const productSales = orders
      .filter(o => o.payment_status === 'approved')
      .reduce((acc: any, order) => {
        acc[order.product_name] = (acc[order.product_name] || 0) + 1;
        return acc;
      }, {});

    const topProds = Object.entries(productSales)
      .map(([name, count]) => ({ name, vendas: count }))
      .sort((a: any, b: any) => b.vendas - a.vendas)
      .slice(0, 5);
    setTopProducts(topProds);

    // Receita por mês (últimos 6 meses)
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return date;
    }).reverse();

    const monthlyRevenue = last6Months.map(date => {
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthOrders = orders.filter(o => {
        const orderDate = new Date(o.created_at);
        return orderDate.getMonth() === month && 
               orderDate.getFullYear() === year && 
               o.payment_status === 'approved';
      });
      return {
        mes: date.toLocaleDateString('pt-BR', { month: 'short' }),
        receita: monthOrders.reduce((sum, o) => sum + Number(o.transaction_amount), 0)
      };
    });
    setRevenueByMonth(monthlyRevenue);

    // Produtos com estoque baixo (menos de 10 unidades)
    const lowStock = products.filter(p => p.stock < 10).slice(0, 5);
    setLowStockProducts(lowStock);

    // Fetch report and warning stats
    fetchReportStats();
    fetchWarningStats();
  }, [orders, products]);

  const fetchReportStats = async () => {
    try {
      const { data: reports } = await supabase
        .from('seller_reports')
        .select('status, created_at');

      if (reports) {
        const pending = reports.filter(r => r.status === 'pending').length;
        const confirmed = reports.filter(r => r.status === 'confirmed').length;
        const dismissed = reports.filter(r => r.status === 'dismissed').length;
        
        setReportStats({
          total: reports.length,
          pending,
          confirmed,
          dismissed
        });

        // Reports over last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return date.toISOString().split('T')[0];
        }).reverse();

        const reportsData = last7Days.map(date => {
          const dayReports = reports.filter(r => r.created_at.startsWith(date));
          return {
            date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            denuncias: dayReports.length
          };
        });
        setReportsOverTime(reportsData);
      }
    } catch (error) {
      console.error('Error fetching report stats:', error);
    }
  };

  const fetchWarningStats = async () => {
    try {
      const { data: warnings } = await supabase
        .from('seller_warnings')
        .select('seller_id, seller_profiles(full_name)');

      const { data: sellers } = await supabase
        .from('seller_profiles')
        .select('id, full_name, warning_count, is_suspended');

      if (warnings && sellers) {
        const sellersWithWarnings = sellers.filter(s => (s.warning_count || 0) > 0).length;
        const suspendedSellers = sellers.filter(s => s.is_suspended).length;

        // Top warned sellers
        const warningCounts = warnings.reduce((acc: any, w: any) => {
          const name = w.seller_profiles?.full_name || 'Desconhecido';
          acc[name] = (acc[name] || 0) + 1;
          return acc;
        }, {});

        const topWarnedSellers = Object.entries(warningCounts)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        setWarningStats({
          total: warnings.length,
          sellersWithWarnings,
          suspendedSellers,
          topWarnedSellers
        });
      }
    } catch (error) {
      console.error('Error fetching warning stats:', error);
    }
  };

  const statusData = [
    { name: 'Aprovados', value: stats.approvedOrders },
    { name: 'Pendentes', value: stats.pendingOrders },
    { name: 'Outros', value: stats.totalOrders - stats.approvedOrders - stats.pendingOrders }
  ];

  const reportStatusData = [
    { name: 'Pendentes', value: reportStats.pending },
    { name: 'Confirmadas', value: reportStats.confirmed },
    { name: 'Descartadas', value: reportStats.dismissed }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Dashboard</h2>
        <p className="text-muted-foreground">Visão geral do seu negócio</p>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gaming">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.approvedOrders} aprovados
            </p>
          </CardContent>
        </Card>

        <Card className="card-gaming">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos aprovados
            </p>
          </CardContent>
        </Card>

        <Card className="card-gaming">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Package className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>

        <Card className="card-gaming">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders > 0 ? ((stats.approvedOrders / stats.totalOrders) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos aprovados/total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de Denúncias e Advertências */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-gaming border-destructive/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Denúncias</CardTitle>
            <Flag className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {reportStats.pending} pendentes
            </p>
          </CardContent>
        </Card>

        <Card className="card-gaming border-yellow-500/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Advertências</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warningStats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {warningStats.sellersWithWarnings} vendedores advertidos
            </p>
          </CardContent>
        </Card>

        <Card className="card-gaming border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Suspensos</CardTitle>
            <Users className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{warningStats.suspendedSellers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Por 3+ advertências
            </p>
          </CardContent>
        </Card>

        <Card className="card-gaming">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Confirmação</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {reportStats.total > 0 
                ? ((reportStats.confirmed / reportStats.total) * 100).toFixed(1) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Denúncias confirmadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendas por dia */}
        <Card className="card-gaming">
          <CardHeader>
            <CardTitle>Vendas dos Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 8% 20%)" />
                <XAxis dataKey="date" stroke="hsl(240 5% 65%)" />
                <YAxis stroke="hsl(240 5% 65%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 8% 8%)', 
                    border: '1px solid hsl(240 8% 20%)',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Line type="monotone" dataKey="vendas" stroke="hsl(270 80% 60%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Produtos mais vendidos */}
        <Card className="card-gaming">
          <CardHeader>
            <CardTitle>Top 5 Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 8% 20%)" />
                <XAxis dataKey="name" stroke="hsl(240 5% 65%)" angle={-45} textAnchor="end" height={100} />
                <YAxis stroke="hsl(240 5% 65%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 8% 8%)', 
                    border: '1px solid hsl(240 8% 20%)',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="vendas" fill="hsl(142 76% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Receita mensal */}
        <Card className="card-gaming">
          <CardHeader>
            <CardTitle>Receita dos Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 8% 20%)" />
                <XAxis dataKey="mes" stroke="hsl(240 5% 65%)" />
                <YAxis stroke="hsl(240 5% 65%)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 8% 8%)', 
                    border: '1px solid hsl(240 8% 20%)',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="receita" fill="hsl(200 90% 55%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status dos pedidos */}
        <Card className="card-gaming">
          <CardHeader>
            <CardTitle>Status dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 8% 8%)', 
                    border: '1px solid hsl(240 8% 20%)',
                    borderRadius: '0.5rem'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Denúncias últimos 7 dias */}
        <Card className="card-gaming border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Denúncias Últimos 7 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 8% 20%)" />
                <XAxis dataKey="date" stroke="hsl(240 5% 65%)" />
                <YAxis stroke="hsl(240 5% 65%)" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 8% 8%)', 
                    border: '1px solid hsl(240 8% 20%)',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="denuncias" fill="hsl(0 72% 51%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status das denúncias */}
        <Card className="card-gaming">
          <CardHeader>
            <CardTitle>Status das Denúncias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => percent > 0 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="hsl(38 92% 50%)" />
                  <Cell fill="hsl(0 72% 51%)" />
                  <Cell fill="hsl(240 5% 65%)" />
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(240 8% 8%)', 
                    border: '1px solid hsl(240 8% 20%)',
                    borderRadius: '0.5rem'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top vendedores advertidos */}
        <Card className="card-gaming border-yellow-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Vendedores Mais Advertidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {warningStats.topWarnedSellers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma advertência registrada 👍
              </p>
            ) : (
              <div className="space-y-3">
                {warningStats.topWarnedSellers.map((seller, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>
                      <span className="font-medium">{seller.name}</span>
                    </div>
                    <Badge variant={seller.count >= 3 ? "destructive" : "secondary"}>
                      {seller.count} advertência{seller.count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alertas de estoque baixo */}
      {lowStockProducts.length > 0 && (
        <Card className="border-warning/50 card-gaming">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertCircle className="h-5 w-5" />
              Produtos com Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div key={product.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.category || 'Sem categoria'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-warning font-bold">{product.stock} unidades</p>
                    <p className="text-xs text-muted-foreground">Reabastecer estoque</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
