import { Shield, Trophy, Award, Medal, Flame, Rocket, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Badge {
  id: string;
  name: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

export const SELLER_BADGES: Record<string, Badge> = {
  trusted: {
    id: "trusted",
    name: "Confiável",
    icon: Shield,
    description: "Média acima de 4.4 estrelas",
    color: "from-emerald-400 via-cyan-400 to-emerald-400",
  },
  top1: {
    id: "top1",
    name: "Top 1 do Mês",
    icon: Trophy,
    description: "Vendedor #1 do mês",
    color: "from-yellow-400 via-amber-300 to-yellow-400",
  },
  top2: {
    id: "top2",
    name: "Top 2 do Mês",
    icon: Award,
    description: "Vendedor #2 do mês",
    color: "from-gray-300 via-white to-gray-300",
  },
  top3: {
    id: "top3",
    name: "Top 3 do Mês",
    icon: Medal,
    description: "Vendedor #3 do mês",
    color: "from-amber-600 via-orange-400 to-amber-600",
  },
  oneYear: {
    id: "oneYear",
    name: "Um Ano de Vendas",
    icon: Calendar,
    description: "365 dias como vendedor",
    color: "from-purple-400 via-pink-400 to-purple-400",
  },
  mostLiked: {
    id: "mostLiked",
    name: "Mais Curtido",
    icon: Flame,
    description: "Produtos com mais likes",
    color: "from-red-400 via-orange-400 to-red-400",
  },
  fastGrowth: {
    id: "fastGrowth",
    name: "Crescimento Rápido",
    icon: Rocket,
    description: "Crescimento acima da média",
    color: "from-blue-400 via-indigo-400 to-blue-400",
  },
};

interface SellerBadgesProps {
  badges: string[];
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export const SellerBadges = ({ badges, size = "md", showLabel = false }: SellerBadgesProps) => {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
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
              showLabel && "bg-background/50 backdrop-blur-sm rounded-full px-3 py-1 border border-border/50"
            )}
            title={badge.description}
          >
            <div
              className={cn(
                "relative flex items-center justify-center rounded-full",
                sizeClasses[size],
                "animate-rgb-glow"
              )}
              style={{
                background: `linear-gradient(135deg, var(--tw-gradient-stops))`,
              }}
            >
              <div
                className={cn(
                  "absolute inset-0 rounded-full opacity-75 blur-sm animate-pulse",
                  `bg-gradient-to-r ${badge.color}`
                )}
              />
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-full bg-background/80",
                  size === "sm" ? "h-5 w-5" : size === "md" ? "h-7 w-7" : "h-9 w-9"
                )}
              >
                <Icon className={cn(iconSizes[size], "text-foreground")} />
              </div>
              <div
                className={cn(
                  "absolute inset-0 rounded-full",
                  `bg-gradient-to-r ${badge.color}`,
                  "animate-spin-slow opacity-50"
                )}
                style={{ animationDuration: "3s" }}
              />
            </div>
            {showLabel && (
              <span className="text-sm font-medium whitespace-nowrap">{badge.name}</span>
            )}
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {badge.description}
            </div>
          </div>
        );
      })}
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

  // Trusted badge - rating above 4.4
  if (seller.average_rating >= 4.4) {
    badges.push("trusted");
  }

  // Top rankings
  if (ranking === 1) badges.push("top1");
  if (ranking === 2) badges.push("top2");
  if (ranking === 3) badges.push("top3");

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
