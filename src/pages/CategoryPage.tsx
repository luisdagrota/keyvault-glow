import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SellerProductCard } from "@/components/SellerProductCard";
import { SEOHead } from "@/components/SEOHead";
import { useCategoryBySlug, Subcategory } from "@/hooks/useCategories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ChevronRight, Home, SlidersHorizontal, ArrowUpDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  slug: string | null;
  subcategory_id: string | null;
}

type SortOption = "recent" | "price-asc" | "price-desc" | "popular" | "likes";

export default function CategoryPage() {
  const { categorySlug, subcategorySlug } = useParams();
  const { category, loading: categoryLoading } = useCategoryBySlug(categorySlug);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [currentSubcategory, setCurrentSubcategory] = useState<Subcategory | null>(null);

  useEffect(() => {
    if (subcategorySlug && category) {
      const sub = category.subcategories.find(s => s.slug === subcategorySlug);
      setCurrentSubcategory(sub || null);
      setSelectedSubcategory(sub?.id || null);
    } else {
      setCurrentSubcategory(null);
      setSelectedSubcategory(null);
    }
  }, [subcategorySlug, category]);

  const fetchProducts = useCallback(async () => {
    if (!category) return;
    
    setLoading(true);

    // Get subcategory IDs for this category
    const subcategoryIds = selectedSubcategory 
      ? [selectedSubcategory]
      : category.subcategories.map(s => s.id);

    if (subcategoryIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("seller_products")
      .select("id, name, description, price, category, image_url, stock, likes_count, seller_id, slug, subcategory_id")
      .eq("is_active", true)
      .in("subcategory_id", subcategoryIds);

    // Apply search filter
    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
    }

    // Apply sorting
    switch (sortBy) {
      case "price-asc":
        query = query.order("price", { ascending: true });
        break;
      case "price-desc":
        query = query.order("price", { ascending: false });
        break;
      case "popular":
        query = query.order("stock", { ascending: false });
        break;
      case "likes":
        query = query.order("likes_count", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    const { data: productsData, error } = await query;

    if (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setLoading(false);
      return;
    }

    // Get seller names
    const sellerIds = [...new Set(productsData?.map(p => p.seller_id) || [])];
    
    if (sellerIds.length > 0) {
      const { data: sellersData } = await supabase
        .from("seller_profiles")
        .select("id, full_name")
        .in("id", sellerIds)
        .eq("is_approved", true)
        .eq("is_suspended", false)
        .eq("is_on_vacation", false);

      const sellerMap = new Map(sellersData?.map(s => [s.id, s.full_name]) || []);

      const productsWithSellers = (productsData || [])
        .filter(p => sellerMap.has(p.seller_id))
        .map(p => ({
          ...p,
          seller_name: sellerMap.get(p.seller_id) || "Vendedor"
        }));

      setProducts(productsWithSellers);
    } else {
      setProducts([]);
    }

    setLoading(false);
  }, [category, selectedSubcategory, searchQuery, sortBy]);

  useEffect(() => {
    if (category) {
      fetchProducts();
    }
  }, [category, fetchProducts]);

  if (categoryLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </>
    );
  }

  if (!category) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Categoria não encontrada</h1>
            <p className="text-muted-foreground mb-4">A categoria que você procura não existe.</p>
            <Link to="/produtos">
              <Button>Ver todos os produtos</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const pageTitle = currentSubcategory 
    ? `${currentSubcategory.name} - ${category.name}` 
    : category.name;

  const pageDescription = currentSubcategory
    ? `Encontre os melhores produtos de ${currentSubcategory.name} na categoria ${category.name}. Compre com segurança na GameKeys Store.`
    : `Explore produtos de ${category.name}. Gift cards, jogos, contas e muito mais com entrega imediata.`;

  return (
    <>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
      />
      <Header />
      <main className="min-h-screen bg-background py-6 sm:py-8">
        <div className="container px-4">
          {/* Breadcrumbs */}
          <Breadcrumb className="mb-6">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center gap-1">
                    <Home className="h-3.5 w-3.5" />
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-3.5 w-3.5" />
              </BreadcrumbSeparator>
              {currentSubcategory ? (
                <>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/categoria/${category.slug}`}>
                        {category.icon} {category.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{currentSubcategory.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              ) : (
                <BreadcrumbItem>
                  <BreadcrumbPage className="flex items-center gap-1">
                    {category.icon} {category.name}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
              <span className="text-3xl">{category.icon}</span>
              {pageTitle}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {products.length} produtos encontrados
            </p>
          </div>

          {/* Subcategories */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge
              variant={!selectedSubcategory ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/80 transition-colors"
              onClick={() => {
                setSelectedSubcategory(null);
                window.history.pushState({}, '', `/categoria/${category.slug}`);
              }}
            >
              Todos
            </Badge>
            {category.subcategories.map((sub) => (
              <Badge
                key={sub.id}
                variant={selectedSubcategory === sub.id ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/80 transition-colors"
                onClick={() => {
                  setSelectedSubcategory(sub.id);
                  window.history.pushState({}, '', `/categoria/${category.slug}/${sub.slug}`);
                }}
              >
                {sub.name}
              </Badge>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar nesta categoria..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Mais Recentes</SelectItem>
                <SelectItem value="likes">Mais Curtidos</SelectItem>
                <SelectItem value="popular">Mais Populares</SelectItem>
                <SelectItem value="price-asc">Menor Preço</SelectItem>
                <SelectItem value="price-desc">Maior Preço</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhum produto encontrado nesta categoria.</p>
              <Link to="/produtos">
                <Button variant="outline">Ver todos os produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <SellerProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
