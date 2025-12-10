import { Product } from "@/types/product";
import { Button } from "./ui/button";
import { Package, ShoppingCart, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "./ui/badge";
import { AddToCartButton } from "./AddToCartButton";

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
              <Badge variant="destructive" className="text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2">
                ESGOTADO
              </Badge>
            </div>
          )}
          
          {product.stock > 0 && product.stock < 5 && (
            <Badge className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-warning text-warning-foreground font-semibold text-xs sm:text-sm">
              Últimas {product.stock}!
            </Badge>
          )}
          
          <Badge variant="secondary" className="absolute top-2 left-2 sm:top-3 sm:left-3 text-xs">
            {product.category}
          </Badge>
        </div>
      </Link>

      <div className="p-3 sm:p-5 space-y-2 sm:space-y-4">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-bold text-sm sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 sm:mt-2 min-h-[28px] sm:min-h-[40px] hidden sm:block">
            {product.description}
          </p>
        </Link>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div>
            <span className="text-base sm:text-2xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Link to={`/product/${product.id}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 sm:h-9 sm:w-9 p-0">
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
          <div className="hidden sm:flex items-center gap-2 text-xs text-success">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Em estoque • Entrega imediata</span>
          </div>
        )}
      </div>
    </div>
  );
}
