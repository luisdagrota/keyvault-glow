import { ShoppingCart } from "lucide-react";
import { Button } from "./ui/button";
import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";

interface CartButtonProps {
  variant?: "default" | "icon" | "mobile";
}

export function CartButton({ variant = "icon" }: CartButtonProps) {
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const handleClick = () => {
    navigate("/cart");
  };

  if (variant === "mobile") {
    return (
      <Button
        variant="ghost"
        className="w-full justify-start h-12 text-base relative"
        onClick={handleClick}
      >
        <ShoppingCart className="h-5 w-5 mr-3" />
        Carrinho
        {totalItems > 0 && (
          <span className="ml-auto bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
            {totalItems}
          </span>
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative h-9 w-9"
      onClick={handleClick}
    >
      <ShoppingCart className="h-5 w-5" />
      {totalItems > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
          {totalItems > 9 ? "9+" : totalItems}
        </span>
      )}
    </Button>
  );
}
