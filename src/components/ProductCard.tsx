import { Product } from "@/types/product";
import { Button } from "./ui/button";
import { Package, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="card-gaming group">
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                ESGOTADO
              </Badge>
            </div>
          )}
          
          {product.stock > 0 && product.stock < 5 && (
            <Badge className="absolute top-3 right-3 bg-warning text-warning-foreground font-semibold">
              Últimas {product.stock}!
            </Badge>
          )}
          
          <Badge variant="secondary" className="absolute top-3 left-3">
            {product.category}
          </Badge>
        </div>
      </Link>

      <div className="p-5 space-y-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[40px]">
            {product.description}
          </p>
        </Link>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div>
            <span className="text-2xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          
          <Link to={`/product/${product.id}`}>
            <Button
              size="sm"
              variant={isOutOfStock ? "outline" : "default"}
              disabled={isOutOfStock}
              className="gap-2"
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
          </Link>
        </div>

        {!isOutOfStock && (
          <div className="flex items-center gap-2 text-xs text-success">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Em estoque • Entrega imediata</span>
          </div>
        )}
      </div>
    </div>
  );
}
