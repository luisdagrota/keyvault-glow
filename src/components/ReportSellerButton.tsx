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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReportSellerButtonProps {
  orderId: string;
  sellerId: string;
  sellerName: string;
  productName: string;
}

export const ReportSellerButton = ({
  orderId,
  sellerId,
  sellerName,
  productName,
}: ReportSellerButtonProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasReported, setHasReported] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("Descreva o motivo da denúncia");
      return;
    }

    if (reason.trim().length < 20) {
      toast.error("A denúncia deve ter pelo menos 20 caracteres");
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
        .from("seller_reports")
        .select("id")
        .eq("order_id", orderId)
        .eq("reporter_id", user.id)
        .maybeSingle();

      if (existing) {
        toast.error("Você já denunciou este pedido");
        setHasReported(true);
        setOpen(false);
        return;
      }

      const { error } = await supabase.from("seller_reports").insert({
        order_id: orderId,
        seller_id: sellerId,
        reporter_id: user.id,
        reason: reason.trim(),
      });

      if (error) throw error;

      toast.success("Denúncia enviada com sucesso! Nossa equipe irá analisar.");
      setHasReported(true);
      setOpen(false);
      setReason("");
    } catch (error: any) {
      console.error("Error submitting report:", error);
      toast.error("Erro ao enviar denúncia");
    } finally {
      setSubmitting(false);
    }
  };

  if (hasReported) {
    return (
      <Button variant="outline" size="sm" disabled className="text-muted-foreground">
        <Flag className="h-4 w-4 mr-1" />
        Denunciado
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive border-destructive/50 hover:bg-destructive/10">
          <Flag className="h-4 w-4 mr-1" />
          Denunciar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Denunciar Vendedor
          </DialogTitle>
          <DialogDescription>
            Denunciar <strong>{sellerName}</strong> por problemas com o pedido de <strong>{productName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-400">⚠️ Atenção</p>
            <p className="text-muted-foreground mt-1">
              Denúncias falsas podem resultar em penalidades para sua conta. 
              Denuncie apenas se o vendedor realmente não entregou o produto.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Descreva o problema (mínimo 20 caracteres)
            </label>
            <Textarea
              placeholder="Explique o que aconteceu... Ex: O vendedor não entregou o produto após 24 horas do pagamento aprovado."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
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
            disabled={submitting || reason.trim().length < 20}
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
