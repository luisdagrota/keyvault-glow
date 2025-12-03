import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Wallet, Clock, CheckCircle2 } from "lucide-react";
import type { SellerProfile } from "@/pages/SellerDashboard";

interface Withdrawal {
  id: string;
  amount: number;
  pix_key: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
}

interface SellerBalanceProps {
  seller: SellerProfile;
}

export const SellerBalance = ({ seller }: SellerBalanceProps) => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();

  const fetchWithdrawals = async () => {
    const { data, error } = await supabase
      .from("seller_withdrawals")
      .select("*")
      .eq("seller_id", seller.id)
      .order("requested_at", { ascending: false });

    if (error) {
      console.error("Error fetching withdrawals:", error);
      return;
    }

    setWithdrawals(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [seller.id]);

  const hasPendingWithdrawal = withdrawals.some((w) => w.status === "pending");

  const requestWithdrawal = async () => {
    if (seller.available_balance <= 0) {
      toast({
        title: "Saldo insuficiente",
        description: "Você não tem saldo liberado para sacar",
        variant: "destructive",
      });
      return;
    }

    if (hasPendingWithdrawal) {
      toast({
        title: "Saque pendente",
        description: "Você já tem um saque aguardando liberação",
        variant: "destructive",
      });
      return;
    }

    setRequesting(true);

    const { error } = await supabase.from("seller_withdrawals").insert({
      seller_id: seller.id,
      amount: seller.available_balance,
      pix_key: seller.pix_key,
      status: "pending",
    });

    if (error) {
      toast({
        title: "Erro ao solicitar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Saque solicitado!",
        description: "Aguarde a liberação pelo administrador",
      });
      fetchWithdrawals();
    }

    setRequesting(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Aguardando</Badge>;
      case "approved":
        return <Badge variant="default">Pago</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
        <h2 className="text-2xl font-bold">Meu Saldo</h2>
        <p className="text-muted-foreground">
          Gerencie seu saldo e solicite saques
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo a Liberar
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              R$ {seller.pending_balance.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Será liberado em até 1 dia após a venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Saldo Liberado
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              R$ {seller.available_balance.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Disponível para saque
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Solicitar Saque
          </CardTitle>
          <CardDescription>
            Chave Pix cadastrada: <strong>{seller.pix_key}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPendingWithdrawal ? (
            <div className="text-center py-4">
              <Badge variant="secondary" className="mb-2">
                Aguardando liberação do ADM
              </Badge>
              <p className="text-sm text-muted-foreground">
                Você já tem um saque pendente. Aguarde a liberação pelo administrador.
              </p>
            </div>
          ) : seller.available_balance > 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Valor disponível para saque:{" "}
                <strong className="text-green-500">
                  R$ {seller.available_balance.toFixed(2)}
                </strong>
              </p>
              <Button onClick={requestWithdrawal} disabled={requesting}>
                {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Solicitar Saque
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Você não tem saldo liberado para sacar no momento.
            </p>
          )}
        </CardContent>
      </Card>

      {withdrawals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Saques</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave Pix</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Solicitado em</TableHead>
                  <TableHead>Pago em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id}>
                    <TableCell className="font-medium">
                      R$ {withdrawal.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>{withdrawal.pix_key}</TableCell>
                    <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                    <TableCell>
                      {new Date(withdrawal.requested_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      {withdrawal.processed_at
                        ? new Date(withdrawal.processed_at).toLocaleDateString("pt-BR")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
