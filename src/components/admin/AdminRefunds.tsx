import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2, Check, X, MessageCircle, Image, Clock, User, Store, 
  AlertTriangle, RefreshCcw, Send, FileText
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RefundRequest {
  id: string;
  order_id: string;
  customer_id: string;
  seller_id: string | null;
  reason: string;
  description: string | null;
  proofs: string[];
  customer_pix_key: string;
  pix_key_type: string;
  status: string;
  order_amount: number;
  admin_notes: string | null;
  seller_response: string | null;
  seller_responded_at: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface RefundMessage {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string | null;
  attachment_url: string | null;
  created_at: string;
}

export function AdminRefunds() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [messages, setMessages] = useState<RefundMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, any>>({});
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchRefunds();
  }, [filterStatus]);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("refund_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRefunds(data || []);

      // Fetch related data
      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(r => r.customer_id))];
        const sellerIds = [...new Set(data.filter(r => r.seller_id).map(r => r.seller_id!))];
        const orderIds = [...new Set(data.map(r => r.order_id))];

        // Fetch customers
        const { data: customers } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", customerIds);

        if (customers) {
          const map: Record<string, any> = {};
          customers.forEach(c => map[c.id] = c);
          setCustomerProfiles(map);
        }

        // Fetch sellers
        if (sellerIds.length > 0) {
          const { data: sellers } = await supabase
            .from("seller_profiles")
            .select("id, full_name, user_id, monthly_refunds_count")
            .in("id", sellerIds);

          if (sellers) {
            const map: Record<string, any> = {};
            sellers.forEach(s => map[s.id] = s);
            setSellerProfiles(map);
          }
        }

        // Fetch orders
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, product_name, payment_status")
          .in("id", orderIds);

        if (orderData) {
          const map: Record<string, any> = {};
          orderData.forEach(o => map[o.id] = o);
          setOrders(map);
        }
      }
    } catch (error) {
      console.error("Error fetching refunds:", error);
      toast.error("Erro ao carregar reembolsos");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (refundId: string) => {
    const { data, error } = await supabase
      .from("refund_messages")
      .select("*")
      .eq("refund_id", refundId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(data || []);
  };

  const openRefundDetails = async (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setAdminNotes(refund.admin_notes || "");
    await fetchMessages(refund.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedRefund) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("refund_messages")
      .insert({
        refund_id: selectedRefund.id,
        sender_id: session.user.id,
        sender_type: "admin",
        message: newMessage,
      });

    if (error) {
      toast.error("Erro ao enviar mensagem");
      return;
    }

    setNewMessage("");
    await fetchMessages(selectedRefund.id);
    toast.success("Mensagem enviada");
  };

  const updateRefundStatus = async (status: "approved" | "rejected" | "more_info_requested") => {
    if (!selectedRefund) return;

    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const updates: any = {
        status,
        admin_notes: adminNotes,
      };

      if (status === "approved" || status === "rejected") {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = session.user.id;
        updates.admin_decision = status;
        if (status === "approved") {
          updates.seller_deducted_amount = selectedRefund.order_amount;
        }
      }

      const { error } = await supabase
        .from("refund_requests")
        .update(updates)
        .eq("id", selectedRefund.id);

      if (error) throw error;

      const statusMessages = {
        approved: "Reembolso aprovado com sucesso!",
        rejected: "Reembolso rejeitado.",
        more_info_requested: "Solicitação de mais informações enviada.",
      };

      toast.success(statusMessages[status]);
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      in_review: { variant: "secondary", label: "Em análise" },
      approved: { variant: "default", label: "Aprovado" },
      rejected: { variant: "destructive", label: "Rejeitado" },
      more_info_requested: { variant: "outline", label: "Aguardando info" },
    };
    const { variant, label } = variants[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTimeRemaining = (createdAt: string, sellerRespondedAt: string | null) => {
    if (sellerRespondedAt) return null;
    
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now > deadline) {
      return <span className="text-destructive text-xs">Prazo expirado</span>;
    }
    
    return (
      <span className="text-amber-600 text-xs flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {formatDistanceToNow(deadline, { locale: ptBR, addSuffix: true })}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Reembolsos</h2>
          <p className="text-muted-foreground">Analise e processe solicitações de reembolso</p>
        </div>
        
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="in_review">Em análise</SelectItem>
            <SelectItem value="more_info_requested">Aguardando info</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="rejected">Rejeitados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {refunds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCcw className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação de reembolso encontrada</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {refunds.map((refund) => {
            const customer = customerProfiles[refund.customer_id];
            const seller = refund.seller_id ? sellerProfiles[refund.seller_id] : null;
            const order = orders[refund.order_id];

            return (
              <Card key={refund.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(refund.status)}
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(refund.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {getTimeRemaining(refund.created_at, refund.seller_responded_at)}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{customer?.full_name || "Cliente"}</span>
                        </div>
                        {seller && (
                          <div className="flex items-center gap-2">
                            <Store className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{seller.full_name}</span>
                            {seller.monthly_refunds_count >= 3 && (
                              <Badge variant="destructive" className="text-xs">
                                {seller.monthly_refunds_count} reembolsos/mês
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-sm">
                        <strong>Produto:</strong> {order?.product_name || "N/A"}
                      </div>
                      <div className="text-sm">
                        <strong>Motivo:</strong> {refund.reason}
                      </div>
                      <div className="text-sm font-medium text-primary">
                        Valor: R$ {refund.order_amount.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openRefundDetails(refund)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Refund Details Modal */}
      <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Detalhes do Reembolso
            </DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Status & Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Informações do Cliente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Nome:</strong> {customerProfiles[selectedRefund.customer_id]?.full_name}</p>
                    <p><strong>Chave PIX:</strong> {selectedRefund.customer_pix_key}</p>
                    <p><strong>Tipo:</strong> {selectedRefund.pix_key_type.toUpperCase()}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      Informações do Pedido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><strong>Produto:</strong> {orders[selectedRefund.order_id]?.product_name}</p>
                    <p><strong>Valor:</strong> R$ {selectedRefund.order_amount.toFixed(2)}</p>
                    <p><strong>Vendedor:</strong> {selectedRefund.seller_id ? sellerProfiles[selectedRefund.seller_id]?.full_name : "Loja Principal"}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Reason & Description */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Motivo da Solicitação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Badge>{selectedRefund.reason}</Badge>
                  {selectedRefund.description && (
                    <p className="text-sm text-muted-foreground">{selectedRefund.description}</p>
                  )}
                </CardContent>
              </Card>

              {/* Proofs */}
              {selectedRefund.proofs && selectedRefund.proofs.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Provas Enviadas ({selectedRefund.proofs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedRefund.proofs.map((proof, i) => (
                        <a
                          key={i}
                          href={proof}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                        >
                          <img
                            src={proof}
                            alt={`Prova ${i + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seller Response */}
              {selectedRefund.seller_response && (
                <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Resposta do Vendedor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{selectedRefund.seller_response}</p>
                    {selectedRefund.seller_responded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Respondido em {format(new Date(selectedRefund.seller_responded_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Chat */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat Interno
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-48 border rounded-lg p-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma mensagem ainda
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-2 rounded-lg text-sm ${
                              msg.sender_type === "admin"
                                ? "bg-primary/10 ml-8"
                                : msg.sender_type === "seller"
                                ? "bg-amber-100 dark:bg-amber-900/20 mr-8"
                                : "bg-muted mr-8"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {msg.sender_type === "admin" ? "ADM" : msg.sender_type === "seller" ? "Vendedor" : "Cliente"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), "dd/MM HH:mm")}
                              </span>
                            </div>
                            <p>{msg.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite uma mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                    />
                    <Button onClick={sendMessage} size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label>Notas do Administrador</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Adicione observações sobre esta solicitação..."
                  rows={3}
                />
              </div>

              {/* Actions */}
              {selectedRefund.status !== "approved" && selectedRefund.status !== "rejected" && (
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    onClick={() => updateRefundStatus("approved")}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Aprovar Reembolso
                  </Button>
                  <Button
                    onClick={() => updateRefundStatus("rejected")}
                    disabled={processing}
                    variant="destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={() => updateRefundStatus("more_info_requested")}
                    disabled={processing}
                    variant="outline"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Solicitar Mais Informações
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
