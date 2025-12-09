import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, CheckCircle, XCircle, User, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FraudAlert {
  id: string;
  seller_id: string;
  alert_type: string;
  description: string;
  severity: string;
  is_resolved: boolean;
  resolved_at: string | null;
  admin_notes: string | null;
  created_at: string;
  seller_profiles?: {
    full_name: string;
    cpf: string;
    fraud_risk_level: string;
    is_suspended: boolean;
    warning_count: number;
  };
}

interface SellerRisk {
  id: string;
  full_name: string;
  cpf: string;
  fraud_risk_level: string;
  is_suspended: boolean;
  warning_count: number;
  cpf_change_count: number;
  total_sales: number;
}

export const AdminFraud = () => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [riskySellers, setRiskySellers] = useState<SellerRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    
    const channel = supabase
      .channel('fraud-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fraud_alerts' }, () => {
        loadData();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    await Promise.all([loadAlerts(), loadRiskySellers()]);
    setLoading(false);
  };

  const loadAlerts = async () => {
    const { data, error } = await supabase
      .from("fraud_alerts")
      .select(`
        *,
        seller_profiles (
          full_name,
          cpf,
          fraud_risk_level,
          is_suspended,
          warning_count
        )
      `)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setAlerts(data as FraudAlert[]);
    }
  };

  const loadRiskySellers = async () => {
    const { data, error } = await supabase
      .from("seller_profiles")
      .select("id, full_name, cpf, fraud_risk_level, is_suspended, warning_count, cpf_change_count, total_sales")
      .or("fraud_risk_level.neq.low,cpf_change_count.gt.0,warning_count.gte.2")
      .order("warning_count", { ascending: false });

    if (!error && data) {
      setRiskySellers(data as SellerRisk[]);
    }
  };

  const resolveAlert = async (alertId: string, action: "resolve" | "block_seller") => {
    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return;

    const { data: { user } } = await supabase.auth.getUser();
    
    // Resolve the alert
    const { error: alertError } = await supabase
      .from("fraud_alerts")
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
        admin_notes: adminNotes[alertId] || null
      })
      .eq("id", alertId);

    if (alertError) {
      toast({ title: "Erro ao resolver alerta", variant: "destructive" });
      return;
    }

    // If blocking seller
    if (action === "block_seller") {
      const { error: blockError } = await supabase
        .from("seller_profiles")
        .update({ is_suspended: true, fraud_risk_level: "blocked" })
        .eq("id", alert.seller_id);

      if (blockError) {
        toast({ title: "Erro ao bloquear vendedor", variant: "destructive" });
        return;
      }
    }

    toast({ 
      title: action === "block_seller" ? "Vendedor bloqueado" : "Alerta resolvido",
      description: action === "block_seller" ? "O vendedor foi suspenso por risco de fraude" : "O alerta foi marcado como resolvido"
    });

    loadData();
  };

  const unblockSeller = async (sellerId: string) => {
    const { error } = await supabase
      .from("seller_profiles")
      .update({ is_suspended: false, fraud_risk_level: "low" })
      .eq("id", sellerId);

    if (error) {
      toast({ title: "Erro ao desbloquear", variant: "destructive" });
      return;
    }

    toast({ title: "Vendedor desbloqueado" });
    loadData();
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === "pending") return !alert.is_resolved;
    if (filter === "resolved") return alert.is_resolved;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "cpf_change_attempt": return "Alteração de CPF";
      case "profile_change_after_sales": return "Alteração de Dados";
      case "consecutive_negative_reviews": return "Avaliações Negativas";
      default: return type;
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "high":
      case "blocked": return <ShieldAlert className="h-5 w-5 text-destructive" />;
      case "medium": return <Shield className="h-5 w-5 text-yellow-500" />;
      default: return <ShieldCheck className="h-5 w-5 text-green-500" />;
    }
  };

  const pendingCount = alerts.filter(a => !a.is_resolved).length;
  const highRiskCount = riskySellers.filter(s => s.fraud_risk_level === "high" || s.fraud_risk_level === "blocked").length;
  const blockedCount = riskySellers.filter(s => s.is_suspended).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Sistema Antifraude</h2>
        <p className="text-muted-foreground">Monitore atividades suspeitas de vendedores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Alertas Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{highRiskCount}</p>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{blockedCount}</p>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{alerts.filter(a => a.is_resolved).length}</p>
                <p className="text-sm text-muted-foreground">Resolvidos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risky Sellers */}
      {riskySellers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Vendedores em Risco
            </CardTitle>
            <CardDescription>Vendedores com comportamento suspeito</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskySellers.map(seller => (
                <div key={seller.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getRiskIcon(seller.fraud_risk_level)}
                    <div>
                      <p className="font-medium">{seller.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        CPF: {seller.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")} | 
                        Vendas: {seller.total_sales} | 
                        Advertências: {seller.warning_count} |
                        Alterações CPF: {seller.cpf_change_count}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={seller.fraud_risk_level === "high" || seller.fraud_risk_level === "blocked" ? "destructive" : "secondary"}>
                      {seller.fraud_risk_level === "blocked" ? "Bloqueado" : seller.fraud_risk_level === "high" ? "Alto Risco" : "Monitorado"}
                    </Badge>
                    {seller.is_suspended ? (
                      <Button size="sm" variant="outline" onClick={() => unblockSeller(seller.id)}>
                        Desbloquear
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={async () => {
                          await supabase
                            .from("seller_profiles")
                            .update({ is_suspended: true, fraud_risk_level: "blocked" })
                            .eq("id", seller.id);
                          toast({ title: "Vendedor bloqueado" });
                          loadData();
                        }}
                      >
                        Bloquear
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Fraude
              </CardTitle>
              <CardDescription>Atividades suspeitas detectadas automaticamente</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant={filter === "pending" ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilter("pending")}
              >
                Pendentes ({alerts.filter(a => !a.is_resolved).length})
              </Button>
              <Button 
                variant={filter === "resolved" ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilter("resolved")}
              >
                Resolvidos
              </Button>
              <Button 
                variant={filter === "all" ? "default" : "outline"} 
                size="sm"
                onClick={() => setFilter("all")}
              >
                Todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum alerta {filter === "pending" ? "pendente" : filter === "resolved" ? "resolvido" : ""}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAlerts.map(alert => (
                <div 
                  key={alert.id} 
                  className={`p-4 border rounded-lg ${alert.is_resolved ? "opacity-60" : ""}`}
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity === "high" ? "Alta" : alert.severity === "medium" ? "Média" : "Baixa"}
                        </Badge>
                        <Badge variant="outline">{getAlertTypeLabel(alert.alert_type)}</Badge>
                        {alert.is_resolved && (
                          <Badge variant="secondary">Resolvido</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4" />
                        <span className="font-medium">{alert.seller_profiles?.full_name}</span>
                        {alert.seller_profiles?.is_suspended && (
                          <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm">{alert.description}</p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(alert.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </div>

                      {alert.admin_notes && (
                        <div className="flex items-start gap-2 text-sm bg-muted p-2 rounded">
                          <FileText className="h-4 w-4 mt-0.5" />
                          <span>{alert.admin_notes}</span>
                        </div>
                      )}
                    </div>
                    
                    {!alert.is_resolved && (
                      <div className="flex flex-col gap-2 lg:w-64">
                        <Textarea
                          placeholder="Notas do admin (opcional)"
                          value={adminNotes[alert.id] || ""}
                          onChange={(e) => setAdminNotes(prev => ({ ...prev, [alert.id]: e.target.value }))}
                          className="text-sm"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => resolveAlert(alert.id, "resolve")}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolver
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="flex-1"
                            onClick={() => resolveAlert(alert.id, "block_seller")}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Bloquear
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
