import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Package, TrendingUp } from "lucide-react";
import { LikeButton } from "./LikeButton";

interface LikedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  likes_count: number;
  stock: number;
  seller_id: string;
  seller_name: string;
}

export function MostLikedProducts() {
  const [products, setProducts] = useState<LikedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMostLiked = async () => {
      const { data: productsData } = await supabase
        .from("seller_products")
        .select("id, name, price, image_url, likes_count, stock, seller_id")
        .eq("is_active", true)
        .gt("likes_count", 0)
        .order("likes_count", { ascending: false })
        .limit(6);

      if (productsData && productsData.length > 0) {
        // Fetch seller names
        const sellerIds = [...new Set(productsData.map((p) => p.seller_id))];
        const { data: sellers } = await supabase
          .from("seller_profiles")
          .select("id, full_name")
          .in("id", sellerIds);

        const sellerMap = new Map(sellers?.map((s) => [s.id, s.full_name]) || []);

        const enrichedProducts = productsData.map((p) => ({
          ...p,
          seller_name: sellerMap.get(p.seller_id) || "Vendedor",
        }));

        setProducts(enrichedProducts);
      }
      setLoading(false);
    };

    fetchMostLiked();
  }, []);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
          <div className="p-1.5 sm:p-2 rounded-lg bg-red-500/10">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Produtos Mais Curtidos</h2>
            <p className="text-sm text-muted-foreground">
              Os favoritos da comunidade
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <Card
              key={product.id}
              className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group relative"
              onClick={() => navigate(`/seller-product/${product.id}`)}
            >
              {index < 3 && (
                <Badge
                  className="absolute top-2 left-2 z-10 text-xs"
                  variant={index === 0 ? "default" : "secondary"}
                >
                  #{index + 1} Mais Curtido
                </Badge>
              )}
              
              <div className="aspect-video bg-muted relative overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
                  </div>
                )}
                
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Badge variant="destructive">Esgotado</Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-3 sm:p-4">
                <h3 className="font-semibold text-sm sm:text-base truncate">{product.name}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">
                  por {product.seller_name}
                </p>
                
                <div className="flex items-center justify-between mt-2 sm:mt-3">
                  <span className="text-base sm:text-lg font-bold text-primary">
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
      </div>
    </section>
  );
}
