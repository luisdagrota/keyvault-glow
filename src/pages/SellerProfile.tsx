import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Calendar, Heart, Package } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { SellerBadges, calculateSellerBadges, SELLER_BADGES } from "@/components/seller/SellerBadges";
import { SEOHead } from "@/components/SEOHead";

interface SellerData {
  id: string;
  full_name: string;
  total_sales: number;
  average_rating: number;
  created_at: string;
}

interface SellerProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  likes_count: number;
  stock: number;
}

const SellerProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerData | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<number | undefined>();
  const [totalLikes, setTotalLikes] = useState(0);
  const [isTopLiked, setIsTopLiked] = useState(false);

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!id) return;

      // Fetch seller profile
      const { data: sellerData, error: sellerError } = await supabase
        .from("seller_profiles")
        .select("id, full_name, total_sales, average_rating, created_at")
        .eq("id", id)
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .single();

      if (sellerError || !sellerData) {
        console.error("Error fetching seller:", sellerError);
        navigate("/");
        return;
      }

      setSeller(sellerData);

      // Fetch seller products
      const { data: productsData } = await supabase
        .from("seller_products")
        .select("id, name, price, image_url, likes_count, stock")
        .eq("seller_id", id)
        .eq("is_active", true)
        .order("likes_count", { ascending: false });

      setProducts(productsData || []);

      // Calculate total likes
      const likes = productsData?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0;
      setTotalLikes(likes);

      // Get ranking
      const { data: allSellers } = await supabase
        .from("seller_profiles")
        .select("id, total_sales")
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .order("total_sales", { ascending: false });

      if (allSellers) {
        const position = allSellers.findIndex((s) => s.id === id) + 1;
        if (position <= 3) {
          setRanking(position);
        }

        // Check if top liked
        const sellersWithLikes = await Promise.all(
          allSellers.map(async (s) => {
            const { data: prods } = await supabase
              .from("seller_products")
              .select("likes_count")
              .eq("seller_id", s.id);
            return {
              id: s.id,
              likes: prods?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0,
            };
          })
        );

        const maxLikes = Math.max(...sellersWithLikes.map((s) => s.likes));
        setIsTopLiked(likes === maxLikes && likes > 0);
      }

      setLoading(false);
    };

    fetchSellerData();
  }, [id, navigate]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (!seller) {
    return null;
  }

  const badges = calculateSellerBadges(
    { ...seller, likes_count: totalLikes },
    ranking,
    isTopLiked
  );

  const memberSince = new Date(seller.created_at);
  const daysSinceJoined = Math.floor(
    (new Date().getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      <SEOHead
        title={`${seller.full_name} | Vendedor GameKeys`}
        description={`Perfil do vendedor ${seller.full_name}. ${seller.total_sales} vendas realizadas com avaliação média de ${seller.average_rating.toFixed(1)} estrelas.`}
      />
      <Header />
      <main className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <Card className="overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20" />
            <CardContent className="relative pt-0">
              <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
                    {seller.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 text-center md:text-left pb-4">
                  <h1 className="text-2xl font-bold">{seller.full_name}</h1>
                  <p className="text-muted-foreground flex items-center justify-center md:justify-start gap-1 mt-1">
                    <Calendar className="h-4 w-4" />
                    Vendedor há {daysSinceJoined} dias
                  </p>
                </div>

                <div className="flex items-center gap-4 pb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{seller.total_sales}</div>
                    <div className="text-xs text-muted-foreground">Vendas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      {seller.average_rating.toFixed(1)}
                      <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="text-xs text-muted-foreground">Avaliação</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold flex items-center justify-center gap-1">
                      {totalLikes}
                      <Heart className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="text-xs text-muted-foreground">Curtidas</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Badges Section */}
          {badges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Conquistas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {badges.map((badgeId) => {
                    const badge = SELLER_BADGES[badgeId];
                    if (!badge) return null;
                    return (
                      <div key={badgeId} className="flex items-center gap-3">
                        <SellerBadges badges={[badgeId]} size="lg" />
                        <div>
                          <p className="font-semibold">{badge.name}</p>
                          <p className="text-sm text-muted-foreground">{badge.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Anúncios Ativos ({products.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Este vendedor não possui produtos ativos no momento.
                </p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product) => (
                    <Card
                      key={product.id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => navigate(`/seller-product/${product.id}`)}
                    >
                      <div className="aspect-video bg-muted relative">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        {product.stock === 0 && (
                          <Badge variant="destructive" className="absolute top-2 right-2">
                            Esgotado
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold truncate">{product.name}</h3>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-bold text-primary">
                            R$ {product.price.toFixed(2)}
                          </span>
                          <LikeButton
                            productId={product.id}
                            initialLikesCount={product.likes_count}
                            size="sm"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SellerProfile;
