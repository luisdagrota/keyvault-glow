import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, ShoppingBag, TrendingUp, Loader2 } from "lucide-react";
import { SellerBadges, calculateSellerBadges } from "@/components/seller/SellerBadges";

interface TopSeller {
  id: string;
  full_name: string;
  total_sales: number;
  average_rating: number;
  created_at: string;
  likes_count: number;
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
        .select("id, full_name, total_sales, average_rating, created_at")
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

      // Get likes count for each seller
      const sellersWithLikes = await Promise.all(
        (data || []).map(async (seller) => {
          const { data: products } = await supabase
            .from("seller_products")
            .select("likes_count")
            .eq("seller_id", seller.id);

          const totalLikes = products?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;

          return {
            ...seller,
            likes_count: totalLikes,
          };
        })
      );

      setSellers(sellersWithLikes);
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
    <section className="py-12 bg-gradient-to-b from-background to-muted/30">
      <div className="container">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            Top 5 Vendedores
          </h2>
          <p className="text-muted-foreground">
            Os melhores vendedores da nossa plataforma
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
                className={`relative overflow-hidden transition-all hover:scale-105 ${
                  ranking === 1
                    ? "border-yellow-500/50 shadow-lg shadow-yellow-500/20"
                    : ranking === 2
                    ? "border-gray-400/50"
                    : ranking === 3
                    ? "border-amber-600/50"
                    : ""
                }`}
              >
                {ranking <= 3 && (
                  <div
                    className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg ${
                      ranking === 1
                        ? "bg-yellow-500 text-yellow-950"
                        : ranking === 2
                        ? "bg-gray-400 text-gray-950"
                        : "bg-amber-600 text-amber-950"
                    }`}
                  >
                    #{ranking}
                  </div>
                )}

                <CardContent className="pt-6 text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-primary/20">
                    <AvatarFallback className="text-lg font-bold bg-primary/10">
                      {seller.full_name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <h3 className="font-semibold mb-2 truncate">{seller.full_name}</h3>

                  <div className="flex justify-center mb-3">
                    <SellerBadges badges={badges} size="sm" />
                  </div>

                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4" />
                      {seller.total_sales}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      {seller.average_rating.toFixed(1)}
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
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
