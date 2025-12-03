import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  productId: string;
  initialLikesCount: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  className?: string;
}

export function LikeButton({
  productId,
  initialLikesCount,
  size = "md",
  showCount = true,
  className,
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        // Check if user already liked this product
        const { data } = await supabase
          .from("user_product_likes")
          .select("id")
          .eq("user_id", session.user.id)
          .eq("product_id", productId)
          .maybeSingle();
        
        setIsLiked(!!data);
      }
    };
    checkAuth();
  }, [productId]);

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!userId) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para curtir produtos.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("user_product_likes")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);
        
        setLikesCount((prev) => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // Like
        await supabase
          .from("user_product_likes")
          .insert({ user_id: userId, product_id: productId });
        
        setLikesCount((prev) => prev + 1);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua curtida.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: "h-7 px-2 text-xs",
    md: "h-9 px-3 text-sm",
    lg: "h-11 px-4 text-base",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        sizeClasses[size],
        "gap-1.5 transition-all",
        isLiked && "text-red-500 hover:text-red-600",
        className
      )}
      onClick={handleLike}
      disabled={isLoading}
    >
      <Heart
        className={cn(
          iconSizes[size],
          "transition-all",
          isLiked && "fill-current"
        )}
      />
      {showCount && <span>{likesCount}</span>}
    </Button>
  );
}
