import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Loader2, Store, Tag, Sparkles, TrendingUp, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string | null;
  slug: string | null;
}

interface SearchSeller {
  id: string;
  full_name: string;
  average_rating: number;
  total_sales: number;
}

interface SearchResults {
  products: SearchProduct[];
  sellers: SearchSeller[];
  categories: string[];
  suggestions: string[];
  recommendations: SearchProduct[];
  correctedQuery: string | null;
}

export function SmartSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: searchQuery }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(() => {
      search(query);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleProductClick = (product: SearchProduct) => {
    const url = product.slug ? `/produto/${product.slug}` : `/seller-product/${product.id}`;
    navigate(url);
    setIsOpen(false);
    setQuery("");
  };

  const handleSellerClick = (seller: SearchSeller) => {
    navigate(`/seller/${seller.id}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleCategoryClick = (category: string) => {
    navigate(`/products?category=${encodeURIComponent(category)}`);
    setIsOpen(false);
    setQuery("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    search(suggestion);
  };

  const hasResults = results && (
    results.products.length > 0 ||
    results.sellers.length > 0 ||
    results.categories.length > 0 ||
    results.recommendations.length > 0
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar produtos, vendedores..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9 h-10 bg-muted/50 border-border focus:bg-background"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => { setQuery(""); setResults(null); }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2 || hasResults) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 max-h-[70vh] overflow-y-auto animate-fade-in">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="p-2">
              {/* Spelling Correction */}
              {results?.correctedQuery && (
                <div className="px-3 py-2 mb-2 bg-primary/10 rounded-lg text-sm">
                  <span className="text-muted-foreground">Mostrando resultados para: </span>
                  <span className="font-medium text-primary">{results.correctedQuery}</span>
                </div>
              )}

              {/* AI Suggestions */}
              {results?.suggestions && results.suggestions.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    Sugestões
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-3">
                    {results.suggestions.map((suggestion, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {results?.categories && results.categories.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Tag className="h-3 w-3" />
                    Categorias
                  </div>
                  <div className="flex flex-wrap gap-1.5 px-3">
                    {results.categories.map((category, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => handleCategoryClick(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {results?.products && results.products.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Search className="h-3 w-3" />
                    Produtos ({results.products.length})
                  </div>
                  <div className="space-y-1">
                    {results.products.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.category}</p>
                        </div>
                        <span className="text-sm font-bold text-primary whitespace-nowrap">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sellers */}
              {results?.sellers && results.sellers.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <Store className="h-3 w-3" />
                    Vendedores ({results.sellers.length})
                  </div>
                  <div className="space-y-1">
                    {results.sellers.map((seller) => (
                      <div
                        key={seller.id}
                        onClick={() => handleSellerClick(seller)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Store className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{seller.full_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                              {seller.average_rating.toFixed(1)}
                            </span>
                            <span>•</span>
                            <span>{seller.total_sales} vendas</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {results?.recommendations && results.recommendations.length > 0 && (
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    Recomendados
                  </div>
                  <div className="grid grid-cols-2 gap-2 px-3">
                    {results.recommendations.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted cursor-pointer transition-colors"
                      >
                        <img
                          src={product.image_url || "/placeholder.svg"}
                          alt={product.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{product.name}</p>
                          <p className="text-xs text-primary font-bold">R$ {product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!hasResults && query.length >= 2 && !loading && (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Nenhum resultado encontrado para "{query}"
                </div>
              )}

              {/* View All */}
              {hasResults && (
                <div className="border-t border-border mt-3 pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-sm text-primary"
                    onClick={() => {
                      navigate(`/products?search=${encodeURIComponent(query)}`);
                      setIsOpen(false);
                    }}
                  >
                    Ver todos os resultados
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
