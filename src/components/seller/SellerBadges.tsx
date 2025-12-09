import { Shield, Trophy, Award, Medal, Flame, Rocket, Calendar, Star, Sparkles, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Badge {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  gradient: string;
  glowColor: string;
}

export const SELLER_BADGES: Record<string, Badge> = {
  trusted: {
    id: "trusted",
    name: "Confiável",
    icon: Shield,
    description: "Média acima de 4.4 estrelas",
    gradient: "from-emerald-400 via-cyan-400 to-teal-400",
    glowColor: "rgba(52, 211, 153, 0.6)",
  },
  top1: {
    id: "top1",
    name: "Top 1 do Mês",
    icon: Crown,
    description: "Vendedor #1 do mês",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    glowColor: "rgba(251, 191, 36, 0.7)",
  },
  top2: {
    id: "top2",
    name: "Top 2 do Mês",
    icon: Trophy,
    description: "Vendedor #2 do mês",
    gradient: "from-slate-300 via-gray-200 to-slate-400",
    glowColor: "rgba(203, 213, 225, 0.6)",
  },
  top3: {
    id: "top3",
    name: "Top 3 do Mês",
    icon: Medal,
    description: "Vendedor #3 do mês",
    gradient: "from-amber-500 via-orange-500 to-amber-600",
    glowColor: "rgba(245, 158, 11, 0.6)",
  },
  oneYear: {
    id: "oneYear",
    name: "Um Ano de Vendas",
    icon: Calendar,
    description: "365 dias como vendedor",
    gradient: "from-violet-400 via-purple-500 to-fuchsia-500",
    glowColor: "rgba(167, 139, 250, 0.6)",
  },
  mostLiked: {
    id: "mostLiked",
    name: "Mais Curtido",
    icon: Flame,
    description: "Produtos com mais likes",
    gradient: "from-red-400 via-rose-500 to-pink-500",
    glowColor: "rgba(244, 63, 94, 0.6)",
  },
  fastGrowth: {
    id: "fastGrowth",
    name: "Crescimento Rápido",
    icon: Rocket,
    description: "Crescimento acima da média",
    gradient: "from-blue-400 via-indigo-500 to-violet-500",
    glowColor: "rgba(99, 102, 241, 0.6)",
  },
  hundredSales: {
    id: "hundredSales",
    name: "100 Vendas",
    icon: Star,
    description: "Alcançou 100 vendas",
    gradient: "from-green-400 via-emerald-500 to-teal-500",
    glowColor: "rgba(16, 185, 129, 0.6)",
  },
  fiveHundredSales: {
    id: "fiveHundredSales",
    name: "500 Vendas",
    icon: Sparkles,
    description: "Alcançou 500 vendas",
    gradient: "from-cyan-400 via-sky-500 to-blue-500",
    glowColor: "rgba(14, 165, 233, 0.6)",
  },
  superSeller: {
    id: "superSeller",
    name: "Super Vendedor",
    icon: Zap,
    description: "Mais de 1000 vendas",
    gradient: "from-amber-300 via-yellow-400 to-lime-400",
    glowColor: "rgba(234, 179, 8, 0.7)",
  },
};

interface SellerBadgesProps {
  badges: string[];
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animated?: boolean;
}

export const SellerBadges = ({ badges, size = "md", showLabel = false, animated = true }: SellerBadgesProps) => {
  const sizeClasses = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-12 w-12",
  };

  const innerSizeClasses = {
    sm: "h-5 w-5",
    md: "h-7 w-7",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-6 w-6",
  };

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badgeId) => {
        const badge = SELLER_BADGES[badgeId];
        if (!badge) return null;

        const Icon = badge.icon;

        return (
          <div
            key={badgeId}
            className={cn(
              "group relative flex items-center gap-2",
              showLabel && "bg-background/80 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/50"
            )}
            title={badge.description}
          >
            {/* Badge container */}
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full",
                sizeClasses[size]
              )}
            >
              {/* Animated glow effect */}
              {animated && (
                <>
                  <div
                    className={cn(
                      "absolute inset-0 rounded-full blur-md",
                      `bg-gradient-to-r ${badge.gradient}`
                    )}
                    style={{
                      animation: 'rgb-pulse 2s ease-in-out infinite',
                      boxShadow: `0 0 20px ${badge.glowColor}`,
                    }}
                  />
                  <div
                    className={cn(
                      "absolute inset-[-2px] rounded-full",
                      `bg-gradient-to-r ${badge.gradient}`
                    )}
                    style={{
                      animation: 'rgb-spin 3s linear infinite',
                    }}
                  />
                </>
              )}
              
              {/* Inner background */}
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full bg-background/90 backdrop-blur-sm z-10",
                  innerSizeClasses[size]
                )}
              >
                <Icon 
                  className={cn(
                    iconSizes[size],
                    animated && "drop-shadow-lg"
                  )}
                  style={{
                    filter: animated ? `drop-shadow(0 0 4px ${badge.glowColor})` : undefined
                  }}
                />
              </div>
            </div>

            {showLabel && (
              <span className="text-sm font-medium whitespace-nowrap">{badge.name}</span>
            )}
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border border-border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              <span className="font-semibold">{badge.name}</span>
              <br />
              <span className="text-muted-foreground">{badge.description}</span>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes rgb-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
        @keyframes rgb-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// Function to calculate badges for a seller
export const calculateSellerBadges = (
  seller: {
    average_rating: number;
    total_sales: number;
    created_at: string;
    likes_count?: number;
  },
  ranking?: number,
  isTopLiked?: boolean,
  isFastGrowth?: boolean
): string[] => {
  const badges: string[] = [];

  // Top rankings (priority order)
  if (ranking === 1) badges.push("top1");
  else if (ranking === 2) badges.push("top2");
  else if (ranking === 3) badges.push("top3");

  // Trusted badge - rating above 4.4
  if (seller.average_rating >= 4.4) {
    badges.push("trusted");
  }

  // Sales milestones
  if (seller.total_sales >= 1000) {
    badges.push("superSeller");
  } else if (seller.total_sales >= 500) {
    badges.push("fiveHundredSales");
  } else if (seller.total_sales >= 100) {
    badges.push("hundredSales");
  }

  // One year badge
  const createdAt = new Date(seller.created_at);
  const now = new Date();
  const daysSinceCreation = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation >= 365) {
    badges.push("oneYear");
  }

  // Most liked badge
  if (isTopLiked) {
    badges.push("mostLiked");
  }

  // Fast growth badge
  if (isFastGrowth) {
    badges.push("fastGrowth");
  }

  return badges;
};
