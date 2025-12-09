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
import { Loader2, Check, X, AlertTriangle, Flag, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Report {
  id: string;
  order_id: string;
  seller_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  orders?: {
    product_name: string;
    customer_email: string;
    payment_status: string;
  };
  seller_profiles?: {
    full_name: string;
    warning_count: number;
  };
}

export const AdminReportsQueue = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"warn" | "dismiss" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from("seller_reports")
      .select(`
        *,
        orders(product_name, customer_email, payment_status),
        seller_profiles(full_name, warning_count)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reports:", error);
    } else {
      setReports(data as Report[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const openActionDialog = (report: Report, type: "warn" | "dismiss") => {
    setSelectedReport(report);
    setActionType(type);
    setAdminNotes("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedReport || !actionType) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (actionType === "warn") {
        // Create warning for seller
        const { error: warningError } = await supabase.from("seller_warnings").insert({
          seller_id: selectedReport.seller_id,
          admin_id: user.id,
          reason: `Denúncia confirmada: ${selectedReport.reason}`,
          order_id: selectedReport.order_id,
        });

        if (warningError) throw warningError;

        // Notify seller
        await supabase.from("seller_notifications").insert({
          seller_id: selectedReport.seller_id,
          type: "warning",
          title: "⚠️ Denúncia confirmada - Advertência aplicada",
          message: adminNotes || "Uma denúncia de cliente foi confirmada e você recebeu uma advertência.",
        });
      }

      // Update report status
      const { error: updateError } = await supabase
        .from("seller_reports")
        .update({
          status: actionType === "warn" ? "confirmed" : "dismissed",
          admin_notes: adminNotes || null,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id,
        })
        .eq("id", selectedReport.id);

      if (updateError) throw updateError;

      toast({
        title: actionType === "warn" ? "Advertência aplicada!" : "Denúncia descartada",
      });

      setActionDialogOpen(false);
      fetchReports();
    } catch (error: any) {
      console.error("Error processing report:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pendingReports = reports.filter((r) => r.status === "pending");
  const resolvedReports = reports.filter((r) => r.status !== "pending");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pendente</Badge>;
      case "confirmed":
        return <Badge variant="destructive">Confirmada</Badge>;
      case "dismissed":
        return <Badge variant="outline">Descartada</Badge>;
      default:
        return <Badge>{status}</Badge>;
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
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="h-6 w-6 text-destructive" />
          Denúncias de Clientes
        </h2>
        <p className="text-muted-foreground">
          Gerencie denúncias de clientes contra vendedores
        </p>
      </div>

      {pendingReports.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {pendingReports.length} Denúncia{pendingReports.length !== 1 ? "s" : ""} Pendente{pendingReports.length !== 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
        </Card>
      )}

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pendentes ({pendingReports.length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Resolvidas ({resolvedReports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="p-0">
              {pendingReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma denúncia pendente 🎉
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="text-sm">
                          {new Date(report.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">{report.seller_profiles?.full_name}</span>
                            <div className="text-xs text-muted-foreground">
                              Advertências: {report.seller_profiles?.warning_count || 0}/3
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {report.orders?.product_name}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          <p className="text-sm truncate" title={report.reason}>
                            {report.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openActionDialog(report, "warn")}
                            >
                              <AlertTriangle className="mr-1 h-4 w-4" />
                              Advertir
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openActionDialog(report, "dismiss")}
                            >
                              <X className="mr-1 h-4 w-4" />
                              Descartar
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

        <TabsContent value="resolved">
          <Card>
            <CardContent className="p-0">
              {resolvedReports.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma denúncia resolvida
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Resolvido em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resolvedReports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="text-sm">
                          {new Date(report.created_at).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {report.seller_profiles?.full_name}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {report.orders?.product_name}
                        </TableCell>
                        <TableCell>{getStatusBadge(report.status)}</TableCell>
                        <TableCell className="text-sm">
                          {report.resolved_at
                            ? new Date(report.resolved_at).toLocaleDateString("pt-BR")
                            : "-"}
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

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "warn" ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Confirmar Denúncia e Advertir
                </>
              ) : (
                <>
                  <X className="h-5 w-5" />
                  Descartar Denúncia
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "warn" ? (
                <>
                  Confirmar denúncia contra <strong>{selectedReport?.seller_profiles?.full_name}</strong>.
                  <br />
                  Isso aplicará uma advertência ao vendedor.
                  {selectedReport?.seller_profiles?.warning_count && selectedReport.seller_profiles.warning_count >= 2 && (
                    <span className="block mt-2 text-destructive font-semibold">
                      ⚠️ Esta advertência causará a suspensão automática da conta!
                    </span>
                  )}
                </>
              ) : (
                <>
                  Descartar denúncia contra <strong>{selectedReport?.seller_profiles?.full_name}</strong>.
                  <br />
                  Nenhuma ação será tomada contra o vendedor.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-sm font-medium mb-1">Motivo da denúncia:</p>
              <p className="text-sm text-muted-foreground">{selectedReport?.reason}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Notas do admin (opcional)
              </label>
              <Textarea
                placeholder="Adicione observações sobre esta decisão..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={actionType === "warn" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : actionType === "warn" ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Confirmar e Advertir
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Descartar Denúncia
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
