import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Heart } from "lucide-react";

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  slug: string | null;
  likes_count: number;
  tags: string[] | null;
}

interface RecommendedProductsProps {
  currentProductId: string;
  category?: string | null;
  tags?: string[] | null;
  limit?: number;
}

export function RecommendedProducts({ 
  currentProductId, 
  category, 
  tags,
  limit = 4 
}: RecommendedProductsProps) {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendedProducts();
  }, [currentProductId, category, tags]);

  const loadRecommendedProducts = async () => {
    try {
      // Strategy: Get products by same category, similar tags, or most popular
      let query = supabase
        .from("seller_products")
        .select("id, name, price, image_url, category, slug, likes_count, tags")
        .eq("is_active", true)
        .neq("id", currentProductId)
        .gt("stock", 0);

      // Prioritize same category
      if (category) {
        query = query.eq("category", category);
      }

      const { data: categoryProducts, error: catError } = await query
        .order("likes_count", { ascending: false })
        .limit(limit);

      if (catError) throw catError;

      // If not enough products from same category, fetch popular ones
      if (!categoryProducts || categoryProducts.length < limit) {
        const existingIds = categoryProducts?.map(p => p.id) || [];
        existingIds.push(currentProductId);

        const { data: popularProducts } = await supabase
          .from("seller_products")
          .select("id, name, price, image_url, category, slug, likes_count, tags")
          .eq("is_active", true)
          .gt("stock", 0)
          .not("id", "in", `(${existingIds.join(",")})`)
          .order("likes_count", { ascending: false })
          .limit(limit - (categoryProducts?.length || 0));

        const combined = [...(categoryProducts || []), ...(popularProducts || [])];
        setProducts(combined.slice(0, limit));
      } else {
        setProducts(categoryProducts);
      }
    } catch (error) {
      console.error("Error loading recommended products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold">Produtos Recomendados</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-muted rounded-lg mb-2" />
              <div className="h-4 bg-muted rounded w-3/4 mb-1" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <h3 className="text-xl font-bold">Produtos Recomendados</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <Link 
            key={product.id} 
            to={product.slug ? `/produto/${product.slug}` : `/seller-product/${product.id}`}
            className="group"
          >
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/50">
              <div className="relative aspect-video bg-muted">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                )}
                {product.category && (
                  <Badge 
                    variant="secondary" 
                    className="absolute top-2 left-2 text-xs bg-background/80 backdrop-blur-sm"
                  >
                    {product.category}
                  </Badge>
                )}
              </div>
              <CardContent className="p-3">
                <h4 className="font-medium text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-primary font-bold">
                    R$ {product.price.toFixed(2)}
                  </span>
                  {product.likes_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3" />
                      {product.likes_count}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
