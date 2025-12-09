import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Shield, Zap, ArrowLeft, Package, User } from "lucide-react";
import { toast } from "sonner";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ProductReviews } from "@/components/ProductReviews";
import { ReviewForm } from "@/components/ReviewForm";
import { SEOHead } from "@/components/SEOHead";
import { LikeButton } from "@/components/LikeButton";
import { Product } from "@/types/product";

interface SellerProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  image_url: string | null;
  stock: number;
  likes_count: number;
  seller_id: string;
  seller_profiles: {
    id: string;
    full_name: string;
    average_rating: number;
    total_sales: number;
  } | null;
}

export default function SellerProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [product, setProduct] = useState<SellerProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const { data, error } = await supabase
        .from("seller_products")
        .select(`
          *,
          seller_profiles (
            id,
            full_name,
            average_rating,
            total_sales
          )
        `)
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      console.error("Error loading product:", error);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      setCheckoutOpen(true);
    }
  };

  // Convert to Product type for CheckoutModal
  const productForCheckout: Product | null = product ? {
    id: product.id,
    name: product.name,
    description: product.description || "",
    price: product.price,
    category: product.category || "Outros",
    imageUrl: product.image_url || "",
    stock: product.stock,
    sellerId: product.seller_id,
  } : null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container">
            <div className="animate-pulse space-y-6">
              <div className="h-96 bg-muted rounded-lg" />
              <div className="h-8 bg-muted rounded w-1/2" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12">
          <div className="container text-center">
            <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
            <Link to="/products">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Voltar para produtos
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const isOutOfStock = product.stock === 0;
  const seoDescription = product.description 
    ? (product.description.length > 155 ? product.description.substring(0, 155) + "..." : product.description)
    : `${product.name} - Compre agora na GameKeys Store`;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title={product.name}
        description={seoDescription}
        image={product.image_url || ""}
        type="product"
        price={product.price}
        url={window.location.href}
      />
      <Header />
      <main className="flex-1 py-12">
        <div className="container">
          <Link to="/products">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Package className="h-24 w-24 text-muted-foreground/30" />
                  </div>
                )}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">ESGOTADO</span>
                  </div>
                )}
                <Badge variant="outline" className="absolute top-3 left-3 bg-background/80">
                  Vendedor
                </Badge>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  {product.category || "Outros"}
                </Badge>
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              </div>

              {/* Seller info */}
              {product.seller_profiles && (
                <Link
                  to={`/seller/${product.seller_profiles.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{product.seller_profiles.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      ⭐ {product.seller_profiles.average_rating.toFixed(1)} • {product.seller_profiles.total_sales} vendas
                    </p>
                  </div>
                </Link>
              )}

              <div className="flex items-center gap-4">
                <span className="text-5xl font-bold text-primary">
                  R$ {product.price.toFixed(2)}
                </span>
                <LikeButton
                  productId={product.id}
                  initialLikesCount={product.likes_count}
                />
              </div>

              {!isOutOfStock && (
                <div className="flex items-center gap-2 text-success">
                  <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
                  <span className="font-medium">Em estoque • {product.stock} unidades disponíveis</span>
                </div>
              )}

              {product.stock > 0 && product.stock < 5 && (
                <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
                  <p className="text-warning font-medium">
                    ⚠️ Últimas unidades! Apenas {product.stock} restantes
                  </p>
                </div>
              )}

              <div className="space-y-4">
                <h2 className="text-xl font-bold">Descrição</h2>
                <div className="p-4 rounded-lg bg-muted/30 border border-border/50">
                  <div className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {product.description || "Sem descrição disponível."}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-6">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Zap className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs font-medium">Entrega Imediata</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-secondary" />
                  <p className="text-xs font-medium">100% Seguro</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <Package className="h-6 w-6 mx-auto mb-2 text-accent" />
                  <p className="text-xs font-medium">Garantia Total</p>
                </div>
              </div>

              <Button
                size="xl"
                variant={isOutOfStock ? "outline" : "hero"}
                disabled={isOutOfStock}
                onClick={handleBuyNow}
                className="w-full"
              >
                {isOutOfStock ? (
                  <>
                    <Package className="h-5 w-5" />
                    Produto Esgotado
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5" />
                    Comprar Agora
                  </>
                )}
              </Button>
              
              {productForCheckout && (
                <CheckoutModal
                  product={productForCheckout}
                  open={checkoutOpen}
                  onOpenChange={setCheckoutOpen}
                />
              )}

              <div className="border-t border-border pt-6 space-y-4">
                <h3 className="font-bold">Dúvidas Frequentes</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Como funciona a entrega?</p>
                    <p className="text-muted-foreground">
                      Após a confirmação do pagamento, o vendedor entrará em contato para entregar o produto.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Posso pedir reembolso?</p>
                    <p className="text-muted-foreground">
                      Sim, entre em contato com o suporte em caso de problemas com o produto.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de avaliações */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ProductReviews productId={id || ""} />
            </div>
            {orderId && (
              <div>
                <ReviewForm 
                  productId={id || ""} 
                  orderId={orderId}
                />
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
