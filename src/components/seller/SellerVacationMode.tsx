import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Palmtree, CalendarIcon, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface SellerVacationModeProps {
  seller: {
    id: string;
    is_on_vacation?: boolean;
    vacation_started_at?: string | null;
    vacation_ends_at?: string | null;
    vacation_message?: string | null;
  };
  onUpdate: () => void;
}

export const SellerVacationMode = ({ seller, onUpdate }: SellerVacationModeProps) => {
  const [isVacation, setIsVacation] = useState(seller.is_on_vacation || false);
  const [endDate, setEndDate] = useState<Date | undefined>(
    seller.vacation_ends_at ? new Date(seller.vacation_ends_at) : undefined
  );
  const [message, setMessage] = useState(seller.vacation_message || "");
  const [saving, setSaving] = useState(false);

  const handleToggleVacation = async () => {
    setSaving(true);
    try {
      if (!isVacation) {
        // Activating vacation mode
        const { error } = await supabase
          .from("seller_profiles")
          .update({
            is_on_vacation: true,
            vacation_started_at: new Date().toISOString(),
            vacation_ends_at: endDate?.toISOString() || null,
            vacation_message: message || null,
          })
          .eq("id", seller.id);

        if (error) throw error;
        setIsVacation(true);
        toast.success("Modo férias ativado! Seus produtos estão pausados.");
      } else {
        // Deactivating vacation mode
        const { error } = await supabase
          .from("seller_profiles")
          .update({
            is_on_vacation: false,
            vacation_started_at: null,
            vacation_ends_at: null,
            vacation_message: null,
          })
          .eq("id", seller.id);

        if (error) throw error;
        setIsVacation(false);
        setEndDate(undefined);
        setMessage("");
        toast.success("Modo férias desativado! Seus produtos estão ativos novamente.");
      }
      onUpdate();
    } catch (error) {
      console.error("Error toggling vacation mode:", error);
      toast.error("Erro ao alterar modo férias");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!isVacation) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("seller_profiles")
        .update({
          vacation_ends_at: endDate?.toISOString() || null,
          vacation_message: message || null,
        })
        .eq("id", seller.id);

      if (error) throw error;
      toast.success("Configurações de férias atualizadas!");
      onUpdate();
    } catch (error) {
      console.error("Error updating vacation settings:", error);
      toast.error("Erro ao atualizar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Palmtree className="h-6 w-6 text-primary" />
          Modo Férias
        </h2>
        <p className="text-muted-foreground">
          Pause suas vendas temporariamente mantendo sua reputação intacta
        </p>
      </div>

      <Card className={cn(
        "border-2 transition-colors",
        isVacation ? "border-yellow-500/50 bg-yellow-500/5" : "border-border"
      )}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isVacation ? (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              Status: {isVacation ? "Em Férias" : "Ativo"}
            </span>
            <div className="flex items-center gap-2">
              <Label htmlFor="vacation-toggle" className="text-sm font-normal">
                {isVacation ? "Desativar" : "Ativar"}
              </Label>
              <Switch
                id="vacation-toggle"
                checked={isVacation}
                onCheckedChange={handleToggleVacation}
                disabled={saving}
              />
            </div>
          </CardTitle>
          <CardDescription>
            {isVacation
              ? "Seus produtos estão invisíveis para compradores. Sua reputação e estatísticas estão preservadas."
              : "Seus produtos estão visíveis e disponíveis para compra."}
          </CardDescription>
        </CardHeader>
      </Card>

      {isVacation && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações de Férias</CardTitle>
            <CardDescription>
              Configure a data de retorno e mensagem para clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Data de Retorno (opcional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP", { locale: ptBR }) : "Selecione uma data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Seus produtos serão automaticamente reativados nesta data
              </p>
            </div>

            <div className="space-y-2">
              <Label>Mensagem para Clientes (opcional)</Label>
              <Textarea
                placeholder="Ex: Estou de férias até 15/01. Retorno em breve!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Esta mensagem aparecerá no seu perfil público
              </p>
            </div>

            <Button onClick={handleUpdateSettings} disabled={saving} className="w-full">
              Salvar Configurações
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>O que acontece no modo férias?</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Seus produtos ficam invisíveis na loja (não podem ser comprados)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Sua reputação, avaliações e estatísticas permanecem intactas
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Você mantém sua posição no ranking
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Pedidos existentes continuam funcionando normalmente
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              Você pode reativar a qualquer momento
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
