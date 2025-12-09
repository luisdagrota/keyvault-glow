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
import { Loader2, Check, X, Ban, DollarSign, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

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
  warning_count: number;
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
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [warningReason, setWarningReason] = useState("");
  const [submittingWarning, setSubmittingWarning] = useState(false);
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

    if (sellersRes.data) setSellers(sellersRes.data as Seller[]);
    if (withdrawalsRes.data) setWithdrawals(withdrawalsRes.data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openWarningDialog = (seller: Seller) => {
    setSelectedSeller(seller);
    setWarningReason("");
    setWarningDialogOpen(true);
  };

  const submitWarning = async () => {
    if (!selectedSeller || !warningReason.trim()) {
      toast({ title: "Digite o motivo da advertência", variant: "destructive" });
      return;
    }

    setSubmittingWarning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("seller_warnings").insert({
        seller_id: selectedSeller.id,
        admin_id: user.id,
        reason: warningReason.trim(),
      });

      if (error) throw error;

      // Create notification for seller
      await supabase.from("seller_notifications").insert({
        seller_id: selectedSeller.id,
        type: "warning",
        title: "⚠️ Você recebeu uma advertência",
        message: warningReason.trim(),
      });

      toast({ title: "Advertência aplicada com sucesso!" });
      setWarningDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingWarning(false);
    }
  };

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
                      <TableHead>Advertências</TableHead>
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
                          <Badge variant={seller.warning_count > 0 ? "destructive" : "secondary"}>
                            {seller.warning_count || 0}/3
                          </Badge>
                        </TableCell>
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-yellow-600 border-yellow-600 hover:bg-yellow-600/10"
                              onClick={() => openWarningDialog(seller)}
                            >
                              <AlertTriangle className="mr-1 h-4 w-4" />
                              Advertir
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => toggleSuspension(seller)}
                            >
                              <Ban className="mr-1 h-4 w-4" />
                              Suspender
                            </Button>
                          </div>
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
                      <TableHead>Advertências</TableHead>
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
                          <Badge variant="destructive">
                            {seller.warning_count || 0}/3
                          </Badge>
                        </TableCell>
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

      {/* Warning Dialog */}
      <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Aplicar Advertência
            </DialogTitle>
            <DialogDescription>
              Advertir vendedor: <strong>{selectedSeller?.full_name}</strong>
              <br />
              Advertências atuais: {selectedSeller?.warning_count || 0}/3
              {selectedSeller && (selectedSeller.warning_count || 0) >= 2 && (
                <span className="block mt-2 text-destructive font-semibold">
                  ⚠️ Esta advertência causará a suspensão automática da conta!
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Motivo da Advertência</label>
            <Textarea
              placeholder="Descreva o motivo da advertência (ex: Não entregou o produto ao cliente)"
              value={warningReason}
              onChange={(e) => setWarningReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarningDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitWarning}
              disabled={submittingWarning || !warningReason.trim()}
            >
              {submittingWarning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Aplicar Advertência
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
