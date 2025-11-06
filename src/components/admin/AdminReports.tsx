import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface AdminReportsProps {
  orders: any[];
  products: any[];
  stats: any;
}

export function AdminReports({ orders, products, stats }: AdminReportsProps) {
  
  const generateCSV = () => {
    try {
      const csvData = [
        ["ID", "Cliente", "Email", "Produto", "Valor", "Status", "Método", "Data"],
        ...orders.map(order => [
          order.id,
          order.customer_name || "N/A",
          order.customer_email,
          order.product_name,
          order.transaction_amount,
          order.payment_status,
          order.payment_method,
          new Date(order.created_at).toLocaleDateString('pt-BR')
        ])
      ];

      const csvContent = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-pedidos-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório CSV gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar CSV");
    }
  };

  const generateProductsCSV = () => {
    try {
      const csvData = [
        ["ID", "Nome", "Categoria", "Preço", "Estoque"],
        ...products.map(product => [
          product.id,
          product.name,
          product.category || "N/A",
          product.price,
          product.stock
        ])
      ];

      const csvContent = csvData.map(row => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-produtos-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório de produtos gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório de produtos");
    }
  };

  const generateSalesReport = () => {
    try {
      const reportContent = `
RELATÓRIO DE VENDAS
Data de Geração: ${new Date().toLocaleString('pt-BR')}

═══════════════════════════════════════════════

RESUMO GERAL
═══════════════════════════════════════════════
Total de Pedidos: ${stats.totalOrders}
Pedidos Aprovados: ${stats.approvedOrders}
Pedidos Pendentes: ${stats.pendingOrders}
Receita Total: R$ ${stats.totalRevenue.toFixed(2)}

═══════════════════════════════════════════════

PRODUTOS MAIS VENDIDOS
═══════════════════════════════════════════════
${orders
  .filter(o => o.payment_status === 'approved')
  .reduce((acc: any, order) => {
    acc[order.product_name] = (acc[order.product_name] || 0) + 1;
    return acc;
  }, {})
}

═══════════════════════════════════════════════

DETALHAMENTO DE PEDIDOS
═══════════════════════════════════════════════
${orders.map(order => `
ID: ${order.id}
Cliente: ${order.customer_name || 'N/A'}
Email: ${order.customer_email}
Produto: ${order.product_name}
Valor: R$ ${Number(order.transaction_amount).toFixed(2)}
Status: ${order.payment_status}
Data: ${new Date(order.created_at).toLocaleString('pt-BR')}
────────────────────────────────────────────────
`).join('\n')}
      `.trim();

      const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      
      link.setAttribute("href", url);
      link.setAttribute("download", `relatorio-vendas-${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Relatório de vendas gerado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar relatório");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Relatórios</h2>
        <p className="text-muted-foreground">Exporte dados de vendas e produtos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-gaming">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              Relatório de Pedidos (CSV)
            </CardTitle>
            <CardDescription>
              Exportar todos os pedidos em formato CSV para análise em planilhas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateCSV} className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Baixar CSV de Pedidos
            </Button>
          </CardContent>
        </Card>

        <Card className="card-gaming">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-accent" />
              Relatório de Produtos (CSV)
            </CardTitle>
            <CardDescription>
              Exportar catálogo de produtos com preços e estoque
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateProductsCSV} className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Baixar CSV de Produtos
            </Button>
          </CardContent>
        </Card>

        <Card className="card-gaming md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Relatório Completo de Vendas
            </CardTitle>
            <CardDescription>
              Relatório detalhado com estatísticas, produtos mais vendidos e lista completa de pedidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={generateSalesReport} className="w-full gap-2">
              <FileDown className="h-4 w-4" />
              Gerar Relatório Completo (TXT)
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="card-gaming border-accent/50">
        <CardHeader>
          <CardTitle>Informações sobre os Relatórios</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• <strong>CSV de Pedidos:</strong> Contém todos os pedidos com informações detalhadas (ID, cliente, produto, valor, status, data)</li>
            <li>• <strong>CSV de Produtos:</strong> Lista completa do catálogo com preços e níveis de estoque atuais</li>
            <li>• <strong>Relatório Completo:</strong> Documento de texto formatado com resumo geral, produtos mais vendidos e detalhamento de cada pedido</li>
            <li>• Todos os arquivos incluem a data de geração no nome do arquivo</li>
            <li>• Os arquivos CSV podem ser abertos no Excel, Google Sheets ou qualquer editor de planilhas</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
