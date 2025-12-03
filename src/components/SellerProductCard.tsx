import { Button } from "./ui/button";
import { Package, ShoppingCart, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { LikeButton } from "./LikeButton";

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
}

interface SellerProductCardProps {
  product: SellerProduct;
}

export function SellerProductCard({ product }: SellerProductCardProps) {
  const navigate = useNavigate();
  const isOutOfStock = product.stock === 0;

  return (
    <div className="card-gaming group">
      <div
        className="cursor-pointer"
        onClick={() => navigate(`/seller-product/${product.id}`)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
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

          <Badge variant="outline" className="absolute top-3 left-3 bg-background/80">
            Vendedor
          </Badge>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div
          className="cursor-pointer"
          onClick={() => navigate(`/seller-product/${product.id}`)}
        >
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2 min-h-[40px]">
            {product.description || "Sem descrição"}
          </p>
        </div>

        <Link
          to={`/seller/${product.seller_id}`}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="h-3 w-3" />
          <span>por {product.seller_name}</span>
        </Link>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <LikeButton
              productId={product.id}
              initialLikesCount={product.likes_count}
              size="sm"
            />
            <Button
              size="sm"
              variant={isOutOfStock ? "outline" : "default"}
              disabled={isOutOfStock}
              className="gap-2"
              onClick={() => navigate(`/seller-product/${product.id}`)}
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
        </div>

        {!isOutOfStock && (
          <div className="flex items-center gap-2 text-xs text-success">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span>Em estoque</span>
          </div>
        )}
      </div>
    </div>
  );
}
