import { Button } from "./ui/button";
import { Package, Eye, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { LikeButton } from "./LikeButton";
import { AddToCartButton } from "./AddToCartButton";

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
}

interface SellerProductCardProps {
  product: SellerProduct;
}

export function SellerProductCard({ product }: SellerProductCardProps) {
  const navigate = useNavigate();
  const isOutOfStock = product.stock === 0;
  
  // Use slug URL if available, fallback to ID
  const productUrl = product.slug ? `/produto/${product.slug}` : `/seller-product/${product.id}`;

  return (
    <div className="card-gaming group">
      <div
        className="cursor-pointer"
        onClick={() => navigate(productUrl)}
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
              <Package className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground/30" />
            </div>
          )}
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

          <Badge variant="outline" className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-background/80 text-xs">
            Vendedor
          </Badge>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div
          className="cursor-pointer"
          onClick={() => navigate(productUrl)}
        >
          <h3 className="font-bold text-base sm:text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1 sm:mt-2 min-h-[32px] sm:min-h-[40px]">
            {product.description || "Sem descrição"}
          </p>
        </div>

        <Link
          to={`/seller/${product.seller_id}`}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="h-3 w-3" />
          <span className="truncate">por {product.seller_name}</span>
        </Link>

        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div>
            <span className="text-xl sm:text-2xl font-bold text-primary">
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
              variant="ghost"
              className="h-8 w-8 sm:h-9 sm:w-9 p-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(productUrl);
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <AddToCartButton
              product={{
                id: product.id,
                name: product.name,
                description: product.description || "",
                price: product.price,
                imageUrl: product.image_url || "",
                stock: product.stock,
                source: "seller",
                sellerId: product.seller_id,
                sellerName: product.seller_name,
              }}
              size="sm"
              showText={false}
            />
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
