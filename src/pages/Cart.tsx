import { useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2, ShoppingBag, Package, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Cart() {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  const handleCheckout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast.error("Você precisa fazer login para finalizar a compra");
      navigate("/auth");
      return;
    }

    if (items.length === 0) {
      toast.error("Seu carrinho está vazio");
      return;
    }

    navigate("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3">
          <ShoppingBag className="h-7 w-7" />
          Meu Carrinho
          <span className="text-muted-foreground text-lg font-normal">
            ({items.length} {items.length === 1 ? "item" : "itens"})
          </span>
        </h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
            <ShoppingBag className="h-24 w-24 text-muted-foreground/30" />
            <div>
              <p className="font-medium text-xl">Seu carrinho está vazio</p>
              <p className="text-muted-foreground mt-2">
                Adicione produtos para continuar comprando
              </p>
            </div>
            <Button size="lg" onClick={() => navigate("/products")}>
              Ver Produtos
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="flex gap-4 p-4 rounded-xl bg-card border border-border"
                >
                  <div className="h-24 w-24 md:h-32 md:w-32 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col">
                    <h3 className="font-semibold text-base md:text-lg line-clamp-2">
                      {item.name}
                    </h3>
                    {item.source === "seller" && item.sellerName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Vendido por <span className="text-primary">{item.sellerName}</span>
                      </p>
                    )}
                    
                    <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-primary font-bold text-lg md:text-xl">
                        R$ {item.price.toFixed(2)}
                      </p>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= item.stock}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => navigate("/products")}
              >
                Continuar Comprando
              </Button>
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-xl p-6 sticky top-24">
                <h2 className="font-bold text-lg mb-4">Resumo do Pedido</h2>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal ({items.reduce((sum, item) => sum + item.quantity, 0)} itens)
                    </span>
                    <span>R$ {totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <Button 
                  className="w-full h-12 text-base mt-6 btn-shimmer animate-glow-pulse"
                  onClick={handleCheckout}
                >
                  Finalizar Compra
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Cupons de desconto podem ser aplicados na próxima etapa
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
