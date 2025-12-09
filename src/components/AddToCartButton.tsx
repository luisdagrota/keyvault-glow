import { ShoppingCart, Plus, Check } from "lucide-react";
import { Button } from "./ui/button";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useState, useEffect } from "react";

interface AddToCartButtonProps {
  product: Omit<CartItem, "quantity">;
  size?: "sm" | "default" | "lg";
  showText?: boolean;
  className?: string;
}

export function AddToCartButton({ 
  product, 
  size = "default",
  showText = true,
  className = ""
}: AddToCartButtonProps) {
  const { addItem, items, setIsOpen } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  
  const itemInCart = items.find((item) => item.id === product.id);
  const isMaxStock = itemInCart && itemInCart.quantity >= product.stock;
  const isOutOfStock = product.stock === 0;

  useEffect(() => {
    if (justAdded) {
      const timer = setTimeout(() => setJustAdded(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justAdded]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isOutOfStock || isMaxStock) return;
    
    addItem(product);
    setJustAdded(true);
  };

  if (isOutOfStock) {
    return (
      <Button
        size={size}
        variant="outline"
        disabled
        className={className}
      >
        Esgotado
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={justAdded ? "secondary" : "default"}
      onClick={handleClick}
      disabled={isMaxStock}
      className={`gap-2 transition-all ${className}`}
    >
      {justAdded ? (
        <>
          <Check className="h-4 w-4" />
          {showText && "Adicionado!"}
        </>
      ) : itemInCart ? (
        <>
          <Plus className="h-4 w-4" />
          {showText && `Mais (${itemInCart.quantity})`}
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" />
          {showText && "Adicionar"}
        </>
      )}
    </Button>
  );
}
