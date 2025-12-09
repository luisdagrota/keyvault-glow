import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface FollowButtonProps {
  sellerId: string;
  size?: "sm" | "default" | "lg";
  showCount?: boolean;
}

export function FollowButton({ sellerId, size = "default", showCount = true }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkFollowStatus();
    loadFollowerCount();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`followers-${sellerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'seller_followers',
          filter: `seller_id=eq.${sellerId}`
        },
        () => {
          loadFollowerCount();
          checkFollowStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerId]);

  const checkFollowStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
    
    if (!user) return;

    const { data } = await supabase
      .from('seller_followers')
      .select('id')
      .eq('seller_id', sellerId)
      .eq('follower_id', user.id)
      .maybeSingle();

    setIsFollowing(!!data);
  };

  const loadFollowerCount = async () => {
    const { count } = await supabase
      .from('seller_followers')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    setFollowerCount(count || 0);
  };

  const handleFollow = async () => {
    if (!userId) {
      toast.error("Faça login para seguir vendedores");
      navigate("/auth");
      return;
    }

    setLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from('seller_followers')
        .delete()
        .eq('seller_id', sellerId)
        .eq('follower_id', userId);

      if (error) {
        toast.error("Erro ao deixar de seguir");
      } else {
        setIsFollowing(false);
        setFollowerCount(prev => Math.max(0, prev - 1));
        toast.success("Deixou de seguir");
      }
    } else {
      const { error } = await supabase
        .from('seller_followers')
        .insert({
          seller_id: sellerId,
          follower_id: userId
        });

      if (error) {
        toast.error("Erro ao seguir");
      } else {
        setIsFollowing(true);
        setFollowerCount(prev => prev + 1);
        toast.success("Seguindo vendedor!");
      }
    }

    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isFollowing ? "outline" : "default"}
        size={size}
        onClick={handleFollow}
        disabled={loading}
        className="gap-2"
      >
        {isFollowing ? (
          <>
            <UserMinus className="h-4 w-4" />
            Seguindo
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Seguir
          </>
        )}
      </Button>
      {showCount && (
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {followerCount}
        </span>
      )}
    </div>
  );
}
