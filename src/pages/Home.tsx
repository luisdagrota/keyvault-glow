import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { MostLikedProducts } from "@/components/MostLikedProducts";
import { Hero } from "@/components/Hero";
import { TrustBadges } from "@/components/TrustBadges";
import { Testimonials } from "@/components/Testimonials";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { TopSellers } from "@/components/TopSellers";
import { BannerCarousel } from "@/components/BannerCarousel";
import { Product } from "@/types/product";
import { fetchProducts } from "@/lib/googleSheets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SEOHead } from "@/components/SEOHead";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();

    // Subscribe to realtime product changes
    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          console.log('Product changed, reloading...');
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const featuredProducts = products.filter(p => p.stock > 0).slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Jogos Digitais"
        description="GameKeys Store - Compre jogos digitais com os melhores preços. Keys de jogos para PC, PlayStation, Xbox e mais. Entrega instantânea e 100% seguro."
      />
      <Header />
      <main className="flex-1">
        <div className="container px-4 pt-6">
          <BannerCarousel />
        </div>
        <Hero />
        <TrustBadges />
        
        <section className="py-10 sm:py-16">
          <div className="container px-4">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                Produtos em <span className="gradient-text">Destaque</span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                Os jogos mais procurados da semana com preços especiais
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card-gaming h-64 sm:h-80 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        <TopSellers />
        <MostLikedProducts />
        <Testimonials />
      </main>
      <Footer />
    </div>
  );
}
