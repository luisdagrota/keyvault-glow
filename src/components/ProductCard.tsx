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
    <div className="group relative bg-card rounded-xl overflow-hidden border border-border/50 shadow-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_50px_-12px_hsl(var(--primary)/0.25)] hover:border-primary/50">
      {/* Gradient glow effect on hover */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-primary/30 to-primary/50 rounded-xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500 -z-10" />
      
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted to-muted/50">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="object-cover w-full h-full transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center">
              <Badge variant="destructive" className="text-xs sm:text-sm px-3 py-1.5 animate-pulse">
                ESGOTADO
              </Badge>
            </div>
          )}
          
          {product.stock > 0 && product.stock < 5 && (
            <Badge className="absolute top-2 right-2 bg-gradient-to-r from-warning to-orange-500 text-warning-foreground font-medium text-[10px] sm:text-xs px-2 py-1 shadow-lg animate-pulse">
              🔥 Últimas {product.stock}!
            </Badge>
          )}
          
          <Badge variant="secondary" className="absolute top-2 left-2 text-[10px] sm:text-xs px-2 py-1 backdrop-blur-sm bg-background/70 border border-border/50">
            {product.category}
          </Badge>

          {/* Shine effect on hover */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
      </Link>

      <div className="p-3 sm:p-4 bg-gradient-to-b from-card to-card/95">
        <Link to={`/product/${product.id}`}>
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-primary transition-colors duration-300 leading-tight">
            {product.name}
          </h3>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              R$ {product.price.toFixed(2)}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Link to={`/product/${product.id}`}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-primary/20 hover:text-primary transition-all duration-300 hover:scale-110">
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
            <div className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))] animate-pulse" />
            <span className="font-medium">Em estoque</span>
          </div>
        )}
      </div>
    </div>
  );
}
