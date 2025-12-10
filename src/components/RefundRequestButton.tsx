import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, RefreshCcw, Upload, X, AlertTriangle } from "lucide-react";

interface RefundRequestButtonProps {
  orderId: string;
  orderAmount: number;
  sellerId: string | null;
  paymentStatus: string;
  deliveredAt?: string;
}

const REFUND_REASONS = [
  "Produto não entregue",
  "Produto com defeito",
  "Produto diferente do anunciado",
  "Key/código inválido",
  "Conta não funciona",
  "Vendedor não responde",
  "Outro motivo",
];

const PIX_KEY_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatória" },
];

export function RefundRequestButton({
  orderId,
  orderAmount,
  sellerId,
  paymentStatus,
  deliveredAt,
}: RefundRequestButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [pixKeyType, setPixKeyType] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [proofs, setProofs] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  // Check if refund is still available (within 48h after delivery)
  const canRequestRefund = () => {
    if (paymentStatus === "approved") return true;
    if (paymentStatus === "delivered") {
      if (!deliveredAt) return true;
      const deliveryDate = new Date(deliveredAt);
      const now = new Date();
      const hoursDiff = (now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 48;
    }
    return false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + proofs.length > 5) {
      toast.error("Máximo de 5 arquivos permitidos");
      return;
    }
    setProofs([...proofs, ...files]);
  };

  const removeFile = (index: number) => {
    setProofs(proofs.filter((_, i) => i !== index));
  };

  const uploadProofs = async (): Promise<string[]> => {
    const urls: string[] = [];
    
    for (const file of proofs) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('refund-proofs')
        .upload(fileName, file);
      
      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error("Falha ao enviar arquivo: " + file.name);
      }
      
      const { data } = supabase.storage
        .from('refund-proofs')
        .getPublicUrl(fileName);
      
      urls.push(data.publicUrl);
    }
    
    return urls;
  };

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Selecione um motivo");
      return;
    }
    if (!pixKeyType || !pixKey) {
      toast.error("Informe sua chave PIX para receber o reembolso");
      return;
    }
    if (proofs.length === 0) {
      toast.error("Envie pelo menos uma prova (print, foto, vídeo)");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      // Upload proofs
      setUploading(true);
      const proofUrls = await uploadProofs();
      setUploading(false);

      // Create refund request
      const { error } = await supabase
        .from("refund_requests")
        .insert({
          order_id: orderId,
          customer_id: session.user.id,
          seller_id: sellerId,
          reason,
          description,
          proofs: proofUrls,
          customer_pix_key: pixKey,
          pix_key_type: pixKeyType,
          order_amount: orderAmount,
          status: "pending",
        });

      if (error) throw error;

      // Update order status
      await supabase
        .from("orders")
        .update({ payment_status: "refund_requested" })
        .eq("id", orderId);

      // Log the action
      await supabase
        .from("refund_logs")
        .insert({
          user_id: session.user.id,
          user_type: "customer",
          action: "refund_requested",
          details: { order_id: orderId, reason, amount: orderAmount },
        });

      toast.success("Solicitação de reembolso enviada! Aguarde a análise.");
      setOpen(false);
      
      // Reset form
      setReason("");
      setDescription("");
      setPixKey("");
      setPixKeyType("");
      setProofs([]);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Erro ao enviar solicitação");
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (!canRequestRefund()) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-amber-600 border-amber-600 hover:bg-amber-50">
          <RefreshCcw className="h-4 w-4 mr-2" />
          Solicitar Reembolso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Solicitar Reembolso
          </DialogTitle>
          <DialogDescription>
            Preencha o formulário abaixo para solicitar o reembolso do seu pedido.
            O valor será enviado para a chave PIX informada após aprovação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo do reembolso *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              placeholder="Descreva detalhadamente o problema..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Proofs */}
          <div className="space-y-2">
            <Label>Provas (obrigatório) *</Label>
            <p className="text-xs text-muted-foreground">
              Envie prints, fotos ou vídeos que comprovem o problema (máx. 5 arquivos)
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {proofs.map((file, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-destructive hover:text-destructive/80">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-sm text-primary hover:underline">
              <Upload className="h-4 w-4" />
              Adicionar arquivo
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* PIX Key Type */}
          <div className="space-y-2">
            <Label>Tipo da chave PIX *</Label>
            <RadioGroup value={pixKeyType} onValueChange={setPixKeyType} className="flex flex-wrap gap-4">
              {PIX_KEY_TYPES.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <Label htmlFor={type.value} className="cursor-pointer">{type.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* PIX Key */}
          <div className="space-y-2">
            <Label>Sua chave PIX *</Label>
            <Input
              placeholder={
                pixKeyType === "cpf" ? "000.000.000-00" :
                pixKeyType === "cnpj" ? "00.000.000/0000-00" :
                pixKeyType === "email" ? "seu@email.com" :
                pixKeyType === "phone" ? "+55 (00) 00000-0000" :
                "Cole sua chave aleatória"
              }
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>

          {/* Amount Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm">
              <strong>Valor do pedido:</strong> R$ {orderAmount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Este é o valor que será reembolsado após aprovação.
            </p>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={loading || uploading}
            className="w-full"
          >
            {loading || uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploading ? "Enviando arquivos..." : "Enviando..."}
              </>
            ) : (
              "Enviar Solicitação"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
