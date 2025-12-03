import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface Sale {
  id: string;
  product_name: string;
  buyer_name: string;
  sale_amount: number;
  fee_amount: number;
  net_amount: number;
  status: string;
  created_at: string;
  balance_released_at: string | null;
}

interface SellerSalesProps {
  sellerId: string;
}

export const SellerSales = ({ sellerId }: SellerSalesProps) => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      const { data, error } = await supabase
        .from("seller_sales")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching sales:", error);
        return;
      }

      setSales(data || []);
      setLoading(false);
    };

    fetchSales();
  }, [sellerId]);

  const getStatusBadge = (status: string, releasedAt: string | null) => {
    if (status === "approved" && releasedAt) {
      return <Badge variant="default">Liberado</Badge>;
    }
    if (status === "approved") {
      return <Badge variant="secondary">Aguardando liberação</Badge>;
    }
    if (status === "pending") {
      return <Badge variant="outline">Pendente</Badge>;
    }
    return <Badge variant="destructive">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Minhas Vendas</h2>
        <p className="text-muted-foreground">
          Acompanhe todas as suas vendas e a taxa aplicada
        </p>
      </div>

      {sales.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Você ainda não tem vendas. Continue divulgando seus produtos!
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor Bruto</TableHead>
                  <TableHead>Taxa (6,99%)</TableHead>
                  <TableHead>Valor Líquido</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium">
                      {sale.product_name}
                    </TableCell>
                    <TableCell>{sale.buyer_name}</TableCell>
                    <TableCell>R$ {sale.sale_amount.toFixed(2)}</TableCell>
                    <TableCell className="text-destructive">
                      - R$ {sale.fee_amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-green-500 font-medium">
                      R$ {sale.net_amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(sale.status, sale.balance_released_at)}
                    </TableCell>
                    <TableCell>
                      {new Date(sale.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Como funciona a taxa?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            • Uma taxa de <strong>6,99%</strong> é descontada automaticamente de cada venda.
          </p>
          <p>
            • O valor líquido (após a taxa) entra como <strong>Saldo a Liberar</strong>.
          </p>
          <p>
            • Após <strong>1 dia</strong>, o saldo é transferido para <strong>Saldo Liberado</strong>.
          </p>
          <p>
            • Você pode solicitar o saque do saldo liberado a qualquer momento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
