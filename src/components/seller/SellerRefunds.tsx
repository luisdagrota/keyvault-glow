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
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Loader2, Clock, User, AlertTriangle, RefreshCcw, Send, 
  FileText, Image, MessageCircle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RefundRequest {
  id: string;
  order_id: string;
  customer_id: string;
  reason: string;
  description: string | null;
  proofs: string[];
  status: string;
  order_amount: number;
  seller_response: string | null;
  seller_responded_at: string | null;
  created_at: string;
}

interface RefundMessage {
  id: string;
  sender_id: string;
  sender_type: string;
  message: string | null;
  created_at: string;
}

interface SellerRefundsProps {
  sellerId: string;
}

export function SellerRefunds({ sellerId }: SellerRefundsProps) {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [messages, setMessages] = useState<RefundMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sellerResponse, setSellerResponse] = useState("");
  const [processing, setProcessing] = useState(false);
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, any>>({});
  const [orders, setOrders] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchRefunds();
  }, [sellerId]);

  const fetchRefunds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("refund_requests")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRefunds(data || []);

      if (data && data.length > 0) {
        const customerIds = [...new Set(data.map(r => r.customer_id))];
        const orderIds = [...new Set(data.map(r => r.order_id))];

        // Fetch customers
        const { data: customers } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", customerIds);

        if (customers) {
          const map: Record<string, any> = {};
          customers.forEach(c => map[c.id] = c);
          setCustomerProfiles(map);
        }

        // Fetch orders
        const { data: orderData } = await supabase
          .from("orders")
          .select("id, product_name")
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
    const { data } = await supabase
      .from("refund_messages")
      .select("*")
      .eq("refund_id", refundId)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const openRefundDetails = async (refund: RefundRequest) => {
    setSelectedRefund(refund);
    setSellerResponse(refund.seller_response || "");
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
        sender_type: "seller",
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

  const submitResponse = async () => {
    if (!sellerResponse.trim() || !selectedRefund) {
      toast.error("Escreva sua resposta");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from("refund_requests")
        .update({
          seller_response: sellerResponse,
          seller_responded_at: new Date().toISOString(),
        })
        .eq("id", selectedRefund.id);

      if (error) throw error;

      toast.success("Resposta enviada com sucesso!");
      setSelectedRefund(null);
      fetchRefunds();
    } catch (error) {
      toast.error("Erro ao enviar resposta");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pendente" },
      in_review: { variant: "secondary", label: "Em análise" },
      approved: { variant: "destructive", label: "Aprovado" },
      rejected: { variant: "default", label: "Rejeitado" },
      more_info_requested: { variant: "outline", label: "Aguardando info" },
    };
    const { variant, label } = variants[status] || { variant: "outline", label: status };
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getTimeRemaining = (createdAt: string, respondedAt: string | null) => {
    if (respondedAt) {
      return <span className="text-green-600 text-xs">✓ Respondido</span>;
    }
    
    const created = new Date(createdAt);
    const deadline = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    
    if (now > deadline) {
      return <span className="text-destructive text-xs font-medium">⚠️ Prazo expirado!</span>;
    }
    
    return (
      <span className="text-amber-600 text-xs flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Responda {formatDistanceToNow(deadline, { locale: ptBR, addSuffix: true })}
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
      <div>
        <h2 className="text-2xl font-bold">Reembolsos Recebidos</h2>
        <p className="text-muted-foreground">
          Responda às solicitações de reembolso dos clientes em até 24 horas
        </p>
      </div>

      {refunds.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <RefreshCcw className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma solicitação de reembolso</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {refunds.map((refund) => {
            const customer = customerProfiles[refund.customer_id];
            const order = orders[refund.order_id];

            return (
              <Card 
                key={refund.id} 
                className={`hover:shadow-md transition-shadow ${
                  !refund.seller_responded_at && refund.status === "pending" 
                    ? "border-amber-300" 
                    : ""
                }`}
              >
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
                      
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{customer?.full_name || "Cliente"}</span>
                      </div>

                      <div className="text-sm">
                        <strong>Produto:</strong> {order?.product_name || "N/A"}
                      </div>
                      <div className="text-sm">
                        <strong>Motivo:</strong> {refund.reason}
                      </div>
                      <div className="text-sm font-medium text-destructive">
                        Valor: R$ {refund.order_amount.toFixed(2)}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openRefundDetails(refund)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>• Você tem <strong>24 horas</strong> para responder às solicitações de reembolso.</p>
          <p>• Após o prazo, o ADM pode decidir sem sua resposta.</p>
          <p>• Sempre forneça provas da entrega (prints, conversas).</p>
          <p>• Reembolsos aprovados são descontados do seu saldo.</p>
        </CardContent>
      </Card>

      {/* Refund Details Modal */}
      <Dialog open={!!selectedRefund} onOpenChange={() => setSelectedRefund(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Detalhes do Reembolso
            </DialogTitle>
          </DialogHeader>

          {selectedRefund && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Basic Info */}
              <Card>
                <CardContent className="p-4 space-y-2 text-sm">
                  <p><strong>Cliente:</strong> {customerProfiles[selectedRefund.customer_id]?.full_name}</p>
                  <p><strong>Produto:</strong> {orders[selectedRefund.order_id]?.product_name}</p>
                  <p><strong>Valor:</strong> R$ {selectedRefund.order_amount.toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <strong>Status:</strong> {getStatusBadge(selectedRefund.status)}
                  </div>
                </CardContent>
              </Card>

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
                      Provas do Cliente ({selectedRefund.proofs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
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

              {/* Chat */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Chat com ADM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-32 border rounded-lg p-3">
                    {messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma mensagem
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-2 rounded-lg text-sm ${
                              msg.sender_type === "admin"
                                ? "bg-primary/10 mr-8"
                                : msg.sender_type === "seller"
                                ? "bg-amber-100 dark:bg-amber-900/20 ml-8"
                                : "bg-muted mr-8"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {msg.sender_type === "admin" ? "ADM" : msg.sender_type === "seller" ? "Você" : "Cliente"}
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
                      placeholder="Mensagem para o ADM..."
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

              {/* Seller Response */}
              {selectedRefund.status !== "approved" && selectedRefund.status !== "rejected" && (
                <div className="space-y-2">
                  <Label>Sua Resposta ao Reembolso</Label>
                  <Textarea
                    value={sellerResponse}
                    onChange={(e) => setSellerResponse(e.target.value)}
                    placeholder="Explique seu ponto de vista, forneça provas de entrega..."
                    rows={4}
                    disabled={!!selectedRefund.seller_responded_at}
                  />
                  {!selectedRefund.seller_responded_at && (
                    <Button
                      onClick={submitResponse}
                      disabled={processing}
                      className="w-full"
                    >
                      {processing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Enviar Resposta
                    </Button>
                  )}
                  {selectedRefund.seller_responded_at && (
                    <p className="text-sm text-green-600">
                      ✓ Resposta enviada em {format(new Date(selectedRefund.seller_responded_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
