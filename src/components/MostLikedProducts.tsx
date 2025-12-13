import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Package, TrendingUp } from "lucide-react";
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

        <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, index) => (
            <div
              key={product.id}
              className="group relative bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.25)] hover:border-primary/50 cursor-pointer"
              onClick={() => navigate(`/seller-product/${product.id}`)}
            >
              {/* Gradient glow effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/50 via-primary/30 to-red-500/50 rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500 -z-10" />
              
              {index < 3 && (
                <Badge
                  className={`absolute top-2 left-2 z-10 text-[10px] sm:text-xs px-2 py-1 shadow-lg ${
                    index === 0 
                      ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold animate-pulse" 
                      : index === 1
                      ? "bg-gradient-to-r from-gray-300 to-gray-400 text-black font-semibold"
                      : "bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold"
                  }`}
                >
                  {index === 0 ? "🏆" : index === 1 ? "🥈" : "🥉"} #{index + 1}
                </Badge>
              )}
              
              <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted via-muted/80 to-muted/50">
                    <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30" />
                  </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {product.stock === 0 && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                    <Badge variant="destructive" className="text-xs sm:text-sm px-3 py-1.5 animate-pulse">
                      ESGOTADO
                    </Badge>
                  </div>
                )}

                {product.stock > 0 && product.stock < 5 && (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-warning to-orange-500 text-warning-foreground font-medium text-[10px] sm:text-xs px-2 py-1 shadow-lg animate-pulse">
                    🔥 Últimas {product.stock}!
                  </Badge>
                )}

                {/* Shine effect on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              <div className="p-3 sm:p-4 bg-gradient-to-b from-card to-card/95">
                <h3 className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-primary transition-colors duration-300 leading-tight">
                  {product.name}
                </h3>
                <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground truncate">
                  por {product.seller_name}
                </p>
                
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    R$ {product.price.toFixed(2)}
                  </span>
                  <LikeButton
                    productId={product.id}
                    initialLikesCount={product.likes_count}
                    size="sm"
                  />
                </div>

                {product.stock > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-success">
                    <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))] animate-pulse" />
                    <span className="font-medium">Em estoque</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
