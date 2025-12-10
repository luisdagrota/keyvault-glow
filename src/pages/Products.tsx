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
import { Search, SlidersHorizontal, ArrowUpDown, Store, Users, Gamepad2, Key, UserCircle, Monitor, X, TrendingUp, Heart, Clock, DollarSign } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
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
import { ScrollArea } from "@/components/ui/scroll-area";

type SortOption = "name" | "price-asc" | "price-desc" | "popular" | "likes" | "recent" | "sold";
type SourceFilter = "all" | "store" | "sellers";

// Platform definitions with icons and keywords
const PLATFORMS = [
  { id: "steam", label: "Steam", keywords: ["steam", "valve"], icon: "🎮" },
  { id: "playstation", label: "PlayStation", keywords: ["playstation", "psn", "ps4", "ps5", "sony"], icon: "🎮" },
  { id: "xbox", label: "Xbox", keywords: ["xbox", "microsoft", "game pass"], icon: "🎮" },
  { id: "nintendo", label: "Nintendo", keywords: ["nintendo", "switch", "wii"], icon: "🎮" },
  { id: "epic", label: "Epic Games", keywords: ["epic", "fortnite"], icon: "🎮" },
  { id: "origin", label: "EA/Origin", keywords: ["origin", "ea", "electronic arts"], icon: "🎮" },
  { id: "ubisoft", label: "Ubisoft", keywords: ["ubisoft", "uplay"], icon: "🎮" },
  { id: "key", label: "Key Digital", keywords: ["key", "chave", "código", "code", "serial"], icon: "🔑" },
  { id: "account", label: "Conta", keywords: ["conta", "account", "login"], icon: "👤" },
  { id: "giftcard", label: "Gift Card", keywords: ["gift", "card", "presente", "crédito", "saldo"], icon: "🎁" },
];

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
  created_at?: string;
  sales_count?: number;
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
  created_at?: string;
  sales_count?: number;
  platform?: string;
}

interface Seller {
  id: string;
  full_name: string;
}

// Detect platform from product name/description
const detectPlatform = (name: string, description: string): string | undefined => {
  const text = `${name} ${description}`.toLowerCase();
  for (const platform of PLATFORMS) {
    if (platform.keywords.some(keyword => text.includes(keyword))) {
      return platform.id;
    }
  }
  return undefined;
};

