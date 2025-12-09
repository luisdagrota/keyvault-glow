import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Flag, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportProductButtonProps {
  productId: string;
  sellerId: string;
  productName: string;
  sellerName: string;
  variant?: "default" | "icon";
}

const REPORT_TYPES = [
  { id: "scam", label: "Golpe / Fraude", description: "O produto parece ser uma tentativa de fraude" },
  { id: "fake", label: "Produto Falso", description: "O produto não é o que anuncia" },
  { id: "inappropriate", label: "Conteúdo Impróprio", description: "Conteúdo ofensivo ou ilegal" },
  { id: "spam", label: "Spam / Duplicado", description: "Anúncio repetido ou promocional" },
  { id: "other", label: "Outro", description: "Outro motivo não listado" },
];

export const ReportProductButton = ({
  productId,
  sellerId,
  productName,
  sellerName,
  variant = "default",
}: ReportProductButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reportType, setReportType] = useState("inappropriate");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Descreva o motivo da denúncia");
      return;
    }

    if (reason.trim().length < 10) {
      toast.error("A descrição deve ter pelo menos 10 caracteres");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado para fazer uma denúncia");
        return;
      }

      // Check if already reported
      const { data: existing } = await supabase
        .from("product_reports")
        .select("id")
        .eq("product_id", productId)
        .eq("reporter_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("Você já denunciou este produto");
        setHasReported(true);
        setOpen(false);
        return;
      }

      const { error } = await supabase.from("product_reports").insert({
        product_id: productId,
        seller_id: sellerId,
        reporter_id: user.id,
        report_type: reportType,
        reason: reason.trim(),
      });

      if (error) throw error;

      toast.success("Denúncia enviada! Nossa equipe irá analisar.");
      setHasReported(true);
      setOpen(false);
      setReason("");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      if (error.code === '23505') {
        toast.error("Você já denunciou este produto");
        setHasReported(true);
      } else {
        toast.error("Erro ao enviar denúncia");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (hasReported) {
    return variant === "icon" ? (
      <Button variant="ghost" size="icon" disabled className="text-muted-foreground">
        <Flag className="h-4 w-4" />
      </Button>
    ) : (
      <Button variant="outline" size="sm" disabled className="text-muted-foreground">
        <Flag className="h-4 w-4 mr-1" />
        Denunciado
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "icon" ? (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-muted-foreground hover:text-destructive"
            title="Denunciar anúncio"
          >
            <Flag className="h-4 w-4" />
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive border-destructive/50 hover:bg-destructive/10"
          >
            <Flag className="h-4 w-4 mr-1" />
            Denunciar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Denunciar Anúncio
          </DialogTitle>
          <DialogDescription>
            Denunciar "{productName}" do vendedor <strong>{sellerName}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">⚠️ Atenção</p>
            <p className="text-muted-foreground mt-1">
              Denúncias falsas podem resultar em penalidades para sua conta.
              Denuncie apenas conteúdos que violem nossas regras.
            </p>
          </div>

          {/* Report Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Tipo de denúncia</Label>
            <RadioGroup value={reportType} onValueChange={setReportType} className="space-y-2">
              {REPORT_TYPES.map((type) => (
                <div key={type.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={type.id} id={type.id} className="mt-0.5" />
                  <Label htmlFor={type.id} className="cursor-pointer flex-1">
                    <span className="font-medium block">{type.label}</span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Reason Description */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Descreva o problema (mínimo 10 caracteres)
            </label>
            <Textarea
              placeholder="Explique o que está errado com este anúncio..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {reason.length}/500 caracteres
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || reason.trim().length < 10}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Flag className="mr-2 h-4 w-4" />
                Enviar Denúncia
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
