import { Product } from "@/types/product";
import { Button } from "./ui/button";
import { ShoppingCart, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;

  return (
    <Link to={`/product/${product.id}`}>
      <div className="card-gaming group cursor-pointer">
        <div className="relative aspect-video overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110"
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ESGOTADO</span>
            </div>
          )}
          {product.stock > 0 && product.stock < 5 && (
            <Badge className="absolute top-2 right-2 bg-warning text-black">
              Apenas {product.stock} restantes
            </Badge>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div>
            <Badge variant="secondary" className="mb-2">
              {product.category}
            </Badge>
            <h3 className="font-bold text-lg line-clamp-1">{product.name}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {product.description}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <span className="text-2xl font-bold text-primary">
                R$ {product.price.toFixed(2)}
              </span>
            </div>
            <Button
              size="sm"
              variant={isOutOfStock ? "outline" : "cta"}
              disabled={isOutOfStock}
              onClick={(e) => {
                e.preventDefault();
                if (onAddToCart && !isOutOfStock) {
                  onAddToCart(product);
                }
              }}
            >
              {isOutOfStock ? (
                <>
                  <Package className="h-4 w-4" />
                  Esgotado
                </>
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Comprar
                </>
              )}
            </Button>
          </div>

          {!isOutOfStock && (
            <div className="flex items-center gap-2 text-xs text-success">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span>Em estoque • Entrega imediata</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
