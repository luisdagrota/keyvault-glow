import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trophy, TrendingUp, Users, Star, Crown, Medal, Award, ChevronUp, Package } from "lucide-react";

interface SellerStats {
  id: string;
  full_name: string;
  total_sales: number;
  average_rating: number;
  user_id: string;
  avatar_url?: string;
}

interface RankingData {
  position: number;
  total: number;
  previousPosition?: number;
  seller: SellerStats;
}

interface CategoryRanking {
  category: string;
  position: number;
  total: number;
  sales: number;
}

interface SellerRankingProps {
  sellerId: string;
}

export const SellerRanking = ({ sellerId }: SellerRankingProps) => {
  const [loading, setLoading] = useState(true);
  const [overallRanking, setOverallRanking] = useState<RankingData | null>(null);
  const [topSellers, setTopSellers] = useState<SellerStats[]>([]);
  const [categoryRankings, setCategoryRankings] = useState<CategoryRanking[]>([]);
  const [currentSeller, setCurrentSeller] = useState<SellerStats | null>(null);

  useEffect(() => {
    fetchRankings();
  }, [sellerId]);

  const fetchRankings = async () => {
    try {
      // Fetch all approved sellers ordered by total_sales
      const { data: sellers, error: sellersError } = await supabase
        .from("seller_profiles")
        .select("id, full_name, total_sales, average_rating, user_id")
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .order("total_sales", { ascending: false });

      if (sellersError) throw sellersError;

      // Get profile avatars
      const userIds = (sellers || []).map(s => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, avatar_url")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p.avatar_url]));

      const sellersWithAvatars = (sellers || []).map(s => ({
        ...s,
        avatar_url: profileMap.get(s.user_id) || undefined
      }));

      // Find current seller position
      const currentIndex = sellersWithAvatars.findIndex(s => s.id === sellerId);
      const currentSellerData = sellersWithAvatars[currentIndex];
      
      if (currentSellerData) {
        setCurrentSeller(currentSellerData);
        setOverallRanking({
          position: currentIndex + 1,
          total: sellersWithAvatars.length,
          seller: currentSellerData
        });
      }

      // Top 10 sellers
      setTopSellers(sellersWithAvatars.slice(0, 10));

      // Fetch category rankings
      await fetchCategoryRankings(sellerId);

    } catch (error) {
      console.error("Error fetching rankings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryRankings = async (sellerId: string) => {
    try {
      // Get all products with sales count by category
      const { data: products, error } = await supabase
        .from("seller_products")
        .select("category, seller_id")
        .eq("is_active", true);

      if (error) throw error;

      // Get sales by seller
      const { data: sales } = await supabase
        .from("seller_sales")
        .select("seller_id, product_id")
        .eq("status", "approved");

      // Get products to map to categories
      const { data: allProducts } = await supabase
        .from("seller_products")
        .select("id, category, seller_id");

      // Calculate sales by category for each seller
      const categoryStats: Record<string, Record<string, number>> = {};
      
      (sales || []).forEach(sale => {
        const product = (allProducts || []).find(p => p.id === sale.product_id);
        if (product?.category) {
          if (!categoryStats[product.category]) {
            categoryStats[product.category] = {};
          }
          categoryStats[product.category][sale.seller_id] = 
            (categoryStats[product.category][sale.seller_id] || 0) + 1;
        }
      });

      // Calculate rankings for each category where seller has products
      const sellerCategories = [...new Set(
        (products || [])
          .filter(p => p.seller_id === sellerId && p.category)
          .map(p => p.category!)
      )];

      const rankings: CategoryRanking[] = sellerCategories.map(category => {
        const categorySellers = Object.entries(categoryStats[category] || {})
          .sort(([, a], [, b]) => b - a);
        
        const sellerPosition = categorySellers.findIndex(([id]) => id === sellerId);
        const sellerSales = categoryStats[category]?.[sellerId] || 0;

        return {
          category,
          position: sellerPosition >= 0 ? sellerPosition + 1 : categorySellers.length + 1,
          total: Math.max(categorySellers.length, 1),
          sales: sellerSales
        };
      });

      setCategoryRankings(rankings);
    } catch (error) {
      console.error("Error fetching category rankings:", error);
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getPositionBadgeClass = (position: number) => {
    switch (position) {
      case 1: return "bg-gradient-to-r from-yellow-400 to-yellow-600 text-black";
      case 2: return "bg-gradient-to-r from-gray-300 to-gray-500 text-black";
      case 3: return "bg-gradient-to-r from-amber-500 to-amber-700 text-white";
      default: return "bg-primary/20 text-primary";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const percentile = overallRanking 
    ? Math.round(((overallRanking.total - overallRanking.position + 1) / overallRanking.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
          Ranking de Vendedores
        </h2>
        <p className="text-muted-foreground">
          Acompanhe sua posição e compare com outros vendedores
        </p>
      </div>

      {/* Overall Position Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
          <CardHeader className="relative">
            <CardTitle className="text-lg">Sua Posição Geral</CardTitle>
          </CardHeader>
          <CardContent className="relative">
            {overallRanking ? (
              <div className="flex items-center gap-6">
                <div className={`flex items-center justify-center w-24 h-24 rounded-full ${getPositionBadgeClass(overallRanking.position)}`}>
                  <div className="text-center">
                    <div className="text-3xl font-bold">#{overallRanking.position}</div>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">De {overallRanking.total} vendedores ativos</p>
                    <p className="text-lg font-semibold">
                      Top {percentile}% dos vendedores
                    </p>
                  </div>
                  <Progress value={percentile} className="h-2" />
                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>{currentSeller?.total_sales || 0} vendas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{(currentSeller?.average_rating || 0).toFixed(1)} média</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Dados não disponíveis</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Comparação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {overallRanking && overallRanking.position > 1 && topSellers[overallRanking.position - 2] && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <ChevronUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Próximo à sua frente</span>
                </div>
                <span className="text-sm font-medium">
                  +{topSellers[overallRanking.position - 2].total_sales - (currentSeller?.total_sales || 0)} vendas
                </span>
              </div>
            )}
            {overallRanking && topSellers[0] && overallRanking.position !== 1 && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Para o 1º lugar</span>
                </div>
                <span className="text-sm font-medium">
                  +{topSellers[0].total_sales - (currentSeller?.total_sales || 0)} vendas
                </span>
              </div>
            )}
            {overallRanking?.position === 1 && (
              <div className="text-center py-4">
                <Crown className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="font-semibold">Você é o #1!</p>
                <p className="text-sm text-muted-foreground">Continue assim!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="top10" className="space-y-4">
        <TabsList>
          <TabsTrigger value="top10">Top 10 Geral</TabsTrigger>
          <TabsTrigger value="categories">Por Categoria</TabsTrigger>
        </TabsList>

        <TabsContent value="top10">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 Vendedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topSellers.map((seller, index) => (
                  <div 
                    key={seller.id}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      seller.id === sellerId 
                        ? "bg-primary/10 ring-2 ring-primary/30" 
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                  >
                    <div className="w-8 flex justify-center">
                      {getPositionIcon(index + 1)}
                    </div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={seller.avatar_url} />
                      <AvatarFallback>{seller.full_name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${seller.id === sellerId ? "text-primary" : ""}`}>
                        {seller.full_name}
                        {seller.id === sellerId && (
                          <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{seller.total_sales} vendas</span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {seller.average_rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                    {index < 3 && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold ${getPositionBadgeClass(index + 1)}`}>
                        TOP {index + 1}
                      </div>
                    )}
                  </div>
                ))}

                {/* Show current seller if not in top 10 */}
                {overallRanking && overallRanking.position > 10 && currentSeller && (
                  <>
                    <div className="flex items-center justify-center py-2">
                      <span className="text-muted-foreground text-sm">• • •</span>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 ring-2 ring-primary/30">
                      <div className="w-8 flex justify-center">
                        <span className="text-lg font-bold text-muted-foreground">#{overallRanking.position}</span>
                      </div>
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={currentSeller.avatar_url} />
                        <AvatarFallback>{currentSeller.full_name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-primary">
                          {currentSeller.full_name}
                          <Badge variant="outline" className="ml-2 text-xs">Você</Badge>
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{currentSeller.total_sales} vendas</span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {currentSeller.average_rating.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ranking por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryRankings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você ainda não tem produtos em categorias ativas.</p>
                  <p className="text-sm">Adicione produtos para aparecer nos rankings por categoria.</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {categoryRankings.map(ranking => (
                    <div 
                      key={ranking.category}
                      className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className="capitalize">
                          {ranking.category}
                        </Badge>
                        <div className={`px-2 py-1 rounded text-xs font-bold ${getPositionBadgeClass(ranking.position)}`}>
                          #{ranking.position}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Posição</span>
                          <span>{ranking.position} de {ranking.total}</span>
                        </div>
                        <Progress 
                          value={((ranking.total - ranking.position + 1) / ranking.total) * 100} 
                          className="h-2" 
                        />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Suas vendas</span>
                          <span className="font-medium">{ranking.sales}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