export default function Products() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<CombinedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<CombinedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categories, setCategories] = useState<string[]>(["all"]);
  const [sortBy, setSortBy] = useState<SortOption>("popular");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedSeller, setSelectedSeller] = useState<string>("all");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [salesCounts, setSalesCounts] = useState<Record<string, number>>({});

  // Load all products from both sources
  const loadAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch sales counts for popularity
      const { data: salesData } = await supabase
        .from("seller_sales")
        .select("product_id")
        .eq("status", "approved");
      
      const salesMap: Record<string, number> = {};
      salesData?.forEach(sale => {
        salesMap[sale.product_id] = (salesMap[sale.product_id] || 0) + 1;
      });
      setSalesCounts(salesMap);

      // Fetch store products
      const storeData = await fetchProducts();
      const storeProducts: CombinedProduct[] = storeData.map((p) => ({
        ...p,
        source: "store" as const,
        platform: detectPlatform(p.name, p.description),
        created_at: new Date().toISOString(),
        sales_count: 0,
      }));

      // Fetch seller products with seller names
      const { data: sellerProductsData } = await supabase
        .from("seller_products")
        .select("id, name, description, price, category, image_url, stock, likes_count, seller_id, slug, created_at")
        .eq("is_active", true);

      let sellerProducts: CombinedProduct[] = [];

      if (sellerProductsData && sellerProductsData.length > 0) {
        // Get seller names
        const sellerIds = [...new Set(sellerProductsData.map((p) => p.seller_id))];
        const { data: sellersData } = await supabase
          .from("seller_profiles")
          .select("id, full_name")
          .in("id", sellerIds)
          .eq("is_approved", true)
          .eq("is_suspended", false);

        const sellerMap = new Map(sellersData?.map((s) => [s.id, s.full_name]) || []);
        setSellers(sellersData || []);

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
            created_at: p.created_at,
            sales_count: salesMap[p.id] || 0,
            platform: detectPlatform(p.name, p.description || ""),
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
    (search: string, category: string, sort: SortOption, prices: [number, number], source: SourceFilter, platform: string, seller: string) => {
      let filtered = allProducts;

      // Apply source filter
      if (source !== "all") {
        filtered = filtered.filter((p) => (source === "store" ? p.source === "store" : p.source === "seller"));
      }

      // Apply platform filter
      if (platform !== "all") {
        filtered = filtered.filter((p) => p.platform === platform);
      }

      // Apply seller filter
      if (seller !== "all") {
        filtered = filtered.filter((p) => p.seller_id === seller);
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
          case "popular":
            return b.stock - a.stock;
          case "likes":
            return (b.likes_count || 0) - (a.likes_count || 0);
          case "recent":
            return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
          case "sold":
            return (b.sales_count || 0) - (a.sales_count || 0);
          case "name":
          default:
            return a.name.localeCompare(b.name);
        }
      });

      setProducts(filtered);
    },
    [allProducts]
  );

  // Apply filters when any filter changes
  useEffect(() => {
    if (allProducts.length > 0) {
      filterProducts(searchQuery, selectedCategory, sortBy, priceRange, sourceFilter, selectedPlatform, selectedSeller);
    }
  }, [searchQuery, selectedCategory, sortBy, priceRange, sourceFilter, selectedPlatform, selectedSeller, allProducts, filterProducts]);

  // Initial load and handle URL search params + realtime updates
  useEffect(() => {
    const urlSearch = searchParams.get("search");
    const urlCategory = searchParams.get("category");
    const urlPlatform = searchParams.get("platform");
    
    if (urlSearch) setSearchQuery(urlSearch);
    if (urlCategory) setSelectedCategory(urlCategory);
    if (urlPlatform) setSelectedPlatform(urlPlatform);

    loadAllProducts();

    // Subscribe to realtime changes
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

  const activeFiltersCount = [
    selectedCategory !== "all",
    selectedPlatform !== "all",
    selectedSeller !== "all",
    priceRange[0] > 0 || priceRange[1] < maxPrice,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedPlatform("all");
    setSelectedSeller("all");
    setPriceRange([0, maxPrice]);
    setSourceFilter("all");
    setSortBy("popular");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEOHead
        title="Catálogo de Jogos"
        description="Explore nossa coleção completa de jogos digitais. Encontre os melhores preços em keys de jogos para PC, PlayStation, Xbox e mais."
      />
      <Header />
      <main className="flex-1 py-8 sm:py-12">
        <div className="container">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2 sm:mb-4">
              Todos os <span className="gradient-text">Produtos</span>
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Explore nosso catálogo completo de jogos e escolha o seu favorito
            </p>
          </div>

          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            {/* Source Filter Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg w-full sm:w-fit overflow-x-auto">
              <Button
                variant={sourceFilter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("all")}
                className="gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm"
              >
                Todos ({storeCount + sellerCount})
              </Button>
              <Button
                variant={sourceFilter === "store" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("store")}
                className="gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm"
              >
                <Store className="h-3 w-3 sm:h-4 sm:w-4" />
                Loja ({storeCount})
              </Button>
              <Button
                variant={sourceFilter === "sellers" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSourceFilter("sellers")}
                className="gap-1 sm:gap-2 whitespace-nowrap text-xs sm:text-sm"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                Vendedores ({sellerCount})
              </Button>
            </div>

            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
                {/* Sort Dropdown */}
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <ArrowUpDown className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Mais Populares
                      </div>
                    </SelectItem>
                    <SelectItem value="sold">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Mais Vendidos
                      </div>
                    </SelectItem>
                    <SelectItem value="likes">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4" />
                        Mais Curtidos
                      </div>
                    </SelectItem>
                    <SelectItem value="recent">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Mais Recentes
                      </div>
                    </SelectItem>
                    <SelectItem value="price-asc">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Menor Preço
                      </div>
                    </SelectItem>
                    <SelectItem value="price-desc">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Maior Preço
                      </div>
                    </SelectItem>
                    <SelectItem value="name">Nome A-Z</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filters Sheet */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="relative">
                      <SlidersHorizontal className="h-4 w-4" />
                      {activeFiltersCount > 0 && (
                        <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {activeFiltersCount}
                        </Badge>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filtros Avançados</SheetTitle>
                      <SheetDescription>Refine sua busca com os filtros abaixo</SheetDescription>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-180px)] mt-6">
                      <div className="space-y-6 pr-4">
                        {/* Price Range */}
                        <div className="space-y-4">
                          <Label className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Faixa de Preço
                          </Label>
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

                        {/* Platform Filter */}
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Gamepad2 className="h-4 w-4" />
                            Plataforma
                          </Label>
                          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todas as plataformas" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todas as plataformas</SelectItem>
                              {PLATFORMS.map((platform) => (
                                <SelectItem key={platform.id} value={platform.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{platform.icon}</span>
                                    {platform.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Seller Filter */}
                        {sellers.length > 0 && (
                          <div className="space-y-3">
                            <Label className="flex items-center gap-2">
                              <UserCircle className="h-4 w-4" />
                              Vendedor
                            </Label>
                            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                              <SelectTrigger>
                                <SelectValue placeholder="Todos os vendedores" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os vendedores</SelectItem>
                                {sellers.map((seller) => (
                                  <SelectItem key={seller.id} value={seller.id}>
                                    {seller.full_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Category Filter in Sheet */}
                        <div className="space-y-3">
                          <Label className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Categoria
                          </Label>
                          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                            <SelectTrigger>
                              <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category === "all" ? "Todas as categorias" : category}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Clear Filters Button */}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={clearAllFilters}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Limpar Todos os Filtros
                        </Button>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Platform Quick Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedPlatform === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPlatform("all")}
                className="whitespace-nowrap"
              >
                Todas Plataformas
              </Button>
              {PLATFORMS.slice(0, 6).map((platform) => (
                <Button
                  key={platform.id}
                  variant={selectedPlatform === platform.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPlatform(platform.id)}
                  className="whitespace-nowrap gap-1"
                >
                  <span>{platform.icon}</span>
                  {platform.label}
                </Button>
              ))}
            </div>

            {/* Active Filters Display */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                {selectedCategory !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedCategory}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                  </Badge>
                )}
                {selectedPlatform !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {PLATFORMS.find(p => p.id === selectedPlatform)?.label}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedPlatform("all")} />
                  </Badge>
                )}
                {selectedSeller !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    {sellers.find(s => s.id === selectedSeller)?.full_name}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedSeller("all")} />
                  </Badge>
                )}
                {(priceRange[0] > 0 || priceRange[1] < maxPrice) && (
                  <Badge variant="secondary" className="gap-1">
                    R$ {priceRange[0]} - R$ {priceRange[1]}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setPriceRange([0, maxPrice])} />
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-6 text-xs">
                  Limpar todos
                </Button>
              </div>
            )}

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category === "all" ? "Todas Categorias" : category}
                </Button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card-gaming h-64 sm:h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12 sm:py-16">
              <p className="text-muted-foreground text-base sm:text-lg mb-4">Nenhum produto encontrado</p>
              <Button variant="outline" onClick={clearAllFilters}>
                Limpar Filtros
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4">{products.length} produto(s) encontrado(s)</p>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
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
