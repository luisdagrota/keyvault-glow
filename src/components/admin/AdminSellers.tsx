import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Ban, DollarSign } from "lucide-react";

interface Seller {
  id: string;
  user_id: string;
  full_name: string;
  cpf: string;
  pix_key: string;
  is_approved: boolean;
  is_suspended: boolean;
  pending_balance: number;
  available_balance: number;
  total_sales: number;
  average_rating: number;
  created_at: string;
}

interface Withdrawal {
  id: string;
  seller_id: string;
  amount: number;
  pix_key: string;
  status: string;
  requested_at: string;
  seller_profiles?: {
    full_name: string;
  };
}

export const AdminSellers = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    const [sellersRes, withdrawalsRes] = await Promise.all([
      supabase.from("seller_profiles").select("*").order("created_at", { ascending: false }),
      supabase
        .from("seller_withdrawals")
        .select("*, seller_profiles(full_name)")
        .eq("status", "pending")
        .order("requested_at", { ascending: false }),
    ]);

    if (sellersRes.data) setSellers(sellersRes.data);
    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const approveSeller = async (id: string) => {
    const { error } = await supabase
      .from("seller_profiles")
      .update({ is_approved: true })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vendedor aprovado!" });
      fetchData();
    }
  };

  const toggleSuspension = async (seller: Seller) => {
    const { error } = await supabase
      .from("seller_profiles")
      .update({ is_suspended: !seller.is_suspended })
      .eq("id", seller.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: seller.is_suspended ? "Vendedor reativado!" : "Vendedor suspenso!" });
      fetchData();
    }
  };

  const processWithdrawal = async (withdrawal: Withdrawal, approved: boolean) => {
    if (approved) {
      // First update the seller's balance
      const { error: balanceError } = await supabase
        .from("seller_profiles")
        .update({ available_balance: 0 })
        .eq("id", withdrawal.seller_id);

      if (balanceError) {
        toast({ title: "Erro ao atualizar saldo", description: balanceError.message, variant: "destructive" });
        return;
      }
    }

    const { error } = await supabase
      .from("seller_withdrawals")
      .update({
        status: approved ? "approved" : "rejected",
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawal.id);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: approved ? "Saque marcado como pago!" : "Saque rejeitado!" });
      fetchData();
    }
  };

  const pendingSellers = sellers.filter((s) => !s.is_approved);
  const activeSellers = sellers.filter((s) => s.is_approved && !s.is_suspended);
  const suspendedSellers = sellers.filter((s) => s.is_suspended);

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
        <h2 className="text-2xl font-bold">Gerenciar Vendedores</h2>
        <p className="text-muted-foreground">
          Aprove vendedores e gerencie saques
        </p>
      </div>

      {withdrawals.length > 0 && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-500" />
              Saques Pendentes ({withdrawals.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Chave Pix</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">
                      {w.seller_profiles?.full_name}
                    </TableCell>
                    <TableCell>R$ {w.amount.toFixed(2)}</TableCell>
                    <TableCell>{w.pix_key}</TableCell>
                    <TableCell>
                      {new Date(w.requested_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => processWithdrawal(w, true)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Marcar Pago
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => processWithdrawal(w, false)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Rejeitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes ({pendingSellers.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            Ativos ({activeSellers.length})
          </TabsTrigger>
          <TabsTrigger value="suspended">
            Suspensos ({suspendedSellers.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {pendingSellers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum vendedor pendente
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Chave Pix</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium">
                          {seller.full_name}
                        </TableCell>
                        <TableCell>{seller.cpf}</TableCell>
                        <TableCell>{seller.pix_key}</TableCell>
                        <TableCell>
                          {new Date(seller.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => approveSeller(seller.id)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Aprovar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardContent className="p-0">
              {activeSellers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum vendedor ativo
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium">
                          {seller.full_name}
                        </TableCell>
                        <TableCell>{seller.total_sales}</TableCell>
                        <TableCell>{seller.average_rating.toFixed(1)} ⭐</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <span className="text-yellow-500">
                              R$ {seller.pending_balance.toFixed(2)}
                            </span>
                            {" / "}
                            <span className="text-green-500">
                              R$ {seller.available_balance.toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => toggleSuspension(seller)}
                          >
                            <Ban className="mr-1 h-4 w-4" />
                            Suspender
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suspended">
          <Card>
            <CardContent className="p-0">
              {suspendedSellers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum vendedor suspenso
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suspendedSellers.map((seller) => (
                      <TableRow key={seller.id}>
                        <TableCell className="font-medium">
                          {seller.full_name}
                        </TableCell>
                        <TableCell>{seller.total_sales}</TableCell>
                        <TableCell>
                          R$ {seller.available_balance.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => toggleSuspension(seller)}
                          >
                            <Check className="mr-1 h-4 w-4" />
                            Reativar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
