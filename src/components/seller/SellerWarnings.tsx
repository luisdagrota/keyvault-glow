import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SellerProfile } from "@/pages/SellerDashboard";

interface Warning {
  id: string;
  reason: string;
  created_at: string;
}

interface SellerWarningsProps {
  seller: SellerProfile;
}

export const SellerWarnings = ({ seller }: SellerWarningsProps) => {
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWarnings = async () => {
      const { data } = await supabase
        .from("seller_warnings")
        .select("id, reason, created_at")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });

      if (data) setWarnings(data);
      setLoading(false);
    };

    fetchWarnings();
  }, [seller.id]);

  const warningCount = seller.warning_count || warnings.length;

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      {warningCount > 0 && (
        <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="font-bold">
            Você tem {warningCount} advertência{warningCount !== 1 ? "s" : ""}
          </AlertTitle>
          <AlertDescription>
            {warningCount >= 3 ? (
              <span className="font-semibold text-destructive">
                Sua conta foi suspensa devido a 3 ou mais advertências.
              </span>
            ) : (
              <span>
                Ao receber 3 advertências sua conta será suspensa automaticamente.
                Faltam {3 - warningCount} advertência{3 - warningCount !== 1 ? "s" : ""} para suspensão.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Rules Reminder */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Aviso Importante para Vendedores
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">⚠️ Entrega Obrigatória:</strong> Você deve entregar o produto prometido ao cliente.
            Caso não entregue, receberá uma advertência do administrador.
          </p>
          <p>
            <strong className="text-foreground">🚫 Sistema de Advertências:</strong> Após receber 3 advertências, 
            sua conta será automaticamente suspensa.
          </p>
          <p>
            <strong className="text-foreground">📸 Documentação:</strong> Sempre envie prints e comprovantes de entrega 
            pelo chat para sua segurança.
          </p>
        </CardContent>
      </Card>

      {/* Warning History */}
      {warnings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Histórico de Advertências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <div
                  key={warning.id}
                  className="p-3 rounded-lg border border-destructive/30 bg-destructive/5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-destructive text-destructive-foreground px-2 py-0.5 rounded">
                        #{warnings.length - index}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(warning.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-sm">{warning.reason}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && warnings.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Você não possui advertências. Continue assim! 👍</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
