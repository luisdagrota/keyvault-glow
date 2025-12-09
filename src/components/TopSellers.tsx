import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, ShoppingBag, TrendingUp, Loader2, Users } from "lucide-react";
import { SellerBadges, calculateSellerBadges } from "@/components/seller/SellerBadges";

interface TopSeller {
  id: string;
  full_name: string;
  total_sales: number;
  average_rating: number;
  created_at: string;
  likes_count: number;
  avatar_url: string | null;
  follower_count: number;
}

export const TopSellers = () => {
  const [sellers, setSellers] = useState<TopSeller[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTopSellers = async () => {
      // Get top 5 sellers ordered by total_sales, then by average_rating
      const { data, error } = await supabase
        .from("seller_profiles")
        .select("id, full_name, total_sales, average_rating, created_at, user_id")
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .order("total_sales", { ascending: false })
        .order("average_rating", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching top sellers:", error);
        setLoading(false);
        return;
      }

      // Get likes count, avatar, and follower count for each seller
      const sellersWithData = await Promise.all(
        (data || []).map(async (seller) => {
          const [
            { data: products },
            { data: profile },
            { count: followerCount }
          ] = await Promise.all([
            supabase
              .from("seller_products")
              .select("likes_count")
              .eq("seller_id", seller.id),
            supabase
              .from("profiles")
              .select("avatar_url")
              .eq("id", seller.user_id)
              .single(),
            supabase
              .from("seller_followers")
              .select("*", { count: "exact", head: true })
              .eq("seller_id", seller.id)
          ]);

          const totalLikes = products?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;

          return {
            ...seller,
            likes_count: totalLikes,
            avatar_url: profile?.avatar_url || null,
            follower_count: followerCount || 0,
          };
        })
      );

      setSellers(sellersWithData);
      setLoading(false);
    };

    fetchTopSellers();
  }, []);

  if (loading) {
    return (
      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (sellers.length === 0) {
    return null;
  }

  // Find the seller with most likes
  const maxLikes = Math.max(...sellers.map((s) => s.likes_count));
  const topLikedSellerId = sellers.find((s) => s.likes_count === maxLikes && s.likes_count > 0)?.id;

  return (
    <section className="py-8 sm:py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="container px-4">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Top 5 Vendedores
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Os melhores vendedores da nossa plataforma
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {sellers.map((seller, index) => {
            const ranking = index + 1;
            const badges = calculateSellerBadges(
              seller,
              ranking <= 3 ? ranking : undefined,
              seller.id === topLikedSellerId
            );

            return (
              <Card
                key={seller.id}
                className={`relative overflow-hidden transition-all duration-300 hover:scale-[1.02] sm:hover:scale-105 group ${
                  ranking === 1
                    ? "border-yellow-500/50 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/30"
                    : ranking === 2
                    ? "border-gray-400/50 hover:border-gray-300"
                    : ranking === 3
                    ? "border-amber-600/50 hover:border-amber-500"
                    : "hover:border-primary/30"
                }`}
              >
                {/* Ranking Badge */}
                {ranking <= 3 && (
                  <div
                    className={`absolute top-0 right-0 px-2 sm:px-3 py-1 text-xs font-bold rounded-bl-lg z-10 ${
                      ranking === 1
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-950"
                        : ranking === 2
                        ? "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-950"
                        : "bg-gradient-to-r from-amber-500 to-orange-500 text-amber-950"
                    }`}
                  >
                    #{ranking}
                  </div>
                )}

                {/* Glow effect for top 1 */}
                {ranking === 1 && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}

                <CardContent className="pt-4 sm:pt-6 text-center">
                  <div className="relative inline-block mb-2 sm:mb-3">
                    <Avatar className="h-14 w-14 sm:h-18 sm:w-18 mx-auto border-2 border-primary/20 ring-2 ring-background">
                      <AvatarImage src={seller.avatar_url || ""} alt={seller.full_name} />
                      <AvatarFallback className="text-lg sm:text-xl font-bold bg-primary/10">
                        {seller.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Badge on avatar */}
                    {badges.length > 0 && (
                      <div className="absolute -bottom-1 -right-1">
                        <SellerBadges badges={badges.slice(0, 1)} size="sm" />
                      </div>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm sm:text-base mb-1 truncate px-2">
                    {seller.full_name}
                  </h3>

                  {/* Additional badges */}
                  {badges.length > 1 && (
                    <div className="flex justify-center mb-2">
                      <SellerBadges badges={badges.slice(1, 4)} size="sm" />
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-3 sm:gap-4 text-xs text-muted-foreground mb-3 sm:mb-4">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3 sm:h-4 sm:w-4" />
                      {seller.total_sales}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 fill-yellow-400 text-yellow-400" />
                      {seller.average_rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      {seller.follower_count}
                    </span>
                  </div>

                  <Button
                    variant={ranking === 1 ? "default" : "outline"}
                    size="sm"
                    className="w-full h-9 sm:h-10 text-sm"
                    onClick={() => navigate(`/seller/${seller.id}`)}
                  >
                    Ver Perfil
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};
