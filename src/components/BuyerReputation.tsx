import { Star, Award, Shield, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BuyerReputationProps {
  rating: number;
  totalPurchases: number;
  totalRatings: number;
  showBadge?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getBuyerLevel = (rating: number, totalPurchases: number) => {
  if (rating >= 4.8 && totalPurchases >= 5) {
    return {
      level: 'gold',
      label: 'Cliente Ouro',
      color: 'from-yellow-400 via-amber-300 to-yellow-500',
      bgColor: 'bg-gradient-to-r from-yellow-400/20 to-amber-300/20',
      borderColor: 'border-yellow-400/50',
      textColor: 'text-yellow-400',
      icon: Award
    };
  }
  if (rating >= 4.5 && totalPurchases >= 3) {
    return {
      level: 'silver',
      label: 'Cliente Prata',
      color: 'from-gray-300 via-slate-200 to-gray-400',
      bgColor: 'bg-gradient-to-r from-gray-300/20 to-slate-200/20',
      borderColor: 'border-gray-300/50',
      textColor: 'text-gray-300',
      icon: Shield
    };
  }
  if (rating >= 4.0 && totalPurchases >= 1) {
    return {
      level: 'bronze',
      label: 'Cliente Bronze',
      color: 'from-orange-400 via-amber-600 to-orange-500',
      bgColor: 'bg-gradient-to-r from-orange-400/20 to-amber-600/20',
      borderColor: 'border-orange-400/50',
      textColor: 'text-orange-400',
      icon: Star
    };
  }
  return {
    level: 'new',
    label: 'Novo Cliente',
    color: 'from-blue-400 via-cyan-300 to-blue-500',
    bgColor: 'bg-gradient-to-r from-blue-400/20 to-cyan-300/20',
    borderColor: 'border-blue-400/50',
    textColor: 'text-blue-400',
    icon: ShoppingBag
  };
};

export const BuyerReputation = ({ 
  rating, 
  totalPurchases, 
  totalRatings,
  showBadge = true,
  size = 'md',
  className = ''
}: BuyerReputationProps) => {
  const level = getBuyerLevel(rating, totalPurchases);
  const IconComponent = level.icon;
  
  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2',
    lg: 'text-base gap-2'
  };
  
  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20
  };

  return (
    <TooltipProvider>
      <div className={`flex items-center ${sizeClasses[size]} ${className}`}>
        {/* Rating Stars */}
        <div className="flex items-center gap-1">
          <Star className={`fill-yellow-400 text-yellow-400`} size={iconSizes[size]} />
          <span className="font-medium">{rating.toFixed(1)}</span>
        </div>
        
        {/* Purchase Count */}
        <span className="text-muted-foreground">
          ({totalPurchases} {totalPurchases === 1 ? 'compra' : 'compras'})
        </span>
        
        {/* Level Badge */}
        {showBadge && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge 
                className={`
                  ${level.bgColor} ${level.borderColor} ${level.textColor}
                  border animate-pulse cursor-help
                  ${level.level === 'gold' ? 'gold-glow' : ''}
                `}
              >
                <IconComponent size={iconSizes[size] - 2} className="mr-1" />
                {level.label}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-center">
                <p className="font-semibold">{level.label}</p>
                <p className="text-xs text-muted-foreground">
                  {totalRatings} {totalRatings === 1 ? 'avaliação recebida' : 'avaliações recebidas'}
                </p>
                {level.level === 'gold' && (
                  <p className="text-xs text-yellow-400 mt-1">
                    Cliente confiável e verificado!
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

// Compact version for lists
export const BuyerReputationCompact = ({ 
  rating, 
  totalPurchases 
}: { 
  rating: number; 
  totalPurchases: number;
}) => {
  const level = getBuyerLevel(rating, totalPurchases);
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
            ${level.bgColor} ${level.borderColor} ${level.textColor} border
            ${level.level === 'gold' ? 'gold-glow' : ''}
          `}>
            <Star className="fill-current" size={10} />
            <span>{rating.toFixed(1)}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{level.label} • {totalPurchases} compras</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export { getBuyerLevel };
