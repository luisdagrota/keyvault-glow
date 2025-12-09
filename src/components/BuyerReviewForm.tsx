import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BuyerReviewFormProps {
  orderId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  onReviewSubmitted?: () => void;
}

export const BuyerReviewForm = ({ 
  orderId, 
  buyerId, 
  buyerName,
  sellerId,
  onReviewSubmitted 
}: BuyerReviewFormProps) => {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('buyer_reviews')
        .insert({
          order_id: orderId,
          buyer_id: buyerId,
          seller_id: sellerId,
          rating,
          comment: comment.trim() || null
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Avaliação já existe",
            description: "Você já avaliou este cliente neste pedido.",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Avaliação enviada!",
          description: "Obrigado por avaliar o cliente.",
        });
        setIsOpen(false);
        onReviewSubmitted?.();
      }
    } catch (error) {
      console.error('Error submitting buyer review:', error);
      toast({
        title: "Erro ao enviar avaliação",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Star size={14} />
          Avaliar Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Avaliar Cliente</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              Como foi sua experiência com <strong>{buyerName}</strong>?
            </p>
            
            {/* Star Rating */}
            <div className="flex justify-center gap-1 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star 
                    size={32}
                    className={`
                      transition-colors
                      ${(hoveredRating || rating) >= star 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-muted-foreground'
                      }
                    `}
                  />
                </button>
              ))}
            </div>
            
            <p className="text-sm font-medium">
              {rating === 1 && "Muito ruim"}
              {rating === 2 && "Ruim"}
              {rating === 3 && "Regular"}
              {rating === 4 && "Bom"}
              {rating === 5 && "Excelente"}
            </p>
          </div>
          
          {/* Comment */}
          <div>
            <Textarea
              placeholder="Comentário opcional sobre o cliente..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {comment.length}/500
            </p>
          </div>
          
          {/* Tips */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">💡 Dicas para avaliar:</p>
            <ul className="text-muted-foreground text-xs space-y-1">
              <li>• Cliente respondeu rápido?</li>
              <li>• Houve algum problema durante a transação?</li>
              <li>• Cliente foi educado e respeitoso?</li>
            </ul>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
