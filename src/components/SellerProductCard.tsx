import { Button } from "./ui/button";
import { Package, Eye, User, Tag } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "./ui/badge";
import { LikeButton } from "./LikeButton";
import { AddToCartButton } from "./AddToCartButton";
import { ReportProductButton } from "./ReportProductButton";
import { useProductCoupons } from "@/hooks/useProductCoupons";
import { OnlineIndicator } from "./OnlineIndicator";
import { useSellerPresence } from "@/hooks/useSellerPresence";

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
  const { hasCoupons } = useProductCoupons(product.id, product.seller_id);
  const { isOnline } = useSellerPresence(product.seller_id);
  
  const productUrl = product.slug ? `/produto/${product.slug}` : `/seller-product/${product.id}`;

  return (
    <div className="group bg-card rounded-lg overflow-hidden border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1">
      <div
        className="cursor-pointer"
        onClick={() => navigate(productUrl)}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/30" />
            </div>
          )}

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

          {hasCoupons && !isOutOfStock && (
            <Badge className="absolute bottom-2 left-2 bg-green-600 text-white font-medium text-[10px] sm:text-xs px-1.5 py-0.5 flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Cupons disponíveis
            </Badge>
          )}

          <Badge variant="outline" className="absolute top-2 left-2 bg-background/80 text-[10px] sm:text-xs px-1.5 py-0.5">
            Vendedor
          </Badge>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div
          className="cursor-pointer"
          onClick={() => navigate(productUrl)}
        >
          <h3 className="font-semibold text-sm sm:text-base line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] group-hover:text-primary transition-colors leading-tight">
            {product.name}
          </h3>
        </div>

        <Link
          to={`/seller/${product.seller_id}`}
          className="mt-1 flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <OnlineIndicator isOnline={isOnline} size="sm" />
          <User className="h-3 w-3" />
          <span className="truncate">por {product.seller_name}</span>
        </Link>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg sm:text-xl font-bold text-primary">
            R$ {product.price.toFixed(2)}
          </span>

          <div className="flex items-center gap-0.5">
            <LikeButton
              productId={product.id}
              initialLikesCount={product.likes_count}
              size="sm"
            />
            <div className="hidden sm:block" onClick={(e) => e.stopPropagation()}>
              <ReportProductButton
                productId={product.id}
                sellerId={product.seller_id}
                productName={product.name}
                sellerName={product.seller_name}
                variant="icon"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-primary/10"
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
          <div className="mt-2 flex items-center gap-1.5 text-[10px] sm:text-xs text-success">
            <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>Em estoque</span>
          </div>
        )}
      </div>
    </div>
  );
}
