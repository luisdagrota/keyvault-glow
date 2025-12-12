import { useState, useEffect } from "react";
import { Star, Send, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ReviewFormProps {
  productId: string;
  orderId: string;
  onReviewSubmitted?: () => void;
}

interface ExistingReview {
  id: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
}

export function ReviewForm({ productId, orderId, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<ExistingReview | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);

  useEffect(() => {
    checkExistingReview();
  }, [productId, orderId]);

  const checkExistingReview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCheckingExisting(false);
        return;
      }

      const { data } = await supabase
        .from("product_reviews")
        .select("id, rating, comment, is_approved, created_at")
        .eq("product_id", productId)
        .eq("order_id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setExistingReview(data);
      }
    } catch (error) {
      console.error("Error checking existing review:", error);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Selecione uma avaliação de 1 a 5 estrelas");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar logado para avaliar");
        return;
      }

      const { error } = await supabase
        .from("product_reviews")
        .insert({
          product_id: productId,
          order_id: orderId,
          user_id: user.id,
          rating,
          comment: comment.trim() || null,
          is_approved: false
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("Você já avaliou este produto neste pedido");
        } else {
          toast.error("Erro ao enviar avaliação", { description: error.message });
        }
        return;
      }

      toast.success("✅ Avaliação enviada!", {
        description: "Sua avaliação será publicada após moderação"
      });
      setSubmitted(true);
      onReviewSubmitted?.();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar avaliação");
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (starRating: number) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-5 w-5 ${
            star <= starRating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted"
          }`}
        />
      ))}
    </div>
  );

  if (checkingExisting) {
    return (
      <Card className="card-gaming">
        <CardContent className="py-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-muted rounded w-1/2" />
            <div className="h-16 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se já existe uma avaliação
  if (existingReview) {
    return (
      <Card className={`card-gaming ${existingReview.is_approved ? "border-success/50" : "border-warning/50"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {existingReview.is_approved ? (
              <>
                <CheckCircle className="h-5 w-5 text-success" />
                Sua avaliação foi publicada!
              </>
            ) : (
              <>
                <Clock className="h-5 w-5 text-warning" />
                Avaliação aguardando aprovação
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Sua nota:</p>
            {renderStars(existingReview.rating)}
          </div>
          {existingReview.comment && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Seu comentário:</p>
              <p className="text-sm bg-muted/50 p-3 rounded-lg">{existingReview.comment}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Enviado em {new Date(existingReview.created_at).toLocaleDateString("pt-BR")}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (submitted) {
    return (
      <Card className="card-gaming border-success/50">
        <CardContent className="py-6 text-center">
          <div className="text-success text-4xl mb-2">✓</div>
          <p className="font-medium">Obrigado pela sua avaliação!</p>
          <p className="text-sm text-muted-foreground">
            Ela será publicada após aprovação
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-gaming">
      <CardHeader>
        <CardTitle className="text-lg">Avalie este produto</CardTitle>
        <CardDescription>
          Sua opinião ajuda outros clientes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Sua avaliação *</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= (hoveredRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted hover:text-yellow-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {rating === 0 && "Clique para avaliar"}
            {rating === 1 && "Muito ruim"}
            {rating === 2 && "Ruim"}
            {rating === 3 && "Regular"}
            {rating === 4 && "Bom"}
            {rating === 5 && "Excelente!"}
          </p>
        </div>

        <div>
          <p className="text-sm font-medium mb-2">Comentário (opcional)</p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Conte sua experiência com o produto..."
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {comment.length}/500 caracteres
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || rating === 0}
          className="w-full gap-2"
        >
          <Send className="h-4 w-4" />
          {loading ? "Enviando..." : "Enviar Avaliação"}
        </Button>
      </CardContent>
    </Card>
  );
}