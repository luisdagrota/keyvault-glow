import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, Star, Calendar, Heart, Package, Users, ImageIcon } from "lucide-react";
import { LikeButton } from "@/components/LikeButton";
import { SellerBadges, calculateSellerBadges, SELLER_BADGES } from "@/components/seller/SellerBadges";
import { SEOHead } from "@/components/SEOHead";
import { FollowButton } from "@/components/FollowButton";

interface SellerData {
  id: string;
  full_name: string;
  total_sales: number;
  average_rating: number;
  created_at: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
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
  const [followerCount, setFollowerCount] = useState(0);

  useEffect(() => {
    const fetchSellerData = async () => {
      if (!id) return;

      // Fetch seller profile with new fields
      const { data: sellerData, error: sellerError } = await supabase
        .from("seller_profiles")
        .select("id, full_name, total_sales, average_rating, created_at, user_id, banner_url, bio")
        .eq("id", id)
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .single();

      if (sellerError || !sellerData) {
        console.error("Error fetching seller:", sellerError);
        navigate("/");
        return;
      }

      // Fetch avatar from profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", sellerData.user_id)
        .single();

      setSeller({
        ...sellerData,
        avatar_url: profile?.avatar_url || null,
      });

      // Fetch follower count
      const { count } = await supabase
        .from("seller_followers")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", id);

      setFollowerCount(count || 0);

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
        description={seller.bio || `Perfil do vendedor ${seller.full_name}. ${seller.total_sales} vendas realizadas com avaliação média de ${seller.average_rating.toFixed(1)} estrelas.`}
      />
      <Header />
      <main className="min-h-screen bg-background">
        {/* Banner Section */}
        <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
          {seller.banner_url ? (
            <img
              src={seller.banner_url}
              alt={`Banner de ${seller.full_name}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background relative overflow-hidden">
              {/* Animated gradient background */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 animate-pulse" />
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>

        <div className="container px-4 -mt-20 relative z-10">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Profile Header Card */}
            <Card className="overflow-hidden backdrop-blur-sm bg-card/95">
              <CardContent className="pt-0">
                <div className="flex flex-col items-center text-center md:flex-row md:items-end md:text-left gap-6 -mt-16 md:-mt-12">
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-32 w-32 md:h-36 md:w-36 border-4 border-background shadow-2xl ring-4 ring-primary/20">
                      <AvatarImage src={seller.avatar_url || ""} alt={seller.full_name} />
                      <AvatarFallback className="text-3xl font-bold bg-primary text-primary-foreground">
                        {seller.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Badges overlay on avatar */}
                    {badges.length > 0 && (
                      <div className="absolute -bottom-2 -right-2">
                        <SellerBadges badges={badges.slice(0, 1)} size="md" />
                      </div>
                    )}
                  </div>

                  {/* Info Section */}
                  <div className="flex-1 pb-4 md:pb-6">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">{seller.full_name}</h1>
                    
                    {/* Bio */}
                    {seller.bio && (
                      <p className="text-muted-foreground mb-3 max-w-xl">
                        {seller.bio}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Vendedor há {daysSinceJoined} dias
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {followerCount} seguidores
                      </span>
                    </div>
                  </div>

                  {/* Stats & Follow Button */}
                  <div className="flex flex-col items-center gap-4 pb-4 md:pb-6">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold">{seller.total_sales}</div>
                        <div className="text-xs text-muted-foreground">Vendas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-1">
                          {seller.average_rating.toFixed(1)}
                          <Star className="h-5 w-5 md:h-6 md:w-6 fill-yellow-400 text-yellow-400" />
                        </div>
                        <div className="text-xs text-muted-foreground">Avaliação</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold flex items-center justify-center gap-1">
                          {totalLikes}
                          <Heart className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
                        </div>
                        <div className="text-xs text-muted-foreground">Curtidas</div>
                      </div>
                    </div>
                    
                    <FollowButton sellerId={seller.id} showCount={false} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Badges Section */}
            {badges.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">🏆 Conquistas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {badges.map((badgeId) => {
                      const badge = SELLER_BADGES[badgeId];
                      if (!badge) return null;
                      const Icon = badge.icon;
                      
                      return (
                        <div 
                          key={badgeId} 
                          className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <SellerBadges badges={[badgeId]} size="lg" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{badge.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{badge.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Products Section */}
            <Card className="mb-12">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Anúncios Ativos ({products.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {products.length === 0 ? (
                  <div className="text-center py-12">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Este vendedor não possui produtos ativos no momento.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                      <Card
                        key={product.id}
                        className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
                        onClick={() => navigate(`/seller-product/${product.id}`)}
                      >
                        <div className="aspect-video bg-muted relative overflow-hidden">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                          {product.stock > 0 && product.stock <= 5 && (
                            <Badge variant="secondary" className="absolute top-2 right-2">
                              Últimas {product.stock}!
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-semibold truncate mb-2">{product.name}</h3>
                          <div className="flex items-center justify-between">
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
        </div>
      </main>
      <Footer />
    </>
  );
};

export default SellerProfile;
