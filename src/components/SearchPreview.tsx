import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Product } from "@/types/product";
import { fetchProducts } from "@/lib/googleSheets";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface SearchPreviewProps {
  searchTerm: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPreview({ searchTerm, isOpen, onClose }: SearchPreviewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();

    // Subscribe to realtime product changes
    const channel = supabase
      .channel('search-products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts([]);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = products
      .filter((product) => 
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term)
      )
      .slice(0, 5); // Limita a 5 resultados

    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  if (!isOpen || !searchTerm.trim()) return null;

  return (
    <>
      {/* Overlay transparente para fechar ao clicar fora */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Dropdown de preview */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="py-2">
            {filteredProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                onClick={onClose}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
              >
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">{product.category}</p>
                </div>
                <div className="text-sm font-bold text-primary">
                  R$ {product.price.toFixed(2)}
                </div>
              </Link>
            ))}
            <Link
              to={`/products?search=${encodeURIComponent(searchTerm)}`}
              onClick={onClose}
              className="block px-4 py-3 text-center text-sm text-primary hover:bg-accent transition-colors border-t border-border"
            >
              Ver todos os resultados para "{searchTerm}"
            </Link>
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado para "{searchTerm}"
          </div>
        )}
      </div>
    </>
  );
}
