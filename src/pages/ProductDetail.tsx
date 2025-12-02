import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/types/product";
import { fetchProducts } from "@/lib/googleSheets";
import { ShoppingCart, Shield, Zap, ArrowLeft, Package } from "lucide-react";
import { toast } from "sonner";
import { CheckoutModal } from "@/components/CheckoutModal";
import { ProductReviews } from "@/components/ProductReviews";
import { ReviewForm } from "@/components/ReviewForm";

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      const products = await fetchProducts();
      const found = products.find(p => p.id === id);
      setProduct(found || null);
    } catch (error) {
      console.error("Error loading product:", error);
      toast.error("Erro ao carregar produto");
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (product) {
      setCheckoutOpen(true);
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col">
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
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-cover w-full h-full"
                />
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">ESGOTADO</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <Badge variant="secondary" className="mb-3">
                  {product.category}
                </Badge>
                <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              </div>

              <div className="flex items-baseline gap-4">
                <span className="text-5xl font-bold text-primary">
                  R$ {product.price.toFixed(2)}
                </span>
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
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
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
              
              {product && (
                <CheckoutModal
                  product={product}
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
                      Após a confirmação do pagamento, você recebe o produto instantaneamente por email.
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Posso pedir reembolso?</p>
                    <p className="text-muted-foreground">
                      Sim, oferecemos garantia total em caso de problemas com o produto.
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
