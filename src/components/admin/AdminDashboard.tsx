import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, DollarSign, Package, TrendingUp, AlertCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";

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

const COLORS = ['hsl(270 80% 60%)', 'hsl(142 76% 45%)', 'hsl(200 90% 55%)', 'hsl(38 92% 50%)'];

export function AdminDashboard({ stats, orders, products }: DashboardProps) {
  const [salesByDay, setSalesByDay] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);

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
  }, [orders, products]);

  const statusData = [
    { name: 'Aprovados', value: stats.approvedOrders },
    { name: 'Pendentes', value: stats.pendingOrders },
    { name: 'Outros', value: stats.totalOrders - stats.approvedOrders - stats.pendingOrders }
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
