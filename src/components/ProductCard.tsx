import { Product } from "@/types/product";
import { Button } from "./ui/button";
import { Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { AddToCartButton } from "./AddToCartButton";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const isOutOfStock = product.stock === 0;

  return (
    <div className="group bg-card rounded-lg overflow-hidden border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
          />
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <Badge variant="destructive" className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-1.5">
                ESGOTADO
              </Badge>
            </div>
          )}
          
          {product.stock > 0 && product.stock < 5 && (
            <Badge className="absolute top-2 right-2 bg-warning text-warning-foreground font-medium text-[10px] sm:text-xs px-1.5 py-0.5">
              Últimas {product.stock}!
            </Badge>
          )}
          
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] sm:text-xs px-1.5 py-0.5">
            {product.category}
          </Badge>
        </div>
      </Link>

      <div className="p-3 sm:p-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-primary transition-colors leading-tight">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-bold text-primary">
            R$ {product.price.toFixed(2)}
          </span>
          
          <div className="flex items-center gap-1">
            <Link to={`/product/${product.id}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/10">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                description: product.description,
                price: product.price,
                imageUrl: product.imageUrl,
                stock: product.stock,
                source: "store",
              }}
              size="sm"
              showText={false}
            />
          </div>
        </div>

        {!isOutOfStock && (
          <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-success">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>Em estoque</span>
          </div>
        )}
      </div>
    </div>
  );
}
