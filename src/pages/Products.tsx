import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { SellerProductCard } from "@/components/SellerProductCard";
import { Product } from "@/types/product";
import { fetchProducts } from "@/lib/googleSheets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, SlidersHorizontal, ArrowUpDown, Store, Users } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type SortOption = "name" | "price-asc" | "price-desc" | "stock" | "likes";
type SourceFilter = "all" | "store" | "sellers";

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
  seller_name: string;
  slug?: string | null;
}

interface CombinedProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  stock: number;
  source: "store" | "seller";
  likes_count?: number;
  seller_id?: string;
  seller_name?: string;
  slug?: string | null;
}

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<CombinedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<CombinedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>(["all"]);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

  // Load all products from both sources
  const loadAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch store products
      const storeData = await fetchProducts();
      const storeProducts: CombinedProduct[] = storeData.map((p) => ({
        ...p,
        source: "store" as const,
      }));

      // Fetch seller products with seller names
      const { data: sellerProductsData } = await supabase
        .from("seller_products")
        .select("id, name, description, price, category, image_url, stock, likes_count, seller_id, slug")
        .eq("is_active", true);

      let sellerProducts: CombinedProduct[] = [];

      if (sellerProductsData && sellerProductsData.length > 0) {
        // Get seller names
        const sellerIds = [...new Set(sellerProductsData.map((p) => p.seller_id))];
        const { data: sellers } = await supabase
          .from("seller_profiles")
          .select("id, full_name")
          .in("id", sellerIds)
          .eq("is_approved", true)
          .eq("is_suspended", false);

        const sellerMap = new Map(sellers?.map((s) => [s.id, s.full_name]) || []);

        sellerProducts = sellerProductsData
          .filter((p) => sellerMap.has(p.seller_id))
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || "",
            price: p.price,
            category: p.category || "Outros",
            imageUrl: p.image_url || "",
            stock: p.stock,
            source: "seller" as const,
            likes_count: p.likes_count,
            seller_id: p.seller_id,
            seller_name: sellerMap.get(p.seller_id) || "Vendedor",
            slug: p.slug,
          }));
      }

      const combined = [...storeProducts, ...sellerProducts];
      setAllProducts(combined);

      // Extract unique categories
      const categorySet = new Set(combined.map((p) => p.category).filter(Boolean));
      const uniqueCategories: string[] = ["all", ...Array.from(categorySet)];
      setCategories(uniqueCategories);

      // Set max price
      const max = Math.max(...combined.map((p) => p.price), 100);
      setMaxPrice(max);
      setPriceRange([0, max]);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  }, []);

  // Filter and sort products locally
  const filterProducts = useCallback(
    (search: string, category: string, sort: SortOption, prices: [number, number], source: SourceFilter) => {
      let filtered = allProducts;

      // Apply source filter
      if (source !== "all") {
        filtered = filtered.filter((p) => (source === "store" ? p.source === "store" : p.source === "seller"));
      }

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filtered = filtered.filter(
          (product) =>
            product.name.toLowerCase().includes(searchLower) ||
            product.description.toLowerCase().includes(searchLower) ||
            product.category.toLowerCase().includes(searchLower)
        );
      }

      // Apply category filter
      if (category !== "all") {
        filtered = filtered.filter((product) => product.category === category);
      }

      // Apply price filter
      filtered = filtered.filter((product) => product.price >= prices[0] && product.price <= prices[1]);

      // Apply sorting
      filtered = [...filtered].sort((a, b) => {
        switch (sort) {
          case "price-asc":
            return a.price - b.price;
          case "price-desc":
            return b.price - a.price;
          case "stock":
            return b.stock - a.stock;
          case "likes":
            return (b.likes_count || 0) - (a.likes_count || 0);
          case "name":
          default:
            return a.name.localeCompare(b.name);
        }
      });

      setProducts(filtered);
    },
    [allProducts]
  );

  // Apply filters when search, category, sort, price, or source changes
  useEffect(() => {
    if (allProducts.length > 0) {
      filterProducts(searchQuery, selectedCategory, sortBy, priceRange, sourceFilter);
    }
  }, [searchQuery, selectedCategory, sortBy, priceRange, sourceFilter, allProducts, filterProducts]);

  // Initial load and handle URL search params + realtime updates
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    if (urlSearch) {
      setSearchQuery(urlSearch);
    }

    loadAllProducts();

    // Subscribe to realtime changes for both tables
    const storeChannel = supabase
      .channel("products-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        loadAllProducts();
      })
      .subscribe();

    const sellerChannel = supabase
      .channel("seller-products-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_products" }, () => {
        loadAllProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(storeChannel);
      supabase.removeChannel(sellerChannel);
    };
  }, [searchParams, loadAllProducts]);

  const storeCount = allProducts.filter((p) => p.source === "store").length;
  const sellerCount = allProducts.filter((p) => p.source === "seller").length;

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Catálogo de Jogos"
        description="Explore nossa coleção completa de jogos digitais. Encontre os melhores preços em keys de jogos para PC, PlayStation, Xbox e mais."
      />
      <Header />
      <main className="flex-1 py-12">
        <div className="container">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">
              Todos os <span className="gradient-text">Produtos</span>
            </h1>
            <p className="text-muted-foreground">Explore nosso catálogo completo de jogos e escolha o seu favorito</p>
          </div>

          <div className="flex flex-col gap-4 mb-8">
            {/* Source Filter Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
              <Button
                variant={sourceFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("all")}
                className="gap-2"
              >
                Todos ({storeCount + sellerCount})
              </Button>
              <Button
                variant={sourceFilter === "store" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("store")}
                className="gap-2"
              >
                <Store className="h-4 w-4" />
                Loja ({storeCount})
              </Button>
              <Button
                variant={sourceFilter === "sellers" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("sellers")}
                className="gap-2"
              >
                <Users className="h-4 w-4" />
                Vendedores ({sellerCount})
              </Button>
            </div>

            {/* Search and Sort Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por nome ou descrição..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                    <SelectItem value="price-asc">Menor Preço</SelectItem>
                    <SelectItem value="price-desc">Maior Preço</SelectItem>
                    <SelectItem value="stock">Mais Populares</SelectItem>
                    <SelectItem value="likes">Mais Curtidos</SelectItem>
                  </SelectContent>
                </Select>

                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filtros</SheetTitle>
                      <SheetDescription>Refine sua busca com os filtros abaixo</SheetDescription>
                    </SheetHeader>
                    <div className="space-y-6 mt-6">
                      <div className="space-y-4">
                        <Label>Faixa de Preço</Label>
                        <div className="pt-4">
                          <Slider
                            value={priceRange}
                            min={0}
                            max={maxPrice}
                            step={10}
                            onValueChange={(value) => setPriceRange(value as [number, number])}
                          />
                        </div>
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>R$ {priceRange[0].toFixed(0)}</span>
                          <span>R$ {priceRange[1].toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category === "all" ? "Todos" : category}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-gaming h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">Nenhum produto encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setPriceRange([0, maxPrice]);
                  setSourceFilter("all");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{products.length} produto(s) encontrado(s)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) =>
                  product.source === "store" ? (
                    <ProductCard
                      key={`store-${product.id}`}
                      product={{
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        category: product.category,
                        imageUrl: product.imageUrl,
                        stock: product.stock,
                      }}
                    />
                  ) : (
                  <SellerProductCard
                      key={`seller-${product.id}`}
                      product={{
                        id: product.id,
                        name: product.name,
                        description: product.description,
                        price: product.price,
                        category: product.category,
                        image_url: product.imageUrl,
                        stock: product.stock,
                        likes_count: product.likes_count || 0,
                        seller_id: product.seller_id || "",
                        seller_name: product.seller_name || "Vendedor",
                        slug: product.slug,
                      }}
                    />
                  )
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
